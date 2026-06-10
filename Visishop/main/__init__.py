from flask import Flask

from .auth import auth_bp
from .config import Config
from .extensions import cors, csrf, db, jwt, migrate
from .routes import main_bp, routes_bp


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    @app.get('/')
    def root_healthcheck():
        return {'status': 'ok', 'service': 'visishop-backend'}

    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app)
    csrf.init_app(app)
    csrf.exempt(auth_bp)
    csrf.exempt(main_bp)
    csrf.exempt(routes_bp)

    # Registrar blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(main_bp, url_prefix='/api')
    app.register_blueprint(routes_bp, url_prefix='/api')

    return app
