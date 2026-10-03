// Importamos el módulo HTTP nativo de Node.js.
// Este módulo nos permite crear un servidor web sin utilizar Express
// ni ningún otro framework.
const http = require('http');

// Importamos la clase URL de Node.js.
// Nos permite trabajar fácilmente con las rutas y query parameters.
const { URL } = require('url');

// Importamos fs para leer archivos del sistema.
const fs = require('fs');

// Importamos path para trabajar con rutas de archivos.
const path = require('path');

// Importamos dotenv para poder leer las variables de entorno
// almacenadas en nuestro archivo .env.
require('dotenv').config();

// Importamos MongoClient desde el driver oficial de MongoDB.
// Este objeto nos permite conectarnos y realizar consultas
// contra MongoDB Atlas.
const { MongoClient } = require('mongodb');

// Obtenemos la cadena de conexión que guardamos en .env.
// La variable MONGO_URI contiene la dirección de nuestro cluster.
const uri = process.env.MONGO_URI;

// Creamos el cliente que utilizará esa cadena para conectarse
// con MongoDB Atlas.
const client = new MongoClient(uri);

// Definimos el puerto donde funcionará nuestro microservicio
// mientras lo ejecutamos localmente.
const PORT = process.env.PORT || 3002;

// Obtenemos la ubicación donde está instalado swagger-ui-dist.
// Esta carpeta contiene los archivos HTML, CSS y JavaScript
// necesarios para mostrar la interfaz de Swagger UI.
const swaggerUiPath = require.resolve('swagger-ui-dist/index.html');

// Obtenemos la carpeta que contiene todos los archivos
// estáticos de Swagger UI.
const swaggerUiDirectory = path.dirname(swaggerUiPath);

// Definimos la ubicación de nuestro archivo OpenAPI.
// __dirname representa la carpeta actual del microservicio.
const openApiPath = path.join(__dirname, 'openapi.yaml');

// --------------------------------------------------
// CREACIÓN DEL SERVIDOR
// --------------------------------------------------

