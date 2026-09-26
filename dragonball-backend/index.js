import express from 'express';

const app = express();

const PORT = 3001;

app.use(express.json());

app.get('/api/dragonball/:name', async (req, res) => {
  try {
    const { name } = req.params;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Escribe el nombre de un personaje'
      });
    }

    // Obtener la lista de personajes
    const charactersResponse = await fetch(
      'https://dragonball-api.com/api/characters'
    );

    if (!charactersResponse.ok) {
      return res.status(500).json({
        error: 'No se pudo consultar Dragon Ball API'
      });
    }

    const charactersData = await charactersResponse.json();

    // Buscar el personaje por nombre
    const character = charactersData.items.find(
      (item) =>
        item.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (!character) {
      return res.status(404).json({
        error: 'Personaje no encontrado'
      });
    }

    // Obtener los detalles del personaje y sus transformaciones
    const characterResponse = await fetch(
      `https://dragonball-api.com/api/characters/${character.id}`
    );

    if (!characterResponse.ok) {
      return res.status(500).json({
        error: 'No se pudo obtener la información del personaje'
      });
    }

    const characterData = await characterResponse.json();

    return res.status(200).json({
      name: characterData.name,
      image: characterData.image,
      race: characterData.race,
      description: characterData.description,
      transformations: characterData.transformations.map(
        (transformation) => ({
          name: transformation.name,
          image: transformation.image,
          ki: transformation.ki
        })
      )
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Error de red en el servidor local',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Dragon Ball backend funcionando en http://localhost:${PORT}`
  );
});