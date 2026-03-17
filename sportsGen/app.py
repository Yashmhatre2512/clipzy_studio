from flask import Flask
from flask_cors import CORS
import os
import logging
import config.config as config

from api.health_routes import health_bp
from api.sports_routes import sports_bp

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(sports_bp, url_prefix="/api")

    os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(config.RESULTS_FOLDER, exist_ok=True)

    app.config["MAX_CONTENT_LENGTH"] = config.MAX_CONTENT_LENGTH
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5002, debug=False)
