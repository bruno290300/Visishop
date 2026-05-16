from main import create_app
from flask_cors import CORS
app = create_app()
CORS(app, resources={r"/*": {"origins": "*"}})
app.app_context().push()
from main import db


if __name__=="__main__":
    db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)


