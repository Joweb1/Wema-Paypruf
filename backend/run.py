"""
Main entry point for the PayPruf backend application.
"""

import os
import sys
from flask import Flask
from flask_cors import CORS

# Add the current directory to Python path so we can import backend modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config
from app.routes.auth import auth_bp
from app.routes.payment_links import payment_links_bp
from app.routes.payments import payments_bp
from app.routes.dashboard import dashboard_bp
from app.routes.risk import risk_bp
from app.routes.fraud_reports import fraud_reports_bp

def create_app():
    """Application factory pattern."""
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(Config)

    # Enable CORS for all routes
    # Wildcard is fine for hackathon (no credentialed requests expected from browser).
    # For production: use explicit origins + supports_credentials=True.
    CORS(app, origins="*")

    # Register blueprints with distinct URL prefixes
    app.register_blueprint(auth_bp, url_prefix='/api/v1')
    app.register_blueprint(payment_links_bp, url_prefix='/api/v1/payment-links')
    app.register_blueprint(payments_bp, url_prefix='/api/v1/payments')
    app.register_blueprint(dashboard_bp, url_prefix='/api/v1/dashboard')
    app.register_blueprint(risk_bp, url_prefix='/api/v1/risk')
    app.register_blueprint(fraud_reports_bp, url_prefix='/api/v1/fraud-reports')

    # Root health check
    @app.route('/health')
    def health():
        return {"status": "healthy", "service": "paypruf-backend"}, 200

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)