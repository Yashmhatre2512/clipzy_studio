import logging
from flask import Blueprint, request, jsonify

from utils.ai_hashtags import generate_with_groq
from utils.trending import scrape_top_hashtags
from utils.ranker import get_db_hashtags, rank_and_merge, _detect_categories

hashtag_bp = Blueprint('hashtag_bp', __name__)
logger     = logging.getLogger(__name__)


@hashtag_bp.route('/generate', methods=['POST'])
def generate():
    try:
        body        = request.get_json(force=True)
        description = (body.get('description') or '').strip()
        num_tags    = min(50, max(10, int(body.get('num_tags', 30))))

        if not description:
            return jsonify({'error': 'Content description is required'}), 400
        if len(description) < 10:
            return jsonify({'error': 'Description too short — add more detail'}), 400

        logger.info(f"Generating hashtags for: {description[:60]}...")

        # Detect categories for targeted scraping
        categories = _detect_categories(description)
        primary    = categories[0] if categories else 'lifestyle'

        # Run all three sources (AI + scrape + database) in parallel-ish
        ai_tags       = generate_with_groq(description, num=num_tags)
        trending_tags = scrape_top_hashtags(primary)
        db_tags       = get_db_hashtags(description, num=num_tags)

        result = rank_and_merge(ai_tags, db_tags, trending_tags, total=num_tags)

        result['detected_categories'] = categories[:3]
        result['trending_source']     = primary

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Hashtag generation error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
