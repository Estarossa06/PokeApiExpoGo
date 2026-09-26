import { Stack } from 'expo-router';
import { PokemonProvider } from '../context/PokemonContext';
import { DragonBallProvider } from '../context/DragonBallContext';

export default function RootLayout() {
  return (
    <PokemonProvider>
      <DragonBallProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </DragonBallProvider>
    </PokemonProvider>
  );
}