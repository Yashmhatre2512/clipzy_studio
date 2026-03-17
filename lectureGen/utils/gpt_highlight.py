import re
import logging
import numpy as np

logger = logging.getLogger(__name__)


# ── Timestamp snapping ────────────────────────────────────────────────────────

def _snap_to_segments(start_time: float, end_time: float, segments: list) -> tuple:
    """Snap timestamps to the nearest Whisper segment boundaries."""
    if not segments:
        return start_time, end_time

    candidates_start = [s for s in segments if s['start'] <= start_time + 8]
    if candidates_start:
        snapped_start = min(candidates_start, key=lambda s: abs(s['start'] - start_time))['start']
    else:
        snapped_start = segments[0]['start']

    candidates_end = [s for s in segments if s['end'] >= end_time - 8]
    if candidates_end:
        snapped_end = min(candidates_end, key=lambda s: abs(s['end'] - end_time))['end']
    else:
        snapped_end = segments[-1]['end']

    return snapped_start, snapped_end


# ── Topic / summary extraction (rule-based, no API) ──────────────────────────

_DEFINITION_PATTERNS = [
    r'(?:is defined as|definition of|is called|refers to|means that)[:\s]+(.{10,60})',
    r'(?:in summary|to summarize|in conclusion|key takeaway)[,:\s]+(.{10,80})',
    r'(?:the (?:main|key|primary|central|most important) (?:point|idea|concept|thing) (?:is|here is))[:\s]+(.{10,60})',
    r'(?:therefore|thus|hence|consequently)[,\s]+(.{10,60})',
]

_IMPORTANCE_WORDS = {
    'important', 'key', 'remember', 'define', 'definition', 'therefore',
    'summary', 'critical', 'essential', 'main', 'primary', 'fundamental',
    'crucial', 'must', 'significant', 'central', 'core', 'principal',
}


def _extract_topic(text: str) -> str:
    text_lower = text.lower()
    for pattern in _DEFINITION_PATTERNS:
        m = re.search(pattern, text_lower)
        if m:
            words = m.group(1).strip().split()[:7]
            return ' '.join(words).capitalize()
    sentences = [s.strip() for s in re.split(r'[.!?]', text) if len(s.strip()) > 15]
    for sent in sentences:
        if any(w in sent.lower() for w in _IMPORTANCE_WORDS):
            return ' '.join(sent.split()[:8]).capitalize() + '...'
    return ' '.join(text.split()[:8]).capitalize() + '...'


def _extract_summary(text: str) -> str:
    sentences = [s.strip() for s in re.split(r'[.!?]', text) if len(s.strip()) > 20]
    if not sentences:
        return (text[:150] + '...') if len(text) > 150 else text
    best = max(sentences, key=lambda s: sum(1 for w in _IMPORTANCE_WORDS if w in s.lower()))
    return (best[:150] + '...') if len(best) > 150 else best


# ══════════════════════════════════════════════════════════════════════════════
#  GRAPH + PAGERANK + MMR  (primary local selection — no API, no pre-trained model)
# ══════════════════════════════════════════════════════════════════════════════

def _keyword_jaccard(text_i: str, text_j: str, kw_lists: list) -> float:
    """
    Jaccard similarity of the keyword sets found in two chunks.
    Measures how much the same importance signals appear in both.
    """
    def get_kw(text):
        t = text.lower()
        return {kw for kws in kw_lists for kw in kws if kw in t}

    a, b = get_kw(text_i), get_kw(text_j)
    if not a and not b:
        return 0.0
    return len(a & b) / len(a | b)


def _position_proximity(i: int, j: int, n: int) -> float:
    """
    Chunks that are closer together in the lecture are more structurally
    related — normalised to [0, 1].
    """
    return 1.0 - abs(i - j) / max(1, n - 1)


def _qa_link(chunk_i: dict, chunk_j: dict, i: int, j: int) -> float:
    """
    Directional signal: returns 1.0 if chunk_i poses a question that
    chunk_j answers (only checked for consecutive chunks j == i+1).
    Captures the teach-by-question pattern common in lectures.
    """
    if j != i + 1:
        return 0.0
    q_words   = {'what', 'why', 'how', 'when', 'where', 'which', 'who'}
    ans_leads = ['the answer', 'because', 'therefore', 'this means',
                 'it is', 'we can', 'so ', 'thus', 'hence']
    has_q = '?' in chunk_i['text'] or any(
        w in chunk_i['text'].lower().split() for w in q_words
    )
    has_a = any(p in chunk_j['text'].lower() for p in ans_leads)
    return 1.0 if has_q and has_a else 0.0


