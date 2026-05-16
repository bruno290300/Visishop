from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    items_lista = db.relationship('ListaCompraItem', back_populates='user', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Producto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(150), nullable=False)
    codigo_barras = db.Column(db.String(50), unique=True, nullable=False)


class ListaCompraItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre_ingresado = db.Column(db.String(150), nullable=False)
    verificado = db.Column(db.Boolean, nullable=False, default=False)
    codigo_verificado = db.Column(db.String(50), nullable=True)
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    user = db.relationship('User', back_populates='items_lista')
    producto = db.relationship('Producto')
