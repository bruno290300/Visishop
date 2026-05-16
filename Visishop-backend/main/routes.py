import re
import unicodedata

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.voz import transcribir_audio

from .extensions import db
from .models import ListaCompraItem, Producto


main_bp = Blueprint('main', __name__)
routes_bp = Blueprint('routes', __name__)


@routes_bp.route('/', methods=['GET'])
def healthcheck():
    return jsonify({'status': 'ok', 'service': 'visishop-backend'})


def normalizar_texto(texto):
    texto = unicodedata.normalize('NFKD', texto or '')
    texto = ''.join(char for char in texto if not unicodedata.combining(char))
    texto = texto.lower().strip()
    texto = re.sub(r'[^a-z0-9\s]', ' ', texto)
    return re.sub(r'\s+', ' ', texto)


def coincide_nombre(nombre_lista, nombre_producto):
    nombre_lista_normalizado = normalizar_texto(nombre_lista)
    nombre_producto_normalizado = normalizar_texto(nombre_producto)

    if not nombre_lista_normalizado or not nombre_producto_normalizado:
        return False

    return (
        nombre_lista_normalizado == nombre_producto_normalizado
        or nombre_lista_normalizado in nombre_producto_normalizado
        or nombre_producto_normalizado in nombre_lista_normalizado
    )


def serializar_item_lista(item):
    return {
        'id': item.id,
        'nombre_ingresado': item.nombre_ingresado,
        'verificado': item.verificado,
        'codigo_verificado': item.codigo_verificado,
        'producto': {
            'id': item.producto.id,
            'nombre': item.producto.nombre,
            'codigo_barras': item.producto.codigo_barras,
        } if item.producto else None,
    }


@routes_bp.route('/transcribir_voz', methods=['POST'])
def transcribir_voz():
    if 'audio' not in request.files:
        return jsonify({'error': 'No se recibió archivo de audio'}), 400

    try:
        texto = transcribir_audio(request.files['audio'])
        return jsonify({'texto': texto})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@main_bp.route('/lista', methods=['GET'])
@jwt_required()
def listar_lista_compra():
    current_user_id = int(get_jwt_identity())
    items = ListaCompraItem.query.filter_by(user_id=current_user_id).order_by(ListaCompraItem.id.desc()).all()
    return jsonify([serializar_item_lista(item) for item in items])


@main_bp.route('/lista', methods=['POST'])
@jwt_required()
def crear_item_lista():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    nombre = (data or {}).get('nombre', '').strip()

    if not nombre:
        return jsonify({'msg': 'Falta el nombre del producto'}), 400

    item = ListaCompraItem(nombre_ingresado=nombre, user_id=current_user_id)
    db.session.add(item)
    db.session.commit()
    return jsonify(serializar_item_lista(item)), 201


@main_bp.route('/lista/voz', methods=['POST'])
@jwt_required()
def crear_item_lista_por_voz():
    current_user_id = int(get_jwt_identity())

    if 'audio' not in request.files:
        return jsonify({'msg': 'No se recibió archivo de audio'}), 400

    try:
        nombre = transcribir_audio(request.files['audio']).strip()
    except Exception as e:
        return jsonify({'msg': str(e)}), 500

    if not nombre:
        return jsonify({'msg': 'No se pudo reconocer el producto'}), 400

    item = ListaCompraItem(nombre_ingresado=nombre, user_id=current_user_id)
    db.session.add(item)
    db.session.commit()
    return jsonify({'texto': nombre, 'item': serializar_item_lista(item)}), 201


@main_bp.route('/lista/<int:item_id>/verificar', methods=['POST'])
@jwt_required()
def verificar_item_lista(item_id):
    current_user_id = int(get_jwt_identity())
    item = ListaCompraItem.query.filter_by(id=item_id, user_id=current_user_id).first_or_404()
    data = request.get_json()
    codigo_barras = (data or {}).get('codigo_barras', '').strip()

    if not codigo_barras:
        return jsonify({'msg': 'Falta el código escaneado'}), 400

    producto = Producto.query.filter_by(codigo_barras=codigo_barras).first()
    if not producto:
        return jsonify({
            'coincide': False,
            'msg': 'No existe un producto registrado con ese código',
            'item': serializar_item_lista(item),
        }), 404

    coincide = coincide_nombre(item.nombre_ingresado, producto.nombre)
    if coincide:
        item.verificado = True
        item.codigo_verificado = producto.codigo_barras
        item.producto = producto
        db.session.commit()

    return jsonify({
        'coincide': coincide,
        'item': serializar_item_lista(item),
        'producto_escaneado': {
            'id': producto.id,
            'nombre': producto.nombre,
            'codigo_barras': producto.codigo_barras,
        },
    })


@main_bp.route('/productos', methods=['GET'])
@jwt_required()
def listar_productos():
    productos = Producto.query.all()
    return jsonify([{'id': p.id, 'nombre': p.nombre, 'codigo_barras': p.codigo_barras} for p in productos])


@main_bp.route('/productos/<int:id>', methods=['GET'])
@jwt_required()
def obtener_producto(id):
    p = Producto.query.get_or_404(id)
    return jsonify({'id': p.id, 'nombre': p.nombre, 'codigo_barras': p.codigo_barras})


@main_bp.route('/productos', methods=['POST'])
@jwt_required()
def crear_producto():
    data = request.get_json()
    if not data or not data.get('nombre') or not data.get('codigo_barras'):
        return jsonify({'msg': 'Faltan datos'}), 400

    if Producto.query.filter_by(codigo_barras=data['codigo_barras']).first():
        return jsonify({'msg': 'Producto con ese código ya existe'}), 409

    p = Producto(nombre=data['nombre'], codigo_barras=data['codigo_barras'])
    db.session.add(p)
    db.session.commit()
    return jsonify({'msg': 'Producto creado', 'id': p.id}), 201


@main_bp.route('/productos/<int:id>', methods=['PUT'])
@jwt_required()
def actualizar_producto(id):
    p = Producto.query.get_or_404(id)
    data = request.get_json()
    if not data:
        return jsonify({'msg': 'No hay datos para actualizar'}), 400

    if 'nombre' in data:
        p.nombre = data['nombre']
    if 'codigo_barras' in data:
        if Producto.query.filter(Producto.codigo_barras == data['codigo_barras'], Producto.id != id).first():
            return jsonify({'msg': 'Código de barras ya usado por otro producto'}), 409
        p.codigo_barras = data['codigo_barras']

    db.session.commit()
    return jsonify({'msg': 'Producto actualizado'})


@main_bp.route('/productos/<int:id>', methods=['DELETE'])
@jwt_required()
def eliminar_producto(id):
    p = Producto.query.get_or_404(id)
    db.session.delete(p)
    db.session.commit()
    return jsonify({'msg': 'Producto eliminado'})