def _build_graph(chunks: list, kw_lists: list) -> tuple:
    """
    Build a weighted adjacency matrix combining 4 signals:

      40%  TF-IDF cosine similarity  — lexical relatedness between chunks
      25%  Keyword Jaccard overlap   — shared importance signals
      20%  Position proximity        — structural closeness in the lecture
      15%  Q&A directional link      — question posed → answer given pattern

    Returns (graph, tfidf_sim_matrix) — tfidf_sim reused in MMR step.
    """
    n     = len(chunks)
    texts = [c['text'] for c in chunks]

    # ── TF-IDF cosine similarity ──────────────────────────────────────────
    tfidf_sim = np.zeros((n, n))
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        vec       = TfidfVectorizer(stop_words='english', ngram_range=(1, 2), sublinear_tf=True)
        mat       = vec.fit_transform(texts)
        tfidf_sim = cosine_similarity(mat).astype(float)
    except Exception as e:
        logger.warning(f"TF-IDF graph signal failed: {e}")

    # ── Keyword Jaccard ───────────────────────────────────────────────────
    kw_sim = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            if i != j:
                kw_sim[i][j] = _keyword_jaccard(texts[i], texts[j], kw_lists)

    # ── Position proximity ────────────────────────────────────────────────
    pos_sim = np.array([
        [_position_proximity(i, j, n) for j in range(n)]
        for i in range(n)
    ], dtype=float)

    # ── Q&A directional link (symmetrised) ───────────────────────────────
    qa_sim = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            v = _qa_link(chunks[i], chunks[j], i, j)
            qa_sim[i][j] = v
            qa_sim[j][i] = v   # make symmetric

    # ── Combine into single graph ─────────────────────────────────────────
    graph = (
        0.40 * tfidf_sim +
        0.25 * kw_sim    +
        0.20 * pos_sim   +
        0.15 * qa_sim
    )
    np.fill_diagonal(graph, 0.0)   # no self-loops
    return graph, tfidf_sim


def _pagerank(graph: np.ndarray, damping: float = 0.85,
              max_iter: int = 100, tol: float = 1e-6) -> np.ndarray:
    """
    Weighted PageRank on the chunk similarity graph.

    Transition matrix T[i][j] = graph[i][j] / sum(graph[i])
    Score update: score = (1-d)/n  +  d × Tᵀ × score
    Iterates until L1 change < tol or max_iter reached.

    A chunk scores high if many other high-scoring chunks point to it —
    i.e. it is central to the lecture's topic network.
    """
    n        = len(graph)
    row_sums = graph.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1.0          # isolated nodes: uniform out-weight
    transition = graph / row_sums          # row-normalised transition matrix

    scores = np.ones(n) / n                # uniform initialisation

    for iteration in range(max_iter):
        new_scores = (1 - damping) / n + damping * (transition.T @ scores)
        delta      = np.abs(new_scores - scores).sum()
        scores     = new_scores
        if delta < tol:
            logger.info(f"PageRank converged in {iteration + 1} iterations")
            break

    return scores


def _mmr_select(combined_scores: np.ndarray, tfidf_sim: np.ndarray,
                num: int, lam: float = 0.65) -> list:
    """
    Maximal Marginal Relevance — greedy diversity-aware selection.

    Each step picks the chunk i that maximises:
        λ × combined_score[i]  −  (1−λ) × max_{j ∈ selected} tfidf_sim[i][j]

    λ = 0.65: slightly more weight on relevance than diversity.
    Increase λ → more relevant but potentially redundant highlights.
    Decrease λ → more spread but possibly less important highlights.
    """
    n         = len(combined_scores)
    remaining = list(range(n))
    selected  = []

    while len(selected) < num and remaining:
        if not selected:
            # First pick: purely the highest combined score
            best = max(remaining, key=lambda i: combined_scores[i])
        else:
            best = max(
                remaining,
                key=lambda i: (
                    lam * combined_scores[i]
                    - (1 - lam) * max(tfidf_sim[i][j] for j in selected)
                )
            )
        selected.append(best)
        remaining.remove(best)

    return selected


