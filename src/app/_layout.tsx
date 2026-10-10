
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { PokemonProvider } from '../context/PokemonContext';
import { DragonBallProvider } from '../context/DragonBallContext';
import { ProfesoresProvider } from '../context/ProfesoresContext';
import { inicializarDB } from '../database/profesoresDB';

export default function RootLayout() {
  const [dbLista, setDbLista] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    inicializarDB()
      .then(() => setDbLista(true))
      .catch((error) => {
        console.error('Error inicializando SQLite:', error);
        setDbError('No se pudo inicializar la base de datos local.');
      });
  }, []);

  if (dbError) {
    return null;
  }

  if (!dbLista) {
    return null;
  }

  return (
    <PokemonProvider>
      <DragonBallProvider>
        <ProfesoresProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </ProfesoresProvider>
      </DragonBallProvider>
    </PokemonProvider>
  );
}
