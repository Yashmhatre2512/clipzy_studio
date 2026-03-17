import re
import logging
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def _clean(tag: str) -> str:
    """Ensure tag starts with # and is lowercase."""
    tag = tag.strip().lower()
    if not tag.startswith('#'):
        tag = '#' + tag
    return re.sub(r'[^#a-z0-9_]', '', tag)


def scrape_top_hashtags(category_keyword: str) -> list[str]:
    """
    Try multiple public sources for Instagram trending hashtags.
    Returns a list of clean hashtag strings. Empty list on failure.
    """
    results = []

    # ── Source 1: top-hashtags.com ────────────────────────────────────────────
    try:
        url = f"https://top-hashtags.com/hashtag/{category_keyword.lower().replace(' ', '-')}/"
        r   = requests.get(url, headers=HEADERS, timeout=8)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            for el in soup.select('.tag-box span, .hashtag, li.tag'):
                text = el.get_text(strip=True)
                if text and len(text) > 1:
                    results.append(_clean(text))
    except Exception as e:
        logger.debug(f"top-hashtags.com scrape failed: {e}")

    # ── Source 2: all-hashtag.com generator ───────────────────────────────────
    if len(results) < 10:
        try:
            url  = "https://all-hashtag.com/library/contents/ajax_generate.php"
            data = {"keyword": category_keyword, "type": "top"}
            r    = requests.post(url, data=data, headers=HEADERS, timeout=8)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, 'html.parser')
                for el in soup.find_all(string=re.compile(r'#\w+')):
                    for match in re.findall(r'#[a-zA-Z]\w+', el):
                        results.append(_clean(match))
        except Exception as e:
            logger.debug(f"all-hashtag.com scrape failed: {e}")

    # ── Source 3: inflact.com ─────────────────────────────────────────────────
    if len(results) < 10:
        try:
            url = f"https://inflact.com/tools/hashtag-generator/?query={category_keyword}"
            r   = requests.get(url, headers=HEADERS, timeout=8)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, 'html.parser')
                for el in soup.select('[class*="hashtag"], [class*="tag"]'):
                    text = el.get_text(strip=True)
                    if text.startswith('#'):
                        results.append(_clean(text))
        except Exception as e:
            logger.debug(f"inflact.com scrape failed: {e}")

    # Deduplicate and limit
    seen = set()
    unique = []
    for tag in results:
        if tag and tag not in seen and len(tag) > 2:
            seen.add(tag)
            unique.append(tag)

    logger.info(f"Scraped {len(unique)} trending hashtags for '{category_keyword}'")
    return unique[:40]