// Creamos el servidor HTTP utilizando exclusivamente
// las herramientas nativas de Node.js.
//
// Cada vez que llegue una petición, Node ejecutará esta función.
// req contiene la información de la petición recibida.
// res nos permite construir la respuesta que enviaremos al cliente.
const server = http.createServer(async (req, res) => {

  // Configuramos el encabezado Content-Type para indicar
  // que nuestras respuestas estarán en formato JSON.
  res.setHeader('Content-Type', 'application/json');

  // --------------------------------------------------
  // DOCUMENTACIÓN SWAGGER
  // --------------------------------------------------

  // Cuando el usuario entra a /api-docs,
  // mostramos nuestra propia página HTML que carga
  // Swagger UI y utiliza nuestro archivo openapi.yaml.
  if (req.url === '/api-docs') {

    // HTML personalizado para Swagger UI.
    //
    // SwaggerUIBundle es el componente que construye
    // visualmente la documentación de nuestra API.
    const html = `
<!DOCTYPE html>
<html lang="es">

<head>

  <meta charset="UTF-8">

  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>API de Profesores UNINPAHU</title>

  <!-- Hoja de estilos de Swagger UI -->
  <link
    rel="stylesheet"
    type="text/css"
    href="/swagger-ui/swagger-ui.css"
  >

</head>

<body>

  <!-- Aquí Swagger UI colocará toda la documentación -->
  <div id="swagger-ui"></div>

  <!-- Librería principal de Swagger UI -->
  <script src="/swagger-ui/swagger-ui-bundle.js"></script>

  <!-- Configuración de Swagger UI -->
  <script>

    window.onload = function () {

      window.ui = SwaggerUIBundle({

        // Indicamos dónde está nuestra documentación OpenAPI.
        url: '/openapi.yaml',

        // Elemento HTML donde se mostrará Swagger.
        dom_id: '#swagger-ui',

        // Permite probar los endpoints directamente
        // desde la interfaz de Swagger.
        tryItOutEnabled: true,

        // Permite expandir y contraer las secciones.
        docExpansion: 'list'

      });

    };

  </script>

</body>

</html>
`;

    // Indicamos que estamos enviando HTML.
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8'
    });

    // Enviamos nuestra página al navegador.
    res.end(html);

    return;
  }

  // --------------------------------------------------
  // ARCHIVO OPENAPI
  // --------------------------------------------------

  // Esta ruta permite que Swagger UI pueda obtener
  // la definición de nuestra API.
  if (req.url === '/openapi.yaml') {

    try {

      // Leemos nuestro archivo openapi.yaml.
      const openApiDocument = fs.readFileSync(
        openApiPath,
        'utf8'
      );

      // Indicamos que estamos enviando un archivo YAML.
      res.writeHead(200, {
        'Content-Type': 'text/yaml'
      });

      // Enviamos el contenido del archivo.
      res.end(openApiDocument);

    } catch (error) {

      console.error(
        'Error leyendo openapi.yaml:',
        error.message
      );

      res.writeHead(500, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        error: 'No se pudo cargar la documentación OpenAPI'
      }));
    }

    return;
  }

  // --------------------------------------------------
  // ARCHIVOS ESTÁTICOS DE SWAGGER UI
  // --------------------------------------------------

  // Swagger UI necesita varios archivos externos,
  // principalmente JavaScript y CSS.
  //
  // Esta ruta permite que nuestro servidor Node.js
  // entregue esos archivos al navegador.
  if (req.url.startsWith('/swagger-ui/')) {

    // Obtenemos solamente el nombre del archivo solicitado.
    //
    // Ejemplo:
    //
    // /swagger-ui/swagger-ui.css
    //
    // se convierte en:
    //
    // swagger-ui.css
    const fileName = req.url.replace('/swagger-ui/', '');

    // Construimos la ruta completa del archivo
    // dentro de la instalación de swagger-ui-dist.
    const filePath = path.join(
      swaggerUiDirectory,
      fileName
    );

    try {

      // Leemos el archivo solicitado.
      const file = fs.readFileSync(filePath);

      // Determinamos el tipo de contenido que debemos
      // enviar según la extensión del archivo.
      let contentType = 'application/octet-stream';

      if (fileName.endsWith('.css')) {
        contentType = 'text/css';
      }

      if (fileName.endsWith('.js')) {
        contentType = 'application/javascript';
      }

      if (fileName.endsWith('.png')) {
        contentType = 'image/png';
      }

      if (fileName.endsWith('.svg')) {
        contentType = 'image/svg+xml';
      }

      // Enviamos el archivo al navegador.
      res.writeHead(200, {
        'Content-Type': contentType
      });

      res.end(file);

    } catch (error) {

      console.error(
        'Error cargando archivo Swagger:',
        error.message
      );

      res.writeHead(404, {
        'Content-Type': 'text/plain'
      });

      res.end('Archivo Swagger no encontrado');
    }

    return;
  }

  // --------------------------------------------------
  // API DE PROFESORES
  // --------------------------------------------------

  // Comprobamos que la petición utilice el método GET.
  if (req.method === 'GET') {

    // Convertimos la URL recibida en un objeto URL de JavaScript.
    // Esto nos permite separar la ruta de los query parameters.
    //
    // Por ejemplo:
    //
    // /api/profesores?id=3
    //
    // se separa en:
    //
    // pathname → /api/profesores
    // id       → 3
    const url = new URL(
      req.url,
      `http://${req.headers.host}`
    );

    // Obtenemos solamente la parte de la URL correspondiente
    // a la ruta.
    const pathname = url.pathname;

    // Comprobamos que la ruta solicitada sea
    // /api/profesores.
    if (pathname === '/api/profesores') {

      try {

        // Seleccionamos la base de datos.
        const db = client.db('pokeanime');

        // Seleccionamos la colección de profesores.
        const profesores = db.collection('profesores');

        // --------------------------------------------------
        // OBTENER QUERY PARAMETERS
        // --------------------------------------------------

        // Obtenemos los query parameters.
        //
        // Si la URL es:
        //
        // /api/profesores?id=3
        //
        // id tendrá el valor "3".
        //
        // Si no existe:
        //
        // /api/profesores
        //
        // id será null.
        const id = url.searchParams.get('id');

        // De la misma manera obtenemos el parámetro nombre.
        //
        // Ejemplo:
        //
        // /api/profesores?nombre=Omar
        //
        // nombre tendrá el valor "Omar".
        const nombre = url.searchParams.get('nombre');

        // --------------------------------------------------
        // BUSCAR POR ID
        // --------------------------------------------------

        if (id !== null) {

          // Convertimos el ID recibido desde la URL
          // de texto a número.
          const idNumero = Number(id);

          // Verificamos que realmente sea un número válido.
          if (Number.isNaN(idNumero)) {

            res.statusCode = 400;

            res.end(JSON.stringify({
              error: 'El parámetro id debe ser un número'
            }));

            return;
          }

          // Buscamos en MongoDB el profesor cuyo campo
          // id coincida con el número recibido.
          const profesor = await profesores.findOne(
            {
              id: idNumero
            },
            {
              projection: {
                _id: 0
              }
            }
          );

          // Si MongoDB no encontró ningún documento,
          // devolvemos 404.
          if (!profesor) {

            res.statusCode = 404;

            res.end(JSON.stringify({
              error: 'Profesor no encontrado'
            }));

            return;
          }

          // El profesor existe.
          res.statusCode = 200;

          res.end(JSON.stringify(profesor));

          return;
        }

        // --------------------------------------------------
        // BUSCAR POR NOMBRE
        // --------------------------------------------------

        if (nombre !== null) {

          // Eliminamos espacios innecesarios al principio
          // y al final del nombre recibido.
          const nombreBusqueda = nombre.trim();

          // Verificamos que el usuario realmente haya
          // proporcionado un nombre.
          if (!nombreBusqueda) {

            res.statusCode = 400;

            res.end(JSON.stringify({
              error: 'El parámetro nombre no puede estar vacío'
            }));

            return;
          }

          // Buscamos un profesor cuyo nombre contenga
          // el texto recibido.
          //
          // $regex permite realizar una búsqueda parcial.
          //
          // $options: 'i' hace que la búsqueda ignore
          // mayúsculas y minúsculas.
          const profesor = await profesores.findOne(
            {
              nombre: {
                $regex: nombreBusqueda,
                $options: 'i'
              }
            },
            {
              projection: {
                _id: 0
              }
            }
          );

          // Si no existe ningún profesor con ese nombre,
          // devolvemos 404.
          if (!profesor) {

            res.statusCode = 404;

            res.end(JSON.stringify({
              error: 'Profesor no encontrado'
            }));

            return;
          }

          // Devolvemos el profesor encontrado.
          res.statusCode = 200;

          res.end(JSON.stringify(profesor));

          return;
        }

        // --------------------------------------------------
        // OBTENER TODOS LOS PROFESORES
        // --------------------------------------------------

        // Si no recibimos ni id ni nombre,
        // devolvemos todos los profesores.
        const resultado = await profesores
          .find(
            {},
            {
              projection: {
                _id: 0
              }
            }
          )
          .toArray();

        res.statusCode = 200;

        res.end(JSON.stringify(resultado));

      } catch (error) {

        // Mostramos el error real en la consola
        // para facilitar la depuración.
        console.error(
          'Error consultando MongoDB:',
          error
        );

        // Informamos al cliente que ocurrió un error
        // interno en el servidor.
        res.statusCode = 500;

        res.end(JSON.stringify({
          error: 'Error interno del servidor'
        }));
      }

      return;
    }
  }

  // --------------------------------------------------
  // RUTA NO ENCONTRADA
  // --------------------------------------------------

  // Si la petición no coincide con ninguna ruta que
  // hayamos definido, devolvemos el código 404.
  //
  // 404 significa que el recurso solicitado no existe.
  res.statusCode = 404;

  res.end(JSON.stringify({
    error: 'Ruta no encontrada'
  }));
});

// --------------------------------------------------
// INICIO DEL SERVIDOR
// --------------------------------------------------

// Antes de comenzar a recibir peticiones, establecemos
// la conexión con MongoDB Atlas.
async function iniciarServidor() {

  try {

    // Intentamos conectarnos al cluster de MongoDB.
    await client.connect();

    console.log(
      '✅ Conectado correctamente a MongoDB Atlas'
    );

    // Una vez establecida la conexión, iniciamos
    // nuestro servidor HTTP.
    server.listen(PORT, () => {

      console.log(
        `🚀 Microservicio ejecutándose en http://localhost:${PORT}`
      );

    });

  } catch (error) {

    // Si no conseguimos conectarnos a MongoDB,
    // mostramos el error y no iniciamos el servidor.
    console.error(
      '❌ Error conectando con MongoDB:',
      error.message
    );
  }
}

// Ejecutamos la función que inicia la aplicación.
iniciarServidor();