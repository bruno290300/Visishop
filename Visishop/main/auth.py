import secrets

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import requests
from sqlalchemy import func

from .extensions import db
from .models import User

auth_bp = Blueprint('auth', __name__)


def build_google_request():
    # Ignore machine-level proxy vars in local dev so token verification can
    # fetch Google's certs directly.
    session = requests.Session()
    session.trust_env = False
    return google_requests.Request(session=session)


@auth_bp.route('/google/config', methods=['GET'])
def google_config():
    client_id = current_app.config.get('GOOGLE_CLIENT_ID', '')
    return jsonify({
        'configured': bool(client_id),
        'client_id': client_id or '',
    }), 200


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = str((data or {}).get('username') or (data or {}).get('name') or '').strip().lower()
    password = str((data or {}).get('password') or '')

    if not username or not password:
        return jsonify({'msg': 'Faltan datos'}), 400

    existing_user = User.query.filter(func.lower(User.username) == username).first()
    if existing_user:
        # Permite "reclamar" una cuenta creada con Google y definir clave manual.
        existing_user.set_password(password)
        db.session.commit()
        return jsonify({'msg': 'Usuario existente: clave actualizada'}), 200

    user = User(username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({'msg': 'Usuario creado'}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = str((data or {}).get('username') or (data or {}).get('name') or '').strip().lower()
    password = str((data or {}).get('password') or '')

    if not username or not password:
        return jsonify({'msg': 'Faltan datos'}), 400

    user = User.query.filter(func.lower(User.username) == username).first()
    if not user or not user.check_password(password):
        return jsonify({'msg': 'Usuario o contrasena incorrectos'}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({'token': access_token, 'user': {'id': user.id, 'username': user.username}}), 200


@auth_bp.route('/google', methods=['POST'])
def google_login():
    data = request.get_json()
    credential = (data or {}).get('credential')
    client_id = current_app.config.get('GOOGLE_CLIENT_ID')

    if not client_id:
        return jsonify({'msg': 'Google Sign-In no esta configurado en el servidor'}), 500

    if not credential:
        return jsonify({'msg': 'Falta la credencial de Google'}), 400

    try:
        google_user = id_token.verify_oauth2_token(
            credential,
            build_google_request(),
            client_id,
        )
    except ValueError as error:
        response = {'msg': 'No se pudo verificar la cuenta de Google'}
        if current_app.debug:
            response['detail'] = str(error)
        return jsonify(response), 401

    email = (google_user.get('email') or '').strip().lower()
    email_verified = google_user.get('email_verified') is True

    if not email or not email_verified:
        return jsonify({'msg': 'La cuenta de Google no tiene un email verificado'}), 400

    user = User.query.filter_by(username=email).first()
    if not user:
        user = User(username=email)
        user.set_password(secrets.token_urlsafe(32))
        db.session.add(user)
        db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    display_name = (
        google_user.get('given_name')
        or google_user.get('name')
        or email
    )

    return jsonify({
        'token': access_token,
        'user': {
            'id': user.id,
            'name': display_name,
            'email': email,
            'username': user.username,
            'provider': 'google',
        },
    }), 200


@auth_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    return jsonify({'id': user.id, 'username': user.username}), 200
