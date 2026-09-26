import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { usePokemon } from "../../context/PokemonContext";

export default function Index() {
  // --------------------------------------------------
  // ESTADOS DE LA APLICACIÓN
  // --------------------------------------------------
  
  // Guarda el nombre escrito en el cuadro de búsqueda
  const [pokemonName, setPokemonName] = useState("");

  const { pokemon, loading, error, buscarPokemon } = usePokemon();

  // --------------------------------------------------
  // VISTA / INTERFAZ DE USUARIO (JSX)
  // --------------------------------------------------
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Contenedor del encabezado principal */}
      <View style={styles.header}>
        <Text style={styles.title}>Pokédex</Text>
        <Text style={styles.subtitle}>Busca información de tu Pokémon</Text>
      </View>

      {/* Contenedor del buscador (Input + Botón) */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nombre del Pokémon"
          placeholderTextColor="#8A7A7D"
          value={pokemonName}
          onChangeText={setPokemonName}
          autoCapitalize="none"
        />

        <Pressable style={styles.searchButton} onPress={() => buscarPokemon(pokemonName)}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </Pressable>
      </View>

      {loading && (
        <ActivityIndicator
          size="large"
          color="#4F1720"
        />
      )}

      {/* Renderizado condicional: muestra la tarjeta de error si existe uno */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Renderizado condicional: muestra la información si hay datos del Pokémon */}

{pokemon && (
  <View style={styles.resultContainer}>

    <Text style={styles.pokemonName}>
      {pokemon.name.toUpperCase()}
    </Text>

    <View style={styles.imageCard}>
      <Image
        source={{ uri: pokemon.sprites.front_default || undefined }}
        style={styles.pokemonImage}
        contentFit="contain"
      />
    </View>

    <View style={styles.smallImagesRow}>

      <View style={styles.smallImageCard}>
        <Image
          source={{ uri: pokemon.sprites.back_default || undefined }}
          style={styles.smallPokemonImage}
          contentFit="contain"
        />
      </View>

      <View style={styles.smallImageCard}>
        <Image
          source={{ uri: pokemon.sprites.front_shiny || undefined }}
          style={styles.smallPokemonImage}
          contentFit="contain"
        />
      </View>

    </View>

  </View>
)}
    </ScrollView>
  );
}

// ==================================================
// ESTILOS
// ==================================================

const styles = StyleSheet.create({

  // Fondo general de la aplicación.
  screen: {
    flex: 1,
    backgroundColor: "#F7F4F5",
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },


  // -----------------------------
  // ENCABEZADO
  // -----------------------------

  header: {
    marginTop: 25,
    marginBottom: 25,
  },

  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#4F1720",
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 16,
    color: "#75686B",
  },


  // -----------------------------
  // BUSCADOR
  // -----------------------------

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10, // espacio
    marginBottom: 20,
  },

  input: {
    flex: 1, // Proporcion
    height: 55,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D6C9CC",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#222222",
  },

  searchButton: {
    width: 55,
    height: 55,
    borderRadius: 14,
    backgroundColor: "#4F1720",
    alignItems: "center",
    justifyContent: "center",

    // Sombra en iOS.
    shadowColor: "#4F1720",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,

    // Sombra en Android.
    elevation: 4,
  },

  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 22, // tamaño de la letra
    fontWeight: "800", // grosor de la letra
  },


  // -----------------------------
  // ERROR
  // -----------------------------

  errorContainer: {
    backgroundColor: "#FBEAEA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 15, // Margen Inferior
  },

  errorText: {
    color: "#A32020",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },


  // -----------------------------
  // RESULTADO
  // -----------------------------

  resultContainer: {
    marginTop: 5,
  },

  pokemonName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#4F1720",
    textAlign: "center",
    marginBottom: 15,
  },


  // -----------------------------
  // IMAGEN
  // -----------------------------

  imageCard: {
    height: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,

    // Borde sutil.
    borderWidth: 1,
    borderColor: "#E5DDE0",

    // Sombra.
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  pokemonImage: {
    width: "85%",
    height: "85%",
  },

  smallImagesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  smallImageCard: {
    flex: 1,
    height: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  smallPokemonImage: {
    width: "100%",
    height: "100%",
  },


  // -----------------------------
  // SECCIONES
  // -----------------------------

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4F1720",
    marginBottom: 12,
  },


  // -----------------------------
  // CARACTERÍSTICAS
  // -----------------------------

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 25,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,

    borderWidth: 1,
    borderColor: "#E5DDE0",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },

  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A7A7D",
    letterSpacing: 1, // Espacio entre letras
    marginBottom: 8,
  },

  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#4F1720",
  },

  statUnit: {
    fontSize: 13,
    color: "#75686B",
    marginTop: 2,
  },


  // -----------------------------
  // MOVIMIENTOS
  // -----------------------------

  moveCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,

    borderWidth: 1,
    borderColor: "#E5DDE0",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  moveNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4F1720",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  moveNumberText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },

  moveText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#2D2729",
    textTransform: "capitalize", // Colocar la primera letra en mayuscula y el resto en minusculas
  },

});