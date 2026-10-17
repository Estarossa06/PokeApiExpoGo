
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { DragonBallProvider } from '../context/DragonBallContext';
import { PokemonProvider } from '../context/PokemonContext';
import { ProfesoresProvider } from '../context/ProfesoresContext';
import { inicializarDB } from '../database/profesoresSQLite';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
    return (
      <View style={styles.statusContainer}>
        <Text style={styles.errorTitle}>No se pudo iniciar la aplicación</Text>
        <Text style={styles.errorMessage}>{dbError}</Text>
      </View>
    );
  }

  if (!dbLista) {
    return (
      <View style={styles.statusContainer}>
        <ActivityIndicator size="large" color="#800020" />
        <Text style={styles.loadingMessage}>Preparando la base de datos…</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PokemonProvider>
        <DragonBallProvider>
          <ProfesoresProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </ProfesoresProvider>
        </DragonBallProvider>
      </PokemonProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F7F4F5',
  },
  loadingMessage: {
    marginTop: 12,
    color: '#333333',
    textAlign: 'center',
  },
  errorTitle: {
    color: '#800020',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: 8,
    color: '#333333',
    textAlign: 'center',
  },
});
