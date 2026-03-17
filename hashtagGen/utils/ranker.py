import json
import os
import re
import logging

logger = logging.getLogger(__name__)

_DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'instagram_hashtags.json')

# Tier popularity scores
_TIER_SCORE = {'broad': 1.0, 'medium': 0.6, 'niche': 0.35}

# Load the database once
try:
    with open(_DB_PATH, 'r') as f:
        _DB: dict = json.load(f)
except Exception:
    _DB = {}


def _normalise(tag: str) -> str:
    tag = tag.strip().lower()
    if not tag.startswith('#'):
        tag = '#' + tag
    return re.sub(r'[^#a-z0-9_]', '', tag)


def _db_lookup(tag: str) -> dict | None:
    """Check if tag is in our curated database. Returns {'tier', 'category'}."""
    clean = _normalise(tag).lstrip('#')
    for category, tiers in _DB.items():
        for tier, tags in tiers.items():
            if f'#{clean}' in tags:
                return {'tier': tier, 'category': category}
    return None


def _detect_categories(description: str) -> list[str]:
    """Simple keyword → category mapping."""
    desc = description.lower()
    mapping = {
        'football': ['football', 'soccer', 'goal', 'fifa', 'premier league', 'laliga', 'bundesliga'],
        'cricket':  ['cricket', 'ipl', 'wicket', 'bcci', 'test match', 'odi', 't20'],
        'basketball': ['basketball', 'nba', 'hoops', 'dunk', 'three pointer'],
        'sports':   ['sport', 'athlete', 'match', 'game', 'training', 'tournament'],
        'food':     ['food', 'recipe', 'cook', 'eat', 'restaurant', 'chef', 'meal', 'delicious'],
        'travel':   ['travel', 'trip', 'vacation', 'journey', 'explore', 'destination'],
        'fashion':  ['fashion', 'outfit', 'style', 'clothes', 'wear', 'ootd'],
        'fitness':  ['fitness', 'gym', 'workout', 'exercise', 'training', 'weight', 'muscle'],
        'technology':['tech', 'coding', 'programming', 'software', 'ai', 'app', 'developer'],
        'beauty':   ['beauty', 'makeup', 'skincare', 'cosmetics', 'glow'],
        'music':    ['music', 'song', 'singer', 'rapper', 'producer', 'beat', 'album'],
        'photography':['photo', 'photograph', 'camera', 'shoot', 'portrait'],
        'gaming':   ['game', 'gaming', 'gamer', 'esport', 'stream', 'playstation', 'xbox'],
        'nature':   ['nature', 'wildlife', 'forest', 'mountain', 'ocean', 'plant'],
        'business': ['business', 'startup', 'entrepreneur', 'marketing', 'brand'],
        'comedy':   ['funny', 'comedy', 'humor', 'meme', 'joke', 'laugh'],
        'motivation':['motivation', 'inspire', 'success', 'goal', 'mindset'],
        'art':      ['art', 'draw', 'paint', 'illustrat', 'design', 'sketch'],
        'education':['study', 'learn', 'student', 'education', 'school', 'college'],
        'lifestyle': ['lifestyle', 'life', 'daily', 'vlog', 'routine'],
    }
    detected = []
    for category, keywords in mapping.items():
        if any(kw in desc for kw in keywords):
            detected.append(category)
    return detected or ['lifestyle']


def get_db_hashtags(description: str, num: int = 20) -> list[dict]:
    """Pull relevant hashtags from curated database based on detected categories."""
    categories = _detect_categories(description)
    result = []
    seen   = set()

    for cat in categories[:3]:  # top 3 detected categories
        if cat not in _DB:
            continue
        for tier in ['broad', 'medium', 'niche']:
            for tag in _DB[cat].get(tier, []):
                if tag not in seen:
                    seen.add(tag)
                    result.append({'tag': tag, 'tier': tier, 'source': 'database', 'category': cat, 'reason': ''})

    # Also add generic lifestyle/motivation mix
    for tier in ['broad', 'medium']:
        for tag in _DB.get('lifestyle', {}).get(tier, []):
            if tag not in seen:
                seen.add(tag)
                result.append({'tag': tag, 'tier': tier, 'source': 'database', 'category': 'lifestyle', 'reason': ''})

    return result[:num]


def rank_and_merge(
    ai_tags: list[dict],
    db_tags: list[dict],
    trending_tags: list[str],
    total: int = 30,
) -> dict:
    """
    Merge all sources, deduplicate, score, and return grouped result.

    Score = popularity_weight + trending_boost
    """
    trending_set = {t.lstrip('#').lower() for t in trending_tags}
    merged: dict[str, dict] = {}

    def _add(tag_dict: dict, base_score: float):
        tag   = _normalise(tag_dict['tag'])
        clean = tag.lstrip('#')
        if tag in merged:
            merged[tag]['score'] = max(merged[tag]['score'], base_score)
            if tag_dict.get('source') not in merged[tag].get('sources', []):
                merged[tag].setdefault('sources', []).append(tag_dict.get('source', ''))
            return
        tier          = tag_dict.get('tier', 'medium')
        trending_boost = 0.35 if clean in trending_set else 0.0
        score          = base_score + trending_boost
        merged[tag] = {
            'tag':      tag,
            'tier':     tier,
            'score':    score,
            'trending': clean in trending_set,
            'reason':   tag_dict.get('reason', ''),
            'sources':  [tag_dict.get('source', '')],
        }

    # AI tags carry highest relevance weight
    for t in ai_tags:
        _add(t, _TIER_SCORE.get(t.get('tier', 'medium'), 0.6) + 0.4)

    # Database tags
    for t in db_tags:
        _add(t, _TIER_SCORE.get(t.get('tier', 'medium'), 0.6))

    # Trending-only tags (not in AI or DB yet)
    for raw in trending_tags:
        tag   = _normalise(raw)
        clean = tag.lstrip('#')
        if tag not in merged:
            merged[tag] = {
                'tag':     tag,
                'tier':    'medium',
                'score':   0.5 + 0.35,
                'trending': True,
                'reason':  'Currently trending on Instagram',
                'sources': ['trending'],
            }

    # Sort by score descending
    ranked = sorted(merged.values(), key=lambda x: x['score'], reverse=True)[:total]

    # Group output
    groups = {
        'trending': [t for t in ranked if t['trending']],
        'broad':    [t for t in ranked if not t['trending'] and t['tier'] == 'broad'],
        'medium':   [t for t in ranked if not t['trending'] and t['tier'] == 'medium'],
        'niche':    [t for t in ranked if not t['trending'] and t['tier'] == 'niche'],
    }

    return {
        'groups':    groups,
        'all_tags':  [t['tag'] for t in ranked],
        'total':     len(ranked),
        'trending_count': len(groups['trending']),
    }
