# Requisitos y ejecución del proyecto

## 1. Software necesario

Para ejecutar el proyecto se necesita:

- Node.js
- npm
- Python 3
- Git
- Visual Studio Code (recomendado)
- Expo Go en el dispositivo móvil, si se utilizará un teléfono físico

Comprobar Node.js y npm:

```bash
node --version
npm --version
```

Comprobar Python:

```bash
python --version
```

## 2. Clonar el proyecto

```bash
git clone https://github.com/Estarossa06/PokeApiExpoGo.git
cd PokeApiExpoGo
```

## 3. Instalar dependencias del frontend

Desde la raíz del proyecto:

```bash
npm install
```

Las dependencias del frontend están definidas en el `package.json` principal.

No es necesario subir `node_modules` al repositorio.

## 4. Arquitectura del proyecto

El proyecto utiliza dos microservicios independientes y dos tipos de bases de datos.

### Pokémon

```text
React Native / Expo
        ↓
PokemonContext
        ↓
Microservicio Node.js
        ↓
PostgreSQL / Neon
```

### Dragon Ball

```text
React Native / Expo
        ↓
DragonBallContext
        ↓
Microservicio Python / Flask
        ↓
MongoDB Atlas
```

Los microservicios están desplegados en Render, por lo que la aplicación no necesita ejecutar los servidores localmente para realizar las búsquedas.

## 5. Base de datos relacional — PostgreSQL

La información de Pokémon se almacena en una base de datos PostgreSQL alojada en Neon.

La tabla utilizada es:

```text
pokemons
```

Los campos principales son:

- `id`
- `name`
- `height`
- `weight`
- `image`

La base de datos contiene 10 Pokémon.

El microservicio Node.js consulta esta base de datos para realizar las búsquedas.

## 6. Microservicio de Pokémon

El microservicio está desarrollado con:

- Node.js
- Express
- PostgreSQL
- pg
- dotenv
- Swagger

El código se encuentra en:

```text
pokemon-backend/
```

Para instalar sus dependencias:

```bash
cd pokemon-backend
npm install
```

Para ejecutarlo localmente:

```bash
node index.js
```

El microservicio utiliza una variable de entorno llamada:

```text
DATABASE_URL
```

Esta variable contiene la cadena de conexión de PostgreSQL y no debe subirse al repositorio.

### Servicio desplegado

El microservicio está desplegado en Render:

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

La documentación del microservicio está disponible en:

```text
https://pokemon-backend-rfz3.onrender.com/api-docs
```

## 7. Base de datos no relacional — MongoDB

La información de los personajes de Dragon Ball se almacena en MongoDB Atlas.

La base de datos utilizada es:

```text
pokeanime
```

La colección utilizada es:

```text
characters
```

Los campos almacenados son:

- `id`
- `name`
- `race`
- `gender`
- `image`

La colección contiene 10 personajes de Dragon Ball.

## 8. Microservicio de Dragon Ball

El microservicio está desarrollado en:

- Python
- Flask
- PyMongo
- Flasgger
- python-dotenv
- Gunicorn

El código se encuentra en:

```text
dragonball-python/
```

Para instalar las dependencias:

```bash
cd dragonball-python
pip install -r requirements.txt
```

Para ejecutarlo localmente:

```bash
python app.py
```

El microservicio utiliza una variable de entorno llamada:

```text
MONGO_URI
```

Esta variable contiene la cadena de conexión de MongoDB Atlas y no debe subirse al repositorio.

### Servicio desplegado

El microservicio está desplegado en Render:

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

La documentación del microservicio está disponible en:

```text
https://dragonball-python-bpao.onrender.com/apidocs/
```

## 9. API pública utilizada

Para obtener información de los personajes de Dragon Ball se utilizó la API pública:

```text
https://dragonball-api.com/api/characters
```

Los primeros 10 personajes utilizados para la base de datos son:

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

