import re
import numpy as np
import logging

logger = logging.getLogger(__name__)

# ── Keyword categories ─────────────────────────────────────────────────────────
KEYWORDS = {
    3.0: [  # Critical signals
        "most important", "key concept", "key idea", "main point", "central point",
        "crucial", "critical", "fundamental", "essential", "must know", "must understand",
        "remember this", "don't forget", "pay attention", "take note",
        "in summary", "to summarize", "in conclusion", "key takeaway", "main takeaway",
        "the answer is", "the solution is", "this is why", "that is why",
        "definition", "defined as", "is called", "refers to", "means that",
        "theorem", "formula", "principle", "law of", "rule of",
        "exam", "test", "quiz", "assignment", "will be tested",
        "core idea", "the insight is", "the point is", "what matters is",
        "the goal is", "the objective is", "we conclude that", "it follows that",
        "key result", "main result", "important result", "proof of",
    ],
    2.0: [  # Important signals
        "important", "significant", "notable", "relevant", "major",
        "note that", "notice that", "observe that", "highlight", "key",
        "main idea", "core concept", "big idea", "central idea",
        "in other words", "that is", "namely", "specifically", "to be precise",
        "therefore", "thus", "hence", "consequently", "as a result", "which means",
        "first", "second", "third", "fourth", "finally", "lastly",
        "step one", "step two", "step three", "next step",
        "the reason is", "because of this", "this causes", "this leads to",
        "we can see that", "this shows", "this implies", "this means",
        "building on", "as we saw", "recall that", "as established",
        "distinction", "difference between", "contrast with", "unlike",
        "special case", "general case", "edge case", "base case",
        "the trick is", "the intuition is", "intuitively",
    ],
    1.0: [  # Mild signals
        "for example", "for instance", "such as", "like when", "consider",
        "recall", "remember that", "understand", "realize", "recognize",
        "interesting", "fascinating", "surprising", "worth noting",
        "in practice", "in real life", "in the real world", "application",
        "common mistake", "common error", "pitfall", "caveat",
        "roughly speaking", "informally", "loosely", "technically speaking",
    ],
}

# ── Discourse structure patterns (structural, not content-based) ───────────────
DISCOURSE_PATTERNS = [
    # Definitional structures
    (r'\b\w+\s+(?:is|are|was|were)\s+(?:defined|described|characterized)\s+(?:as|by)\b', 4.0),
    (r'\bby\s+(?:definition|convention|assumption)\b',                                   3.5),
    (r'\bwe\s+(?:define|call|say|denote|refer\s+to)\b',                                  3.0),
    (r'\b(defined as|definition of|is called|refers to|means that)\b',                   3.0),
    (r'\bformally[,\s]',                                                                  2.5),

    # Enumeration / procedure
    (r'\b(first(?:ly)?|second(?:ly)?|third(?:ly)?|fourth(?:ly)?|finally|lastly)\b',      2.0),
    (r'\b(step \d+|phase \d+|stage \d+|part \d+)\b',                                     1.5),
    (r'\b(the\s+(?:first|second|third|next|final)\s+(?:step|part|stage|case))\b',        2.0),

    # Summary / conclusion
    (r'\b(in summary|to summarize|in conclusion|key takeaway|in short|to recap)\b',      3.5),
    (r'\bto\s+(?:sum\s+up|wrap\s+up|review|conclude)\b',                                 3.0),
    (r'\bthe\s+(?:main|key|core|central)\s+(?:point|idea|message|insight|lesson)\b',     3.0),

    # Causal chains
    (r'\bthis\s+(?:means|implies|suggests|shows|proves|demonstrates|explains)\b',        2.5),
    (r'\bthe\s+(?:reason|cause|effect|result|consequence)\s+(?:is|of|for)\b',            2.5),
    (r'\b(because|therefore|thus|hence|consequently|as a result|which is why)\b',        1.5),
    (r'\bleads?\s+to\b',                                                                  1.5),

    # Contrast / correction
    (r'\bdon\'?t\s+confuse\b',                                                            3.0),
    (r'\b(?:common\s+)?misconception\b',                                                  3.0),
    (r'\bnot\s+to\s+be\s+confused\b',                                                    2.5),
    (r'\b(?:however|whereas|on\s+the\s+other\s+hand|in\s+contrast|unlike)\b',            1.5),
    (r'\bthe\s+difference\s+between\b',                                                   2.5),
    (r'\bimportant\s+distinction\b',                                                      2.5),
    (r'\bactually[,\s].*\bis\b',                                                          2.0),

    # Emphasis / repetition
    (r'\blet\s+me\s+(?:say|repeat|emphasize|stress|reiterate|highlight)\b',              3.0),
    (r'\b(always|never|must|should)\b',                                                   2.0),
    (r'\bit\s+is\s+(?:important|essential|critical|crucial)\s+to\b',                     2.5),

    # Bridging (links prior knowledge to new content)
    (r'\b(?:recall|remember|as\s+(?:we|you)\s+(?:saw|learned|discussed|mentioned))\b',  2.0),
    (r'\bbuilding\s+on\b',                                                                2.0),
    (r'\bthis\s+(?:connects|relates|ties)\s+(?:to|back)\b',                              2.0),
    (r'\bnow\s+that\s+we\b',                                                              1.5),

    # Mathematical / scientific content
    (r'\b(formula|equation|theorem|law|rule|principle|proof|derivation)\b',              2.5),
    (r'\b\d+(\.\d+)?\s*%\b',                                                              1.5),   # percentages
    (r'\b[A-Z]\s*[=<>≤≥]\s*[A-Z0-9]',                                                    2.0),   # variable assignment / inequalities
    (r'\b(?:equals?|greater\s+than|less\s+than|proportional\s+to)\b',                    1.5),

    # Definitional/referential
    (r'\b(the\s+main|the\s+key|the\s+primary|the\s+central|the\s+most)\b',               2.0),
    (r'\b(this\s+is|that\s+is|which\s+is|what\s+is)\s+\w+\b',                            1.5),
    (r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}',                                              1.0),   # named concept
]

