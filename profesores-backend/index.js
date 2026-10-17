// Servidor HTTP nativo
const http = require('http');

// Manejo de URL y query params
const { URL } = require('url');

// Archivos y rutas
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Lee y convierte en JSON los datos enviados en una petición
function obtenerBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (parte) => {
      body += parte;
    });

    req.on('end', () => {
      try {
        const datos = JSON.parse(body);
        resolve(datos);
      } catch (error) {
        reject(new Error('El cuerpo de la petición no contiene JSON válido'));
      }
    });

    req.on('error', (error) => {
      reject(error);
    });
  });
}

// Normaliza un texto para facilitar las búsquedas
function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function claveUnicaProfesor(profesor) {
  const campos = [
    profesor.nombre,
    profesor.formacion,
    profesor.profesion,
    profesor.cargo,
    profesor.area,
  ].map(normalizarTexto);

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(campos), 'utf8')
    .digest('hex');
}

function profesorPublico(profesor) {
  if (!profesor) return profesor;
  const { _id, dedupKey, ...publico } = profesor;
  return publico;
}

async function prepararDeduplicacion(db) {
  const profesores = db.collection('profesores');
  const documentos = await profesores.find({}).toArray();
  const grupos = new Map();

  for (const profesor of documentos) {
    const camposRequeridos = [
      profesor.nombre,
      profesor.formacion,
      profesor.profesion,
      profesor.cargo,
      profesor.area,
    ];
    if (camposRequeridos.some((campo) => typeof campo !== 'string' || !campo.trim())) {
      continue;
    }

    const clave = claveUnicaProfesor(profesor);
    const grupo = grupos.get(clave) ?? [];
    grupo.push(profesor);
    grupos.set(clave, grupo);
  }

  for (const [dedupKey, grupo] of grupos) {
    grupo.sort((a, b) => a.id - b.id);
    const canonico = grupo[0];
    const fotoPreferida = canonico.foto || grupo.find((p) => p.foto)?.foto || '';

    await profesores.updateOne(
      { _id: canonico._id },
      { $set: { dedupKey, foto: fotoPreferida } }
    );

    if (grupo.length > 1) {
      await profesores.deleteMany({
        _id: { $in: grupo.slice(1).map((profesor) => profesor._id) },
      });
      console.warn(
        `Deduplicación inicial: se conservaron ${canonico.id} y se quitaron ${grupo.length - 1} duplicado(s)`
      );
    }
  }

  await profesores.createIndex(
    { dedupKey: 1 },
    { unique: true, sparse: true, name: 'uq_profesores_dedup_key' }
  );

  const ultimo = await profesores.findOne(
    {},
    { sort: { id: -1 }, projection: { id: 1 } }
  );
  await db.collection('contadores').updateOne(
    { _id: 'profesores' },
    { $max: { secuencia: ultimo?.id ?? 0 } },
    { upsert: true }
  );
}