def _graph_mmr_selection(chunks: list, num_highlights: int,
                         min_dur: int, max_dur: int,
                         segments: list) -> list:
    """
    Full on-device selection pipeline:

      1. Build multi-signal graph   (TF-IDF + keyword Jaccard + position + Q&A)
      2. PageRank                   (graph-level centrality score)
      3. Combine with Step 3 score  (55% PageRank + 45% individual signals)
      4. MMR                        (diversity-aware greedy selection)
      5. Snap to Whisper boundaries (complete sentence clips)
    """
    if not chunks:
        return []

    n = len(chunks)

    # Load keyword lists from chunk_and_filter for the Jaccard signal
    try:
        from utils.chunk_and_filter import KEYWORDS
        kw_lists = list(KEYWORDS.values())
    except Exception:
        kw_lists = []

    # ── 1. Graph ──────────────────────────────────────────────────────────
    logger.info("Building multi-signal graph...")
    graph, tfidf_sim = _build_graph(chunks, kw_lists)

    # ── 2. PageRank ───────────────────────────────────────────────────────
    logger.info("Running PageRank...")
    pr_scores = _pagerank(graph)

    # ── 3. Combine PageRank + Step 3 scores ───────────────────────────────
    step3_scores = np.array([c.get('score', 0.0) for c in chunks])

    def _norm(arr):
        rng = arr.max() - arr.min()
        return (arr - arr.min()) / rng if rng > 1e-9 else np.full(len(arr), 0.5)

    combined = 0.55 * _norm(pr_scores) + 0.45 * _norm(step3_scores)

    # ── 4. MMR ────────────────────────────────────────────────────────────
    logger.info("Applying MMR...")
    selected_idx = _mmr_select(combined, tfidf_sim, num_highlights)

    # Present clips in chronological order
    selected_idx.sort(key=lambda i: chunks[i]['start'])

    # ── 5. Build output with snapped timestamps ───────────────────────────
    desired    = (min_dur + max_dur) / 2.0
    used_times = []
    highlights = []

    for idx in selected_idx:
        chunk = chunks[idx]
        s, e  = _snap_to_segments(
            chunk['start'],
            min(chunk['end'], chunk['start'] + desired),
            segments,
        )
        if e - s < min_dur:
            e = s + min_dur
        if e - s > max_dur + 10:
            e = s + max_dur

        # Skip if this clip overlaps an already-selected one
        if any(not (e <= us or s >= ue) for us, ue in used_times):
            continue

        used_times.append((s, e))
        highlights.append({
            'topic':      _extract_topic(chunk['text']),
            'summary':    _extract_summary(chunk['text']),
            'start_time': s,
            'end_time':   e,
        })

    return highlights


# ── Zone-based fallback (last resort) ────────────────────────────────────────

def _fallback_selection(chunks: list, num_highlights: int,
                        min_dur: int, max_dur: int, segments: list) -> list:
    if not chunks:
        return []
    desired   = (min_dur + max_dur) / 2.0
    by_time   = sorted(chunks, key=lambda x: x['start'])
    zone_size = max(1, len(by_time) // max(1, num_highlights))
    highlights, used_times = [], []

    def _add(chunk):
        s, e = _snap_to_segments(chunk['start'], min(chunk['end'], chunk['start'] + desired), segments)
        if e - s < min_dur:
            e = s + min_dur
        if any(not (e <= us or s >= ue) for us, ue in used_times):
            return False
        used_times.append((s, e))
        highlights.append({
            'topic':      _extract_topic(chunk['text']),
            'summary':    _extract_summary(chunk['text']),
            'start_time': s,
            'end_time':   e,
        })
        return True

    for zone_i in range(num_highlights):
        start_idx = zone_i * zone_size
        end_idx   = min(start_idx + zone_size, len(by_time))
        if start_idx >= len(by_time):
            break
        zone = sorted(by_time[start_idx:end_idx], key=lambda x: x.get('score', 0), reverse=True)
        for candidate in zone:
            if _add(candidate):
                break

    if len(highlights) < num_highlights:
        for chunk in sorted(chunks, key=lambda x: x.get('score', 0), reverse=True):
            if len(highlights) >= num_highlights:
                break
            _add(chunk)

    return highlights


# ── Main entry point ──────────────────────────────────────────────────────────

def find_highlights(chunks: list, num_highlights: int = 3,
                    min_dur: int = 20, max_dur: int = 30,
                    segments: list = None) -> list:
    """
    Selection priority:
      1. Graph + PageRank + MMR  — on-device, no API, no pre-trained model
      2. Zone-based              — absolute last resort
    """
    segments = segments or []

    # ── 1. Graph + PageRank + MMR ─────────────────────────────────────────
    logger.info("Using on-device Graph + PageRank + MMR selection")
    result = _graph_mmr_selection(chunks, num_highlights, min_dur, max_dur, segments)
    if result:
        return result

    # ── 2. Zone-based (absolute last resort) ─────────────────────────────
    logger.info("Using zone-based fallback selection")
    return _fallback_selection(chunks, num_highlights, min_dur, max_dur, segments)
