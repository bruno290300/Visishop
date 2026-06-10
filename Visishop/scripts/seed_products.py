import argparse
import json
from pathlib import Path

from main import create_app
from main.extensions import db
from main.models import Producto


DEFAULT_DATASET = Path(__file__).resolve().parents[1] / "data" / "products_seed_off_family_20.json"


def load_products(dataset_path: Path) -> list[dict]:
    data = json.loads(dataset_path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("El dataset debe ser una lista de productos")
    for idx, item in enumerate(data, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Producto #{idx} inválido (no es objeto)")
        if not item.get("nombre") or not item.get("codigo_barras"):
            raise ValueError(f"Producto #{idx} inválido (faltan campos)")
    return data


def seed(dataset_path: Path, *, overwrite: bool) -> dict:
    products = load_products(dataset_path)

    created = 0
    updated = 0
    skipped = 0

    for item in products:
        codigo = str(item["codigo_barras"]).strip()
        nombre = str(item["nombre"]).strip()

        existing = Producto.query.filter_by(codigo_barras=codigo).first()
        if existing:
            if overwrite and existing.nombre != nombre:
                existing.nombre = nombre
                updated += 1
            else:
                skipped += 1
            continue

        db.session.add(Producto(nombre=nombre, codigo_barras=codigo))
        created += 1

    db.session.commit()
    return {"created": created, "updated": updated, "skipped": skipped, "total": len(products)}


def main():
    parser = argparse.ArgumentParser(description="Seed de productos para Visishop (offline/MVP).")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET, help="Ruta al JSON del dataset.")
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Si existe un código de barras, actualiza el nombre para que coincida con el dataset.",
    )
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        db.create_all()
        result = seed(args.dataset, overwrite=args.overwrite)

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()