# ── Filler words that penalise clarity ────────────────────────────────────────
FILLER_WORDS = {
    'um', 'uh', 'er', 'hmm', 'basically', 'literally', 'actually',
    'you know', 'i mean', 'sort of', 'kind of', 'right', 'okay so',
    'like', 'anyway', 'so yeah', 'alright', 'stuff', 'things',
}

# ── Common stop-words used in technical density calculation ───────────────────
_STOP = {
    'the','a','an','is','are','was','were','this','that','it','we','you',
    'they','he','she','of','in','on','at','to','for','and','or','but','so',
    'with','by','from','as','if','then','when','where','how','what','which',
    'who','do','does','did','have','has','had','will','would','can','could',
    'may','might','should','must','be','been','being','get','got','go',
    'comes','come','just','very','also','about','there','here','some',
    'all','each','one','two','three','four','five','more','less','than',
    'not','no','nor','neither','either','both','such','own','same','other',
}


# ── Chunking ──────────────────────────────────────────────────────────────────

def chunk_transcript(segments: list, window_sec: float = 30.0) -> list:
    """Group transcript segments into fixed-size time windows."""
    if not segments:
        return []

    chunks = []
    current    = {"text": "", "start": segments[0]["start"], "end": 0.0}
    chunk_start = segments[0]["start"]

    for seg in segments:
        if seg["start"] - chunk_start >= window_sec and current["text"].strip():
            current["end"] = seg["start"]
            chunks.append(current)
            current     = {"text": "", "start": seg["start"], "end": seg["end"]}
            chunk_start = seg["start"]
        current["text"] += " " + seg["text"]
        current["end"]   = seg["end"]

    if current["text"].strip():
        chunks.append(current)

    return chunks


# ── Signal functions ──────────────────────────────────────────────────────────

def _keyword_score(text: str) -> float:
    text_lower = text.lower()
    score = 0.0
    for weight, keywords in KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                score += weight
    return score


def _discourse_score(text: str) -> float:
    """Score based on structural discourse markers and rhetorical patterns."""
    text_lower = text.lower()
    score = 0.0
    for pattern, weight in DISCOURSE_PATTERNS:
        matches = len(re.findall(pattern, text_lower, re.IGNORECASE))
        score  += weight * min(matches, 3)   # cap repeats to avoid runaway scores
    return score