const server = http.createServer(async (req, res) => {

    // Permitir peticiones desde Expo Web en desarrollo.
  const origen = req.headers.origin;
  const origenesPermitidos = [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
  ];

  if (origen && origenesPermitidos.includes(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );

  // Responder las solicitudes preliminares del navegador.
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

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
  // CREAR PROFESOR
  // ==================================================

  if (req.method === 'POST' && pathname === '/api/profesores') {

    try {

      // Leer los datos enviados en el cuerpo de la petición
      const datos = await obtenerBody(req);

      // Campos que debe tener un profesor
      const camposRequeridos = [
        'nombre',
        'foto',
        'formacion',
        'profesion',
        'cargo',
        'area'
      ];

      // Verificar que todos los campos estén presentes
      for (const campo of camposRequeridos) {
        if (
          typeof datos[campo] !== 'string' ||
          !datos[campo].trim()
        ) {
          res.statusCode = 400;

          res.end(JSON.stringify({
            error: `El campo ${campo} es obligatorio`
          }));

          return;
        }
      }

      // Validar que el nombre tenga al menos 3 caracteres.
      if (datos.nombre.trim().length < 3) {
        res.statusCode = 400;

        res.end(JSON.stringify({
          error: 'El nombre debe tener al menos 3 caracteres'
        }));

        return;
      }

      // Obtener la base de datos y la colección
      const db = client.db('pokeanime');
      const profesores = db.collection('profesores');
      const dedupKey = claveUnicaProfesor(datos);
      const existente = await profesores.findOne({ dedupKey });

      if (existente) {
        res.statusCode = 200;
        res.end(JSON.stringify(profesorPublico(existente)));
        return;
      }

      // Buscar el profesor con el ID más alto
      // Generar el siguiente ID disponible
      const contador = await db.collection('contadores').findOneAndUpdate(
        { _id: 'profesores' },
        { $inc: { secuencia: 1 } },
        { upsert: true, returnDocument: 'after' }
      );
      const nuevoId = contador.secuencia;

      // Crear el nuevo documento
      const nuevoProfesor = {
        id: nuevoId,
        nombre: datos.nombre.trim(),
        foto: datos.foto.trim(),
        formacion: datos.formacion.trim(),
        profesion: datos.profesion.trim(),
        cargo: datos.cargo.trim(),
        area: datos.area.trim(),
        dedupKey,
      };

      // Insertar el profesor en MongoDB
      try {
        await profesores.insertOne(nuevoProfesor);
      } catch (error) {
        if (error.code === 11000) {
          const ganador = await profesores.findOne({ dedupKey });
          if (ganador) {
            res.statusCode = 200;
            res.end(JSON.stringify(profesorPublico(ganador)));
            return;
          }
        }
        throw error;
      }

      // Responder con el profesor creado
      res.statusCode = 201;

      res.end(JSON.stringify(profesorPublico(nuevoProfesor)));

    } catch (error) {

      console.error(
        'Error creando profesor:',
        error
      );

      res.statusCode = 500;

      res.end(JSON.stringify({
        error: 'Error interno del servidor'
      }));
    }

    return;
  }

  // ==================================================
  // BUSCAR PROFESOR
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
                _id: 0,
                dedupKey: 0
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

          res.end(JSON.stringify(profesorPublico(profesor)));

          return;
        }


        // ==================================================
        // BUSCAR POR NOMBRE
        // ==================================================

        if (nombre !== null) {

          const nombreBusqueda = nombre.trim();

          // Validar que el nombre tenga al menos 3 caracteres
          if (nombreBusqueda.length < 3) {

            res.statusCode = 400;

            res.end(JSON.stringify({
              error: 'El nombre debe tener al menos 3 caracteres'
            }));

            return;
          }

          // Buscar todos los profesores que coincidan con el nombre
          const todosLosProfesores = await profesores
            .find(
              {},
              {
                projection: {
                  _id: 0,
                  dedupKey: 0
                }
              }
            )
            .toArray();

          // Normalizar el texto que escribió el usuario
          const nombreNormalizado = normalizarTexto(nombreBusqueda);

          // Buscar coincidencias ignorando mayúsculas y tildes
          const resultados = todosLosProfesores.filter((profesor) =>
            normalizarTexto(profesor.nombre).includes(nombreNormalizado)
          );

          // No se encontraron profesores
          if (resultados.length === 0) {

            res.statusCode = 404;

            res.end(JSON.stringify({
              error: 'No se encontraron profesores'
            }));

            return;
          }

          // Devolver todos los profesores encontrados
          res.statusCode = 200;

          res.end(JSON.stringify(resultados.map(profesorPublico)));

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
                _id: 0,
                dedupKey: 0
              }
            }
          )
          .toArray();

        res.statusCode = 200;

        res.end(JSON.stringify(resultado.map(profesorPublico)));

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
  // ACTUALIZAR PROFESOR
  // ==================================================

  if (req.method === 'PUT' && pathname === '/api/profesores') {

    try {

      // Leer los datos enviados en el cuerpo de la petición
      const datos = await obtenerBody(req);

      // Validar que exista un ID numérico
      if (
        datos.id === undefined ||
        Number.isNaN(Number(datos.id))
      ) {

        res.statusCode = 400;

        res.end(JSON.stringify({
          error: 'El campo id debe ser un número'
        }));

        return;
      }

      // Campos que debe tener el profesor
      const camposRequeridos = [
        'nombre',
        'foto',
        'formacion',
        'profesion',
        'cargo',
        'area'
      ];

      // Verificar que todos los campos estén presentes
      for (const campo of camposRequeridos) {

        if (
          typeof datos[campo] !== 'string' ||
          !datos[campo].trim()
        ) {

          res.statusCode = 400;

          res.end(JSON.stringify({
            error: `El campo ${campo} es obligatorio`
          }));

          return;
        }
      }

      // Validar que el nombre tenga al menos 3 caracteres.
      if (datos.nombre.trim().length < 3) {
        res.statusCode = 400;

        res.end(JSON.stringify({
          error: 'El nombre debe tener al menos 3 caracteres'
        }));

        return;
      }

      // Obtener la base de datos y la colección
      const db = client.db('pokeanime');
      const profesores = db.collection('profesores');

      const idNumero = Number(datos.id);

      // Buscar el profesor que queremos actualizar
      const profesorExistente = await profesores.findOne({
        id: idNumero
      });

      // Verificar que exista
      if (!profesorExistente) {

        res.statusCode = 404;

        res.end(JSON.stringify({
          error: 'Profesor no encontrado'
        }));

        return;
      }

      const dedupKey = claveUnicaProfesor(datos);
      const duplicado = await profesores.findOne({
        dedupKey,
        id: { $ne: idNumero }
      });

      if (duplicado) {
        res.statusCode = 409;
        res.end(JSON.stringify({
          error: 'Otro profesor ya tiene estos datos, excepto la foto'
        }));
        return;
      }

      // Datos actualizados
      const profesorActualizado = {
        id: idNumero,
        nombre: datos.nombre.trim(),
        foto: datos.foto.trim(),
        formacion: datos.formacion.trim(),
        profesion: datos.profesion.trim(),
        cargo: datos.cargo.trim(),
        area: datos.area.trim(),
        dedupKey
      };

      // Actualizar el documento en MongoDB
      await profesores.updateOne(
        {
          id: idNumero
        },
        {
          $set: profesorActualizado
        }
      );

      // Devolver el profesor actualizado
      res.statusCode = 200;

      res.end(JSON.stringify(profesorPublico(profesorActualizado)));

    } catch (error) {

      if (error.code === 11000) {
        res.statusCode = 409;
        res.end(JSON.stringify({
          error: 'Ya existe un profesor con los mismos datos, excepto la foto'
        }));
        return;
      }

      console.error(
        'Error actualizando profesor:',
        error
      );

      res.statusCode = 500;

      res.end(JSON.stringify({
        error: 'Error interno del servidor'
      }));
    }

    return;
  }

  // ==================================================
  // ELIMINAR PROFESOR
  // ==================================================

  if (req.method === 'DELETE' && pathname === '/api/profesores') {

    try {

      // Obtener el ID desde los parámetros de la URL
      const id = url.searchParams.get('id');

      // Validar que se haya enviado un ID
      if (id === null || id.trim() === '') {

        res.statusCode = 400;

        res.end(JSON.stringify({
          error: 'El parámetro id es obligatorio'
        }));

        return;
      }

      const idNumero = Number(id);

      // Validar que el ID sea numérico
      if (Number.isNaN(idNumero)) {

        res.statusCode = 400;

        res.end(JSON.stringify({
          error: 'El parámetro id debe ser un número'
        }));

        return;
      }

      // Obtener la base de datos y la colección
      const db = client.db('pokeanime');
      const profesores = db.collection('profesores');

      // Buscar y eliminar el profesor
      const resultado = await profesores.deleteOne({
        id: idNumero
      });

      // Verificar que el profesor existía
      if (resultado.deletedCount === 0) {

        res.statusCode = 404;

        res.end(JSON.stringify({
          error: 'Profesor no encontrado'
        }));

        return;
      }

      // Confirmar eliminación
      res.statusCode = 200;

      res.end(JSON.stringify({
        mensaje: 'Profesor eliminado correctamente'
      }));

    } catch (error) {

      console.error(
        'Error eliminando profesor:',
        error
      );

      res.statusCode = 500;

      res.end(JSON.stringify({
        error: 'Error interno del servidor'
      }));
    }

    return;
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

    await prepararDeduplicacion(client.db('pokeanime'));

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
