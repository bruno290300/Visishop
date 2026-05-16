# Visishop

Visishop es un workspace con dos aplicaciones que cubren el flujo principal del MVP:

- `Visishop/`: backend Flask con autenticacion por usuario/clave y Google, JWT, CRUD de productos, lista de compras por usuario y verificacion por codigo de barras.
- `visishop-web/`: frontend React + Vite + Tailwind con experiencia web/mobile, login, lista de compras, carga por voz, escaneo con camara y feedback por voz.

## Estado actual del proyecto

Hoy el repositorio ya incluye:

- Registro e inicio de sesion con usuario y contrasena.
- Inicio de sesion con Google contra el backend (`/auth/google`).
- Persistencia de sesion en frontend con `localStorage`.
- CRUD de productos en el backend protegido con JWT.
- Lista de compras por usuario en el backend.
- Verificacion de items de la lista comparando el producto esperado con el codigo de barras escaneado.
- Alta de items por voz en backend (`/api/lista/voz`) y por reconocimiento de voz nativo del navegador en frontend.
- Escaneo de codigos de barras en web usando la camara (`html5-qrcode`).
- Feedback de accesibilidad por voz en frontend con `speechSynthesis`.
- Script de seed para cargar un catalogo base de productos.
- Tests de autenticacion, productos, flujo de lista y alta por voz.

## Arquitectura del workspace

```text
Visishop/
|-- README.md
|-- Visishop/                 # API Flask
|   |-- app.py
|   |-- main/
|   |-- services/
|   |-- scripts/
|   `-- tests/
`-- visishop-web/             # App React + Vite
    |-- src/
    |-- package.json
    `-- vite.config.js
```

## Stack

### Backend

- Flask
- Flask-SQLAlchemy
- Flask-Migrate
- Flask-JWT-Extended
- Flask-WTF
- Flask-Cors
- SQLite por defecto
- SpeechRecognition
- Google Auth

### Frontend

- React 18
- Vite 5
- Tailwind CSS 3
- `html5-qrcode`
- Google Identity Services

## Como ejecutar el proyecto

### 1. Backend (`Visishop/`)

Requisitos:

- Python 3.10 o superior
- `pip`

Pasos:

```powershell
cd Visishop
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

La API queda disponible por defecto en:

- `http://127.0.0.1:5000`
- `http://localhost:5000`

La base de datos por defecto es SQLite:

- `sqlite:///visishop.db`

### 2. Frontend (`visishop-web/`)

Requisitos:

- Node.js 18 o superior
- `npm`

Pasos:

```powershell
cd visishop-web
npm install
npm run dev
```

Vite levanta el frontend en HTTPS para permitir camara y mejorar compatibilidad con voz/Google Sign-In. Normalmente queda en una URL como:

- `https://localhost:5173`

## Variables de entorno

El backend lee variables desde `.env` si existe. Las claves hoy soportadas son:

```env
SECRET_KEY=dev-secret-key
JWT_SECRET_KEY=dev-jwt-secret-key-1234567890abcdef
SQLALCHEMY_DATABASE_URI=sqlite:///visishop.db
SQLALCHEMY_TRACK_MODIFICATIONS=false
WTF_CSRF_ENABLED=false
GOOGLE_CLIENT_ID=
```

Variables utiles en frontend:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
VITE_GOOGLE_CLIENT_ID=
```

Notas:

- Si `VITE_GOOGLE_CLIENT_ID` no existe, el frontend intenta leer el client ID desde `GET /auth/google/config`.
- Si `VITE_API_BASE_URL` no existe, el frontend prueba varias URLs candidatas del backend, incluyendo el host actual en puerto `5000`.

## Endpoints principales del backend

### Salud

- `GET /`
- `GET /api/`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google`
- `GET /auth/google/config`
- `GET /auth/protected`

### Productos

- `GET /api/productos`
- `GET /api/productos/:id`
- `POST /api/productos`
- `PUT /api/productos/:id`
- `DELETE /api/productos/:id`

### Lista de compras

- `GET /api/lista`
- `POST /api/lista`
- `POST /api/lista/voz`
- `POST /api/lista/:item_id/verificar`

Todos los endpoints bajo `/api` y `/auth/protected` usan JWT, salvo los de login/registro/configuracion.

## Seed de productos

El repo incluye un dataset offline en [Visishop/data/products_seed_off_family_20.json](/C:/Users/Usuario/Documents/GitHub/Visishop-backend/Visishop/data/products_seed_off_family_20.json) y un script para cargarlo en la base:

```powershell
cd Visishop
.\.venv\Scripts\Activate.ps1
python scripts/seed_products.py
```

Para sobrescribir nombres existentes cuando coincide el codigo:

```powershell
python scripts/seed_products.py --overwrite
```

## Tests

Backend:

```powershell
cd Visishop
.\.venv\Scripts\Activate.ps1
pytest
```

Los tests actuales cubren:

- registro e inicio de sesion
- CRUD de productos
- flujo MVP de lista y verificacion
- alta de item por voz

## Comportamiento actual del frontend

El frontend ya ofrece una experiencia funcional para demo/MVP, pero hoy conviven dos fuentes de verdad:

- La autenticacion si habla con el backend real.
- La lista visual del frontend se persiste en `localStorage`.
- La verificacion de codigos en la UI se apoya en un catalogo local (`src/data/productCatalog.json`) y no sincroniza todavia con `/api/lista`.
- El ingreso por voz del frontend usa `SpeechRecognition` del navegador.
- El backend tambien expone un flujo propio de voz con subida de audio a `/api/lista/voz`.

En otras palabras: auth ya esta conectada al servidor; la experiencia de lista/escaneo web sigue orientada a MVP local con soporte de camara, voz y accesibilidad.

## Funcionalidades destacadas

- Matching flexible entre nombre ingresado y producto verificado en backend.
- Escaneo de codigos con camara trasera cuando el dispositivo lo permite.
- Soporte de navegacion mobile gracias a `host: true` en Vite.
- Proxy de `/auth` en desarrollo desde Vite hacia Flask.
- Feedback hablado en espanol para ayudar a validar si el producto coincide o no.

## Limitaciones conocidas

- El frontend no consume todavia los endpoints reales de lista y productos.
- La configuracion HTTPS del frontend usa certificado local/autofirmado.
- Google Sign-In requiere configurar `GOOGLE_CLIENT_ID` correctamente en backend y/o frontend.
- El reconocimiento de voz depende del soporte del navegador y de permisos de microfono.
- La transcripcion del backend depende de `SpeechRecognition` y del servicio usado por `recognize_google`.

## Proximos pasos naturales

- Conectar la lista web con `/api/lista`.
- Persistir verificacion real contra el backend desde la UI.
- Unificar catalogo local y catalogo persistido en base de datos.
- Agregar tests del frontend y pruebas end-to-end del flujo completo.
- Formalizar setup de variables de entorno con archivos de ejemplo.
