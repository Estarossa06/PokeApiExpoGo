import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";

export default function Index() {
  // -----------------------------
  // ESTADOS DE LA APLICACIÓN
  // -----------------------------

  // Guarda el nombre escrito en el buscador.
  const [pokemonName, setPokemonName] = useState("");

  // Guarda la información obtenida desde PokeAPI.
  const [pokemon, setPokemon] = useState<any>(null);

  // Guarda los mensajes de error.
  const [error, setError] = useState("");


  // -----------------------------
  // CONSULTA A POKEAPI
  // -----------------------------

  const buscarPokemon = async () => {
    // Eliminamos cualquier error anterior.
    setError("");

    // Evitamos realizar una búsqueda vacía.
    if (!pokemonName.trim()) {
      setError("Escribe el nombre de un Pokémon");
      return;
    }

    try {
      // Construimos la URL utilizando el nombre ingresado.
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${pokemonName
          .toLowerCase()
          .trim()}`
      );

      // Si la API no encuentra el Pokémon.
      if (!response.ok) {
        setPokemon(null);
        setError("Pokémon no encontrado");
        return;
      }

      // Convertimos la respuesta en un objeto JavaScript.
      const data = await response.json();

      // Guardamos los datos para mostrarlos en pantalla.
      setPokemon(data);
    } catch (error) {
      // Error de conexión u otro problema con la petición.
      setPokemon(null);
      setError("No se pudo conectar con PokeAPI");
    }
  };


  // -----------------------------
  // INTERFAZ
  // -----------------------------

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Encabezado de bienvenida */}
      <View style={styles.header}>
        <Text style={styles.title}>Pokédex</Text>

        <Text style={styles.subtitle}>
          Busca información de tu Pokémon
        </Text>
      </View>


      {/* -----------------------------
          BUSCADOR
      ----------------------------- */}

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nombre del Pokémon"
          placeholderTextColor="#8A7A7D"
          value={pokemonName}
          onChangeText={setPokemonName}
          autoCapitalize="none"
        />

        <Pressable
          style={styles.searchButton}
          onPress={buscarPokemon}
        >
          <Text style={styles.searchButtonText}>🔍</Text>
        </Pressable>
      </View>


      {/* Mensaje de error */}
      {error !== "" && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}


      {/* -----------------------------
          RESULTADO DEL POKÉMON
      ----------------------------- */}

      {pokemon && (
        <View style={styles.resultContainer}>

          {/* Nombre del Pokémon */}
          <Text style={styles.pokemonName}>
            {pokemon.name.toUpperCase()}
          </Text>


          {/* Imagen */}
          <View style={styles.imageCard}>
            <Image
              source={{
                uri: pokemon.sprites.front_default,
              }}
              style={styles.pokemonImage}
              contentFit="contain"
            />
          </View>


          {/* -----------------------------
              CARACTERÍSTICAS
          ----------------------------- */}

          <Text style={styles.sectionTitle}>
            Características
          </Text>

          <View style={styles.statsRow}>

            {/* Altura */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>ALTURA</Text>

              <Text style={styles.statValue}>
                {(pokemon.height / 10).toFixed(1)}
              </Text>

              <Text style={styles.statUnit}>
                metros
              </Text>
            </View>


            {/* Peso */}
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>PESO</Text>

              <Text style={styles.statValue}>
                {(pokemon.weight / 10).toFixed(1)}
              </Text>

              <Text style={styles.statUnit}>
                kilogramos
              </Text>
            </View>

          </View>


          {/* -----------------------------
              MOVIMIENTOS
          ----------------------------- */}

          <Text style={styles.sectionTitle}>
            Movimientos
          </Text>

          <View style={styles.moveCard}>
            <View style={styles.moveNumber}>
              <Text style={styles.moveNumberText}>1</Text>
            </View>

            <Text style={styles.moveText}>
              {pokemon.moves[0]?.move.name}
            </Text>
          </View>


          <View style={styles.moveCard}>
            <View style={styles.moveNumber}>
              <Text style={styles.moveNumberText}>2</Text>
            </View>

            <Text style={styles.moveText}>
              {pokemon.moves[1]?.move.name}
            </Text>
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
    gap: 10,
    marginBottom: 20,
  },

  input: {
    flex: 1,
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
    fontSize: 22,
    fontWeight: "800",
  },


  // -----------------------------
  // ERROR
  // -----------------------------

  errorContainer: {
    backgroundColor: "#FBEAEA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
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
    letterSpacing: 1,
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
    textTransform: "capitalize",
  },

});