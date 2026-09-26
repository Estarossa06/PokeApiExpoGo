import express from 'express';

const app = express();

const PORT = 3000;

app.use(express.json());

app.get('/api/pokemon/:name', async (req, res) => { //endpoint conexion e informacion
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
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${cleanName}`
    );

    // Si el Pokémon no existe
    if (response.status === 404) {
      return res
        .status(404)
        .json({ error: 'Pokémon no encontrado en PokeAPI' });
    }

    // Si ocurre otro error en PokeAPI
    if (!response.ok) {
      throw new Error(`PokeAPI respondió con estado ${response.status}`);
    }

    // Convertimos la respuesta a JSON
    const rawData = await response.json();

    // Devolvemos únicamente los datos necesarios
    return res.status(200).json({
  name: rawData.name,
  height: rawData.height,
  weight: rawData.weight,

  species: rawData.species?.name || 'Desconocida',

  sprites: {
    front_default: rawData.sprites?.front_default || null,
    back_default: rawData.sprites?.back_default || null,
    front_shiny: rawData.sprites?.front_shiny || null
  },

  stats: rawData.stats.map((stat) => ({ // simplifica la estructura de datos de la pokeAPI
    name: stat.stat.name,
    value: stat.base_stat
  })),

  moves: rawData.moves.map((move) => move.move.name)
});

  } catch (error) {
    console.error('🚨 Error en el servidor:', error.message);

    return res.status(500).json({
      error: 'Error de red en el servidor local',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `🚀 Servidor Pokémon encendido en: http://localhost:${PORT}`
  );
});