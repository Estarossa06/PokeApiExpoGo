import os # Importa un modulo para interactuar con el sistema operativo
from dotenv import load_dotenv # importa la funcion que busca el archivo .env y carga las variables
from pymongo import MongoClient # importa el client de mongoDB para Python
from flask import Flask, jsonify
from flasgger import Swagger

load_dotenv() # activa la libreria y python puede acceder al .env

MONGO_URI = os.getenv("MONGO_URI") # busca la variable MONGO_URI en el .env y guarda su valor

client = MongoClient(MONGO_URI) # Crea la conexion con el cluster de MongoDB Atlas

db = client["pokeanime"] # selecciona la base de datos que vamos a utilizar
characters = db["characters"] # selecciona la coleccion de la base de datos

app = Flask(__name__) # Crea nuestra app Flask
swagger = Swagger(app) # Inicializar Swagger

# EndPoint llamado general
@app.route("/api/characters", methods=["GET"]) # ruta para realizar la peticion GET
def get_characters():
    """
    Obtener todos los personajes
    ---
    responses:
      200:
        description: Lista de todos los personajes
    """
    # traera los documentos de la coleccion pero sin el id de MongoDb
    data = list(characters.find({}, {"_id": 0})) 
    return jsonify(data) # Convierte los resultados en un JSON 

# EndPoint llamado especifico
@app.route("/api/characters/<name>", methods=["GET"])
def get_character(name):
    """
    Obtener un personaje por nombre
    ---
    parameters:
      - name: name
        in: path
        type: string
        required: true
        description: Nombre del personaje
    responses:
      200:
        description: Personaje encontrado
      404:
        description: Personaje no encontrado
    """

    character = characters.find_one(
        {"name": {"$regex": f"^{name}$", "$options": "i"}},
        {"_id": 0}
    )

    if character is None:
        return jsonify({"error": "Personaje no encontrado"}), 404

    return jsonify(character)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)