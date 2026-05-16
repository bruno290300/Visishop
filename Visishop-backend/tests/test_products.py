from io import BytesIO

import pytest

from app import create_app
from main.extensions import db
from main.models import User


@pytest.fixture
def client():
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'WTF_CSRF_ENABLED': False,
    })

    with app.app_context():
        db.create_all()
        user = User(username='test')
        user.set_password('1234')
        db.session.add(user)
        db.session.commit()

    with app.test_client() as client:
        yield client


def get_auth_header(client):
    rv = client.post('/auth/login', json={'username': 'test', 'password': '1234'})
    token = rv.get_json()['token']
    return {'Authorization': f'Bearer {token}'}


def test_crud_productos(client):
    headers = get_auth_header(client)

    rv = client.post('/api/productos', json={'nombre': 'Leche', 'codigo_barras': '123456'}, headers=headers)
    assert rv.status_code == 201

    rv = client.get('/api/productos', headers=headers)
    assert rv.status_code == 200
    data = rv.get_json()
    assert len(data) == 1

    prod_id = data[0]['id']
    rv = client.put(f'/api/productos/{prod_id}', json={'nombre': 'Leche Entera'}, headers=headers)
    assert rv.status_code == 200

    rv = client.delete(f'/api/productos/{prod_id}', headers=headers)
    assert rv.status_code == 200


def test_flujo_mvp_lista_y_verificacion(client):
    headers = get_auth_header(client)

    rv = client.post('/api/productos', json={'nombre': 'Leche Entera', 'codigo_barras': '7890'}, headers=headers)
    assert rv.status_code == 201

    rv = client.post('/api/lista', json={'nombre': 'Leche'}, headers=headers)
    assert rv.status_code == 201
    item_id = rv.get_json()['id']

    rv = client.post(f'/api/lista/{item_id}/verificar', json={'codigo_barras': '7890'}, headers=headers)
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['coincide'] is True
    assert data['item']['verificado'] is True
    assert data['item']['producto']['nombre'] == 'Leche Entera'


def test_verificacion_fallida_si_no_coincide_nombre(client):
    headers = get_auth_header(client)

    client.post('/api/productos', json={'nombre': 'Arroz', 'codigo_barras': '999'}, headers=headers)
    rv = client.post('/api/lista', json={'nombre': 'Yerba'}, headers=headers)
    item_id = rv.get_json()['id']

    rv = client.post(f'/api/lista/{item_id}/verificar', json={'codigo_barras': '999'}, headers=headers)
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['coincide'] is False
    assert data['item']['verificado'] is False


def test_alta_por_voz(client, monkeypatch):
    headers = get_auth_header(client)

    monkeypatch.setattr('main.routes.transcribir_audio', lambda _: 'Pan lactal')

    rv = client.post(
        '/api/lista/voz',
        data={'audio': (BytesIO(b'audio falso'), 'audio.wav')},
        headers=headers,
        content_type='multipart/form-data',
    )

    assert rv.status_code == 201
    data = rv.get_json()
    assert data['texto'] == 'Pan lactal'
    assert data['item']['nombre_ingresado'] == 'Pan lactal'
