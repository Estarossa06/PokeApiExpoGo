import { Stack } from 'expo-router';
import { PokemonProvider } from '../context/PokemonContext';

export default function RootLayout() {
  return (
    <PokemonProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </PokemonProvider>
  );
}