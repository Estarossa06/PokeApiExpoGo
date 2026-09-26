import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePokemon } from '../../context/PokemonContext';

export default function InformationScreen() {
  const { pokemon } = usePokemon();

  if (!pokemon) {
    return (
      <View
       style={[
        styles.container,
       {
         justifyContent: 'center',
         alignItems: 'center',
         paddingHorizontal: 30,
       },
     ]}
     >
      <Text style={styles.text}>
        Busca un Pokémon desde Inicio
      </Text>

      <Pressable
        style={styles.backButton}
        onPress={() => router.replace('/(tabs)')}
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
        {pokemon.name.toUpperCase()}
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Características</Text>

        <Text style={styles.infoText}>
          Altura: {(pokemon.height / 10).toFixed(1)} m
        </Text>

        <Text style={styles.infoText}>
          Peso: {(pokemon.weight / 10).toFixed(1)} kg
        </Text>

        <Text style={styles.infoText}>
          Especie: {pokemon.species}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Estadisticas</Text>

        {pokemon.stats.map((stat) => (
          <View key={stat.name} style={styles.row}>
            <Text style={styles.infoText}>
              {stat.name}
            </Text>

            <Text style={styles.statValue}>
              {stat.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Movimientos</Text>

        {pokemon.moves.map((move, index) => (
          <View key={`${move}-${index}`} style={styles.moveRow}>
            <Text style={styles.moveNumber}>
              {index + 1}
            </Text>

            <Text style={styles.infoText}>
              {move}
            </Text>
          </View>
        ))}
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4F1720',
    textAlign: 'center',
    marginBottom: 20,
    margin: 40,
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
    color: '#4F1720',
    marginBottom: 12,
  },

  infoText: {
    fontSize: 16,
    color: '#25292e',
    marginBottom: 8,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5DDE0',
  },

  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F1720',
  },

  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },

  moveNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4F1720',
    color: '#FFFFFF',
    textAlign: 'center',
    textAlignVertical: 'center',
    marginRight: 10,
    fontWeight: 'bold',
    paddingBlockStart: 7
  },

  text: {
    color: '#4F1720',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
    margin: 70,
},

  backButton: {
    marginTop: 20,
    backgroundColor: '#4F1720',
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