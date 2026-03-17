from flask import Flask
from flask_cors import CORS
import logging
import config.config as config

from api.health_routes import health_bp
from api.hashtag_routes import hashtag_bp

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def create_app():
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(health_bp,  url_prefix="/api")
    app.register_blueprint(hashtag_bp, url_prefix="/api")
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5003, debug=False)