La información utilizada para la aplicación se almacena en MongoDB y es consultada mediante el microservicio Python.

## 10. Ejecutar Expo

Desde la raíz del proyecto:

```bash
npx expo start
```

También se puede utilizar:

```bash
npm start
```

Si se utiliza un dispositivo físico:

1. Instalar Expo Go.
2. Ejecutar `npx expo start`.
3. Escanear el código QR mostrado por Expo.

## 11. Pantallas de la aplicación

### Inicio

Permite buscar un Pokémon por nombre y visualizar su imagen.

### Info Pokémon

Muestra información del Pokémon encontrado:

- ID
- Nombre
- Altura
- Peso
- Imagen

### Character

Permite buscar un personaje de Dragon Ball por nombre y muestra:

- Nombre
- Imagen
- Raza
- Género

### Info Dragon Ball

Muestra la información almacenada del personaje:

- ID
- Nombre
- Raza
- Género
- Imagen

## 12. Contextos utilizados

El frontend utiliza dos Context para manejar los datos provenientes de los microservicios.

### PokemonContext

Se encarga de:

- Realizar la búsqueda del Pokémon.
- Comunicarse con el microservicio Node.js.
- Mantener el Pokémon encontrado.
- Manejar el estado de carga.
- Manejar errores.

### DragonBallContext

Se encarga de:

- Realizar la búsqueda del personaje.
- Comunicarse con el microservicio Python.
- Mantener el personaje encontrado.
- Manejar el estado de carga.
- Manejar errores.

## 13. Dependencias

Las dependencias del frontend se encuentran en:

```text
package.json
```

Las dependencias del microservicio Pokémon se encuentran en:

```text
pokemon-backend/package.json
```

Las dependencias del microservicio Dragon Ball se encuentran en:

```text
dragonball-python/requirements.txt
```

Para instalar las dependencias se debe ejecutar `npm install` o `pip install -r requirements.txt` dentro de la respectiva carpeta.

## 14. Variables de entorno

Las variables de entorno contienen información privada para conectarse a las bases de datos.

### Pokémon

```text
DATABASE_URL
```

Se encuentra configurada en el microservicio Node.js.

### Dragon Ball

```text
MONGO_URI
```

Se encuentra configurada en el microservicio Python.

Estas variables no deben publicarse en GitHub.

## 15. Archivos que no deben subirse al repositorio

No se deben incluir archivos o carpetas con información privada o dependencias instaladas, por ejemplo:

```text
node_modules/
.venv/
.env
```

El archivo `.gitignore` debe excluir estos elementos.

## 16. Flujo general de la aplicación

### Pokémon

```text
Usuario
   ↓
Aplicación Expo
   ↓
PokemonContext
   ↓
Microservicio Node.js
   ↓
PostgreSQL / Neon
   ↓
Datos del Pokémon
   ↓
Aplicación Expo
```

### Dragon Ball

```text
Usuario
   ↓
Aplicación Expo
   ↓
DragonBallContext
   ↓
Microservicio Python
   ↓
MongoDB Atlas
   ↓
Datos del personaje
   ↓
Aplicación Expo
```

## 17. Servicios desplegados

### Microservicio Pokémon

```text
https://pokemon-backend-rfz3.onrender.com
```

Swagger:

```text
https://pokemon-backend-rfz3.onrender.com/api-docs
```

### Microservicio Dragon Ball

```text
https://dragonball-python-bpao.onrender.com
```

Swagger:

```text
https://dragonball-python-bpao.onrender.com/apidocs/
```

## 18. Nota sobre ejecución local

Los microservicios pueden ejecutarse localmente para realizar pruebas y desarrollo.

Sin embargo, la aplicación Expo actualmente utiliza los microservicios desplegados en Render, por lo que no es necesario ejecutar los servidores locales para utilizar las funciones de búsqueda.

Las variables de conexión a PostgreSQL y MongoDB deben mantenerse privadas mediante archivos `.env` y variables de entorno de Render.