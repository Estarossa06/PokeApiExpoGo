// Servidor HTTP nativo
const http = require('http');

// Manejo de URL y query params
const { URL } = require('url');

// Archivos y rutas
const fs = require('fs');
const path = require('path');

// Variables de entorno
require('dotenv').config();

// MongoDB
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// Puerto local o asignado por Render
const PORT = process.env.PORT || 3002;

// Archivos necesarios para Swagger
const swaggerUiPath = require.resolve('swagger-ui-dist/index.html');
const swaggerUiDirectory = path.dirname(swaggerUiPath);
const openApiPath = path.join(__dirname, 'openapi.yaml');


// ==================================================
// SERVIDOR
// ==================================================

const server = http.createServer(async (req, res) => {

  res.setHeader('Content-Type', 'application/json');

    // Obtener la ruta sin query params
  const url = new URL(
    req.url,
    `http://${req.headers.host}`
  );

  const pathname = url.pathname;


  // ==================================================
  // SWAGGER
  // ==================================================

  if (pathname === '/api-docs') {

    const html = `
<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>API de Profesores UNINPAHU</title>

  <link
    rel="stylesheet"
    type="text/css"
    href="/swagger-ui/swagger-ui.css"
  >
</head>

<body>

  <div id="swagger-ui"></div>

  <script src="/swagger-ui/swagger-ui-bundle.js"></script>

  <script>

    window.onload = function () {

      window.ui = SwaggerUIBundle({

        url: '/openapi.yaml',

        dom_id: '#swagger-ui',

        tryItOutEnabled: true,

        docExpansion: 'list'

      });

    };

  </script>

</body>

</html>
`;

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8'
    });

    res.end(html);

    return;
  }


  // ==================================================
  // ARCHIVO OPENAPI
  // ==================================================

  if (pathname === '/openapi.yaml') {

    try {

      const openApiDocument = fs.readFileSync(
        openApiPath,
        'utf8'
      );

      res.writeHead(200, {
        'Content-Type': 'text/yaml'
      });

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


  // ==================================================
  // ARCHIVOS DE SWAGGER UI
  // ==================================================

  if (req.url.startsWith('/swagger-ui/')) {

    const fileName = req.url.replace('/swagger-ui/', '');

    const filePath = path.join(
      swaggerUiDirectory,
      fileName
    );

    try {

      const file = fs.readFileSync(filePath);

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


  // ==================================================
  // API DE PROFESORES
  // ==================================================

  if (req.method === 'GET') {


    // Ruta principal de profesores
    if (pathname === '/api/profesores') {

      try {

        // Base de datos y colección
        const db = client.db('pokeanime');
        const profesores = db.collection('profesores');


        // Query params
        const id = url.searchParams.get('id');
        const nombre = url.searchParams.get('nombre');


        // ==================================================
        // BUSCAR POR ID
        // ==================================================

        if (id !== null) {

          const idNumero = Number(id);

          // Validar que ID sea numérico
          if (Number.isNaN(idNumero)) {

            res.statusCode = 400;

            res.end(JSON.stringify({
              error: 'El parámetro id debe ser un número'
            }));

            return;
          }


          // Consulta por ID
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


          // Profesor no encontrado
          if (!profesor) {

            res.statusCode = 404;

            res.end(JSON.stringify({
              error: 'Profesor no encontrado'
            }));

            return;
          }


          // Respuesta exitosa
          res.statusCode = 200;

          res.end(JSON.stringify(profesor));

          return;
        }


        // ==================================================
        // BUSCAR POR NOMBRE
        // ==================================================

        if (nombre !== null) {

          const nombreBusqueda = nombre.trim();

          // Validar nombre vacío
          if (!nombreBusqueda) {

            res.statusCode = 400;

            res.end(JSON.stringify({
              error: 'El parámetro nombre no puede estar vacío'
            }));

            return;
          }


          // Búsqueda parcial por nombre
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


          // Profesor no encontrado
          if (!profesor) {

            res.statusCode = 404;

            res.end(JSON.stringify({
              error: 'Profesor no encontrado'
            }));

            return;
          }


          // Respuesta exitosa
          res.statusCode = 200;

          res.end(JSON.stringify(profesor));

          return;
        }


        // ==================================================
        // OBTENER TODOS LOS PROFESORES
        // ==================================================

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

        // Error de MongoDB o del servidor
        console.error(
          'Error consultando MongoDB:',
          error
        );

        res.statusCode = 500;

        res.end(JSON.stringify({
          error: 'Error interno del servidor'
        }));
      }

      return;
    }
  }


  // ==================================================
  // RUTA NO ENCONTRADA
  // ==================================================

  res.statusCode = 404;

  res.end(JSON.stringify({
    error: 'Ruta no encontrada'
  }));

});


// ==================================================
// INICIAR SERVIDOR
// ==================================================

async function iniciarServidor() {

  try {

    // Conectar con MongoDB
    await client.connect();

    console.log(
      '✅ Conectado correctamente a MongoDB Atlas'
    );


    // Iniciar servidor HTTP
    server.listen(PORT, () => {

      console.log(
        `🚀 Microservicio ejecutándose en http://localhost:${PORT}`
      );

    });

  } catch (error) {

    console.error(
      '❌ Error conectando con MongoDB:',
      error.message
    );

  }
}


// Iniciar aplicación
iniciarServidor();