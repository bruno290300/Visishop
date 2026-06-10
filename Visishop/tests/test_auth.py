from app import create_app
from main.extensions import db


def test_register_login():
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'WTF_CSRF_ENABLED': False,
    })

    with app.test_client() as client:
        with app.app_context():
            db.create_all()

        rv = client.post('/auth/register', json={'username': 'test', 'password': '1234'})
        assert rv.status_code == 201

        rv = client.post('/auth/login', json={'username': 'test', 'password': '1234'})
        assert rv.status_code == 200
        assert 'token' in rv.get_json()
