import json
import os
import logging

logger = logging.getLogger(__name__)

PROMPT = """You are an expert Instagram growth strategist. Analyze this content description and generate Instagram hashtags.

Content description: {description}

Generate exactly {num} Instagram hashtags. Follow this mix:
- 20% broad hashtags (millions of posts, maximum reach)
- 50% medium hashtags (100K–1M posts, good engagement)
- 30% niche hashtags (10K–100K posts, targeted audience, less competition)

Rules:
- Hashtags must be directly relevant to the content
- Include a mix of content-specific and community hashtags
- Avoid banned or overused generic hashtags (#like4like, #followme)
- Focus on Instagram specifically

Return ONLY a valid JSON array, no explanation:
[
  {{"tag": "#example", "tier": "broad|medium|niche", "reason": "why this is relevant"}},
  ...
]"""


def generate_with_groq(description: str, num: int = 30) -> list[dict]:
    api_key = os.getenv('GROQ_API_KEY', '')
    if not api_key:
        logger.warning("No GROQ_API_KEY — skipping AI generation")
        return []

    try:
        from groq import Groq
        client   = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": PROMPT.format(description=description, num=num)}],
            max_tokens=2048,
            temperature=0.3,
        )
        text  = response.choices[0].message.content.strip()
        start = text.find('[')
        end   = text.rfind(']') + 1
        if start != -1 and end > start:
            items = json.loads(text[start:end])
            # Normalise
            result = []
            for item in items:
                tag = item.get('tag', '').strip().lower()
                if not tag.startswith('#'):
                    tag = '#' + tag
                result.append({
                    'tag':    tag,
                    'tier':   item.get('tier', 'medium'),
                    'reason': item.get('reason', ''),
                    'source': 'ai',
                })
            logger.info(f"Groq generated {len(result)} hashtags")
            return result
    except Exception as e:
        logger.warning(f"Groq hashtag generation failed: {e}")

    return []
