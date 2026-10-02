# PokeApiExpoGo

Aplicación móvil desarrollada con **React Native y Expo** que implementa una arquitectura basada en microservicios para consultar información de Pokémon y personajes de Dragon Ball.

El proyecto utiliza dos tipos de bases de datos:

- **PostgreSQL / Neon** para Pokémon.
- **MongoDB Atlas** para personajes de Dragon Ball.

Los microservicios están desplegados en **Render**.

---

## Tecnologías utilizadas

### Frontend

- React Native
- Expo
- Expo Router
- TypeScript
- Context API

### Microservicio de Pokémon

- Node.js
- Express
- PostgreSQL
- pg
- Swagger

### Microservicio de Dragon Ball

- Python
- Flask
- PyMongo
- Flasgger
- Gunicorn

### Bases de datos

- PostgreSQL / Neon
- MongoDB Atlas

---

# Arquitectura

## Pokémon

```text
Aplicación Expo
       ↓
PokemonContext
       ↓
Microservicio Node.js
       ↓
PostgreSQL / Neon
```

## Dragon Ball

```text
Aplicación Expo
       ↓
DragonBallContext
       ↓
Microservicio Python / Flask
       ↓
MongoDB Atlas
```

El frontend no realiza directamente las consultas a las bases de datos.

Los Context del frontend se comunican con los microservicios, y estos se encargan de acceder a sus respectivas bases de datos.

---

# Pokémon

La información de Pokémon se almacena en una base de datos relacional PostgreSQL alojada en Neon.

La tabla utilizada es:

```text
pokemons
```

Los campos almacenados son:

- `id`
- `name`
- `height`
- `weight`
- `image`

La base de datos contiene 10 Pokémon.

## Microservicio

El microservicio se encuentra en:

```text
pokemon-backend/
```

Está desarrollado con Node.js y Express.

### Instalación

Desde la carpeta del microservicio:

```bash
cd pokemon-backend
npm install
```

### Ejecución local

```bash
node index.js
```

### Servicio desplegado

```text
https://pokemon-backend-rfz3.onrender.com
```

### Endpoint

Buscar un Pokémon por nombre:

```text
GET /api/pokemon/{name}
```

Ejemplo:

```text
https://pokemon-backend-rfz3.onrender.com/api/pokemon/bulbasaur
```

### Swagger

```text
https://pokemon-backend-rfz3.onrender.com/api-docs
```

---

# Dragon Ball

La información de los personajes se almacena en una base de datos no relacional MongoDB Atlas.

Base de datos:

```text
pokeanime
```

Colección:

```text
characters
```

Los campos almacenados son:

- `id`
- `name`
- `race`
- `gender`
- `image`

La colección contiene 10 personajes.

## API pública utilizada

Para obtener la información de los personajes se utilizó:

```text
https://dragonball-api.com/api/characters
```

Los personajes utilizados son:

1. Goku
2. Vegeta
3. Piccolo
4. Bulma
5. Freezer
6. Zarbon
7. Dodoria
8. Ginyu
9. Celula
10. Gohan

La aplicación no consume directamente esta API desde el frontend.

Los datos utilizados por la aplicación se almacenan en MongoDB y son consultados mediante el microservicio Python.

## Microservicio

El microservicio se encuentra en:

```text
dragonball-python/
```

Está desarrollado con Python y Flask.

### Instalación

Desde la carpeta del microservicio:

```bash
cd dragonball-python
pip install -r requirements.txt
```

### Ejecución local

```bash
python app.py
```

Si se utiliza el entorno virtual incluido:

```powershell
.\.venv\Scripts\Activate.ps1
```

### Servicio desplegado

```text
https://dragonball-python-bpao.onrender.com
```

### Endpoints

Obtener todos los personajes:

```text
GET /api/characters
```

Buscar un personaje por nombre:

```text
GET /api/characters/{name}
```

Ejemplo:

