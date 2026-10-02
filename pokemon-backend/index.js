import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const app = express(); 

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pokémon API',
      version: '1.0.0',
      description: 'Microservicio de Pokémon conectado a PostgreSQL'
    }
  },
  apis: ['./index.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = 3000;

app.use(cors());
app.use(express.json());

/**
 * @swagger
 * /api/pokemon/{name}:
 *   get:
 *     summary: Obtener un Pokémon por nombre
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del Pokémon
 *     responses:
 *       200:
 *         description: Pokémon encontrado
 *       404:
 *         description: Pokémon no encontrado
 *       500:
 *         description: Error del servidor
 */

app.get('/api/pokemon/:name', async (req, res) => { 
  try {
    const { name } = req.params;

    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ error: 'Escribe el nombre de un Pokémon' });
    }

    const cleanName = name.toLowerCase().trim();

    console.log(`🔍 Buscando a: ${cleanName}`);

    // Consumimos PokeAPI utilizando fetch 
    //endpoint conexion e informacion
  const result = await pool.query(
  'SELECT id, name, height, weight, image FROM pokemons WHERE LOWER(name) = LOWER($1)',
  [cleanName]
   );

  if (result.rows.length === 0) {
     return res.status(404).json({
       error: 'Pokémon no encontrado en la base de datos'
    });
  }

  const pokemon = result.rows[0];

  return res.status(200).json(pokemon);  

    } catch (error) {
      console.error('🚨 Error en el servidor:', error.message);

      return res.status(500).json({
        error: 'Error de red en el servidor local',
        message: error.message
      });
    }
  });

pool.query('SELECT NOW()')
.then(() => {
  console.log('✅ Conectado correctamente a PostgreSQL');
})

.catch((error) => {
  console.error('❌ Error conectando a PostgreSQL:', error.message);
 });

app.listen(PORT, () => {
  console.log(
    `🚀 Servidor Pokémon encendido en: http://localhost:${PORT}`
  );
});
