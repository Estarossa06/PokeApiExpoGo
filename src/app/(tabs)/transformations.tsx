import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useDragonBall } from '../../context/DragonBallContext';

export default function InformationCharacterScreen() {
  const { character } = useDragonBall();

  if (!character) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Busca un personaje desde Character
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() => router.replace('/character')}
        >
          <Text style={styles.backButtonText}>
            ← Volver a buscar
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>
        Información de {character.name}
      </Text>

      <View style={styles.imageCard}>
        <Image
          source={{ uri: character.image }}
          style={styles.characterImage}
          contentFit="contain"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Características
        </Text>

        <Text style={styles.infoText}>
          ID: {character.id}
        </Text>

        <Text style={styles.infoText}>
          Nombre: {character.name}
        </Text>

        <Text style={styles.infoText}>
          Raza: {character.race}
        </Text>

        <Text style={styles.infoText}>
          Género: {character.gender}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4F5',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#800020',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 40,
  },

  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
  },

  characterImage: {
    width: '100%',
    height: 250,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#800020',
    marginBottom: 12,
  },

  infoText: {
    fontSize: 16,
    color: '#25292e',
    marginBottom: 10,
  },

  emptyContainer: {
    flex: 1,
    backgroundColor: '#F7F4F5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  emptyText: {
    color: '#800020',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 26,
  },

  backButton: {
    marginTop: 20,
    backgroundColor: '#800020',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },

  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});