def _qa_score(text: str) -> float:
    """
    Detect rhetorical question-answer patterns — high educational value.
    Lectures that pose a question and immediately answer it are key moments.
    """
    sentences = [s.strip() for s in re.split(r'[.!?]', text) if s.strip()]
    score = 0.0

    # Raw question count
    q_count = sum(1 for s in sentences if '?' in s or
                  re.search(r'\b(what|why|how|when|where|which|who)\b', s.lower()))
    score += q_count * 1.5

    # Explicit Q&A lead-ins
    qa_leads = [
        r'\bwhat\s+(?:is|are|does|do)\b.*\?',
        r'\bhow\s+(?:does|do|can|should)\b.*\?',
        r'\bwhy\s+(?:is|are|does|do)\b.*\?',
        r'\bthe\s+(?:question|problem)\s+(?:is|now|then)\b',
        r'\bask\s+(?:yourself|the\s+question)\b',
        r'\bwhat\s+(?:happens|if)\b',
    ]
    for pat in qa_leads:
        if re.search(pat, text.lower()):
            score += 2.0

    # Answer lead-ins immediately after a question sentence
    answer_leads = [
        r'\bthe\s+(?:answer|solution|key)\s+(?:is|lies|here)\b',
        r'\bwe\s+(?:can|see|find|get|show)\b',
        r'\bit\s+turns\s+out\b',
        r'\bso\s+(?:the|we|this)\b',
    ]
    for pat in answer_leads:
        if re.search(pat, text.lower()):
            score += 1.5

    return score


def _lexical_diversity_score(text: str) -> float:
    """
    Type-Token Ratio (TTR): ratio of unique words to total words.
    High TTR = informational, content-rich text.
    Low TTR = repetitive filler or padding.
    """
    words = re.findall(r'\b[a-z]+\b', text.lower())
    if len(words) < 5:
        return 0.5
    return len(set(words)) / len(words)


def _technical_density_score(text: str) -> float:
    """
    Density of technical vocabulary: long non-stop words, acronyms, and
    domain-specific terms. Higher density → more likely a content-rich segment.
    """
    words = text.split()
    if not words:
        return 0.0

    count = 0
    for w in words:
        clean = re.sub(r'[^a-zA-Z]', '', w)
        if not clean:
            continue
        # Long non-stop words (6+ chars) — technical vocabulary
        if len(clean) >= 6 and clean.lower() not in _STOP:
            count += 1
        # Acronyms (ALL CAPS, 2+ chars)
        if re.match(r'^[A-Z]{2,}$', clean):
            count += 2   # extra weight for acronyms
        # CamelCase (ClassName, methodName) — programming / science terms
        if re.match(r'^[A-Z][a-z]+[A-Z]', clean):
            count += 1

    return count / len(words)


def _position_score(i: int, total: int) -> float:
    """
    Multi-section Gaussian model of lecture importance by position.
    Peaks at:
      - Intro   (pos≈0.00): definitions, roadmap
      - Conclusion (pos≈1.00): summary, wrap-up
    Smaller bumps at section transitions (0.25, 0.50, 0.75).
    Baseline: 0.3 everywhere.
    """
    if total <= 1:
        return 1.0
    pos = i / (total - 1)

    def gauss(center, sigma, height):
        return height * np.exp(-((pos - center) ** 2) / (2 * sigma ** 2))

    intro       = gauss(0.00, 0.06, 0.9)
    conclusion  = gauss(1.00, 0.07, 1.0)
    transitions = sum(gauss(t, 0.04, 0.35) for t in [0.25, 0.50, 0.75])

    return 0.3 + intro + conclusion + transitions


def _sentence_clarity_score(text: str) -> float:
    """
    Composite clarity score:
      - Sentence length (ideal 10–20 words)
      - Punctuation richness (varied punctuation = structured explanation)
      - Filler word penalty (um, uh, like, basically...)
    """
    sentences = [s.strip() for s in re.split(r'[.!?]', text) if s.strip()]
    if not sentences:
        return 0.0

    # Sentence length score
    avg_len      = np.mean([len(s.split()) for s in sentences])
    length_score = max(0.0, 1.0 - abs(avg_len - 15) / 20.0)

    # Punctuation richness — commas, colons, semicolons, parentheses signal structure
    punct_types  = len(set(re.findall(r'[,;:()\-—–]', text)))
    punct_score  = min(1.0, punct_types / 5.0)

    # Filler word penalty
    words_lower  = text.lower().split()
    filler_count = sum(1 for w in words_lower if w in FILLER_WORDS)
    filler_ratio = filler_count / max(1, len(words_lower))
    filler_penalty = min(1.0, filler_ratio * 10)

    return max(0.0, 0.45 * length_score + 0.35 * punct_score - 0.20 * filler_penalty)