```text
https://dragonball-python-bpao.onrender.com/api/characters/Goku
```

### Swagger

```text
https://dragonball-python-bpao.onrender.com/apidocs/
```

---

# Aplicación móvil

La aplicación utiliza Expo Router para la navegación entre las diferentes pantallas.

## Inicio

Permite buscar un Pokémon por nombre y visualizar su imagen.

## Info Pokémon

Muestra:

- ID
- Nombre
- Altura
- Peso
- Imagen

## Character

Permite buscar un personaje de Dragon Ball por nombre y muestra:

- Nombre
- Imagen
- Raza
- Género

## Info Dragon Ball

Muestra:

- ID
- Nombre
- Raza
- Género
- Imagen

---

# Context API

La aplicación utiliza Context API para compartir los datos obtenidos por los microservicios entre las diferentes pantallas.

## PokemonContext

Se encarga de:

- Buscar Pokémon.
- Comunicarse con el microservicio Node.js.
- Almacenar el Pokémon encontrado.
- Manejar estados de carga.
- Manejar errores.

## DragonBallContext

Se encarga de:

- Buscar personajes.
- Comunicarse con el microservicio Python.
- Almacenar el personaje encontrado.
- Manejar estados de carga.
- Manejar errores.

---

# Instalación del proyecto

Clonar el repositorio:

```bash
git clone https://github.com/Estarossa06/PokeApiExpoGo.git
```

Entrar al proyecto:

```bash
cd PokeApiExpoGo
```

Instalar las dependencias:

```bash
npm install
```

---

# Ejecutar la aplicación

Desde la raíz del proyecto:

```bash
npx expo start
```

También se puede utilizar:

```bash
npm start
```

La aplicación puede ejecutarse mediante:

- Expo Go
- Emulador Android
- Simulador iOS
- Navegador web

---

# Variables de entorno

Los microservicios utilizan variables de entorno para almacenar las credenciales de las bases de datos.

## Pokémon

```text
DATABASE_URL
```

Contiene la cadena de conexión de PostgreSQL.

## Dragon Ball

```text
MONGO_URI
```

Contiene la cadena de conexión de MongoDB Atlas.

Estas variables contienen información privada y no deben publicarse en GitHub.

---

# Estructura principal del proyecto

```text
PokeApiExpoGo/
│
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   └── (tabs)/
│   │       ├── _layout.tsx
│   │       ├── index.tsx
│   │       ├── information.tsx
│   │       ├── character.tsx
│   │       └── transformations.tsx
│   │
│   ├── context/
│   │   ├── PokemonContext.tsx
│   │   └── DragonBallContext.tsx
│   │
│   └── components/
│
├── pokemon-backend/
│   ├── index.js
│   └── package.json
│
├── dragonball-python/
│   ├── app.py
│   ├── requirements.txt
│   └── .gitignore
│
├── package.json
├── requirements.md
└── README.md
```

> Nota: el archivo `transformations.tsx` mantiene su nombre interno por compatibilidad con la ruta de Expo Router, pero actualmente funciona como la pantalla **Info Dragon Ball**.

---

# Archivos que no deben subirse

No se deben subir al repositorio:

```text
node_modules/
.venv/
.env
```

Las dependencias pueden instalarse nuevamente mediante:

```bash
npm install
```

o:

```bash
pip install -r requirements.txt
```

---

# Servicios desplegados

## Pokémon

Microservicio:

```text
https://pokemon-backend-rfz3.onrender.com
```

Swagger:

```text
https://pokemon-backend-rfz3.onrender.com/api-docs
```

## Dragon Ball

Microservicio:

```text
https://dragonball-python-bpao.onrender.com
```

Swagger:

```text
https://dragonball-python-bpao.onrender.com/apidocs/
```

---

# Repositorio

Repositorio oficial del proyecto:

```text
https://github.com/Estarossa06/PokeApiExpoGo
```