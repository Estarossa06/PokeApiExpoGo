import { Stack } from 'expo-router';
import { PokemonProvider } from '../context/PokemonContext';
import { DragonBallProvider } from '../context/DragonBallContext';
import { ProfesoresProvider } from '../context/ProfesoresContext';

export default function RootLayout() {
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