# ── Main scoring pipeline ─────────────────────────────────────────────────────

def score_and_filter(chunks: list, top_percent: float = 0.4) -> list:
    """
    9-signal scoring pipeline:

      TF-IDF (trigrams, sublinear)          12%  — lexical uniqueness
      Multi-query embedding similarity       25%  — semantic match to 4 query types
      Keyword detection                      18%  — content importance signals
      Discourse structure patterns           15%  — rhetorical / structural markers
      Position scoring (Gaussian model)       8%  — intro / conclusion / transitions
      Lexical diversity (TTR)                 8%  — content density vs repetition
      Technical term density                  6%  — domain vocabulary richness
      Sentence clarity                        5%  — structure, filler, punctuation
      Q&A pattern detection                   3%  — question-answer teaching moments

    Keeps top_percent of chunks by combined score.
    """
    if not chunks:
        return []

    n     = len(chunks)
    texts = [c["text"] for c in chunks]

    tfidf_scores     = np.zeros(n)
    embedding_scores = np.zeros(n)

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        # Trigrams + sublinear TF for richer lexical representation
        vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 3),
            max_features=3000,
            sublinear_tf=True,
            min_df=1,
        )
        matrix       = vectorizer.fit_transform(texts)
        tfidf_scores = np.array(matrix.sum(axis=1)).flatten()

        # ── Multi-query embedding similarity ──────────────────────────────────
        # Four specialised query vectors, each targeting a different type of
        # important lecture content. Final score is a weighted blend.
        query_groups = {
            "definition": (
                "definition defined as refers to means that is called theorem formula "
                "principle law rule proof derivation mathematical equation",
                0.35
            ),
            "summary": (
                "in summary to summarize in conclusion key takeaway therefore thus hence "
                "consequently as a result the main point the core idea wrap up",
                0.30
            ),
            "importance": (
                "important critical crucial essential fundamental key concept main point "
                "must know must understand remember this central idea don't forget",
                0.25
            ),
            "example": (
                "for example for instance such as application demonstrates illustrates "
                "in practice real world consider the following case",
                0.10
            ),
        }

        weighted_sim = np.zeros(n)
        for _, (query_text, weight) in query_groups.items():
            try:
                q_vec    = vectorizer.transform([query_text])
                sim      = cosine_similarity(matrix, q_vec).flatten()
                weighted_sim += weight * sim
            except Exception:
                pass

        embedding_scores = weighted_sim

    except Exception as e:
        logger.warning(f"TF-IDF/embedding failed: {e}")

    keyword_scores   = np.array([_keyword_score(c["text"])          for c in chunks])
    discourse_scores = np.array([_discourse_score(c["text"])         for c in chunks])
    position_scores  = np.array([_position_score(i, n)               for i in range(n)])
    diversity_scores = np.array([_lexical_diversity_score(c["text"]) for c in chunks])
    technical_scores = np.array([_technical_density_score(c["text"]) for c in chunks])
    clarity_scores   = np.array([_sentence_clarity_score(c["text"])  for c in chunks])
    qa_scores        = np.array([_qa_score(c["text"])                 for c in chunks])

    def norm(arr):
        rng = arr.max() - arr.min()
        if rng < 1e-9:
            return np.ones_like(arr) * 0.5
        return (arr - arr.min()) / rng

    combined = (
        0.12 * norm(tfidf_scores)     +
        0.25 * norm(embedding_scores) +   # strongest: semantic match to 4 query types
        0.18 * norm(keyword_scores)   +
        0.15 * norm(discourse_scores) +   # structural patterns
        0.08 * norm(position_scores)  +
        0.08 * norm(diversity_scores) +
        0.06 * norm(technical_scores) +
        0.05 * norm(clarity_scores)   +
        0.03 * norm(qa_scores)
    )

    for i, chunk in enumerate(chunks):
        chunk["score"] = float(combined[i])

    threshold = np.percentile(combined, (1 - top_percent) * 100)
    filtered  = [c for c in chunks if c["score"] >= threshold]
    return filtered if filtered else chunks
