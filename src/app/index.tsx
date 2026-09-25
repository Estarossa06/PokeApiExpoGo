import { useState } from "react";
import {View, Text, TextInput, Pressable, StyleSheet, ScrollView, } from "react-native";
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
    setError(""); // Queremos quitar el mensaje de error anterior.

    // Evitamos realizar una búsqueda vacía.
    if (!pokemonName.trim()) { //.trim quita los espacios del inicio y final de lo que se escriba
      setError("Escribe el nombre de un Pokémon"); // si no hay un nombre muestra el error
      return;
    }

    try {
      // Construimos la URL utilizando el nombre ingresado.
      const response = await fetch( // guardar en response = esperar a que se realice la busqueda
        `https://pokeapi.co/api/v2/pokemon/${pokemonName.toLowerCase().trim()}`
      ); // url busca el nombre que se haya escrito y le da formato en minusculas y sin espacios exteriores

      // Si la API no encuentra el Pokémon.
      if (!response.ok) { // ok = true or false basado en un codigo 200 OK da un True un 404 u otro da False
        setPokemon(null); // reinicia el nombre guardado
        setError("Pokémon no encontrado"); // mensaje de error
        return;
      }

      // Convertimos la respuesta en un objeto JavaScript.
      const data = await response.json(); // se guarda en data la conversion del .json a javaScript

      // Guardamos los datos para mostrarlos en pantalla.
      setPokemon(data); // Pokemon state cambia con la informacion guardada en data de los datos del pokemon
    } catch (error) {
      // Error de conexión u otro problema con la petición.
      setPokemon(null); // reinicia el nombre guardado
      setError("No se pudo conectar con PokeAPI"); // mensaje de error
    }
  };

  // -----------------------------
  // INTERFAZ
  // -----------------------------

  return (
    <ScrollView // Componente para desplazarse en vertical en un celular
      style={styles.screen} // Estilos basicos
      contentContainerStyle={styles.container} // propiedad para margenes y centrado
      showsVerticalScrollIndicator={false} // quita la barra gris de desplazamiento
    >
      {/* Encabezado de bienvenida */} 
      <View style={styles.header}>
        <Text style={styles.title}>Pokédex</Text> // Titulo

        <Text style={styles.subtitle}>
          Busca información de tu Pokémon
        </Text>
      </View>


      {/* -----------------------------
          BUSCADOR
      ----------------------------- */}

      <View style={styles.searchContainer}> // Hoja de estilos asociada posteriormente en el codigo
        <TextInput // Componente para ingresar texto 
          style={styles.input} // Hoja de estilos asociada posteriormente en el codigo
          placeholder="Nombre del Pokémon" // Texto de guia para indicar que escribir
          placeholderTextColor="#8A7A7D"
          value={pokemonName} // el texto en pantalla se enlaza con la variable y cambia el codigo
          onChangeText={setPokemonName} // actualiza el set con cada letra que se escriba
          autoCapitalize="none" // Desactiva las mayusculas al ingresar texto
        />

        <Pressable // Componente que actua como un boton
          style={styles.searchButton} // Hoja de estilos asociada posteriormente en el codigo
          onPress={buscarPokemon} // inicia la funcion buscar despues de presionar el boton
        >
          <Text style={styles.searchButtonText}>🔍</Text> // Icono del Pressable
        </Pressable>
      </View>


      {/* Mensaje de error -----   Renderizado Condicional*/}
      {error && ( // si hay un error la variable no estara vacia 
        <View style={styles.errorContainer}> 
          <Text style={styles.errorText}>{error}</Text> {/* hoja de estilos asociada al error y el error en texto */}
        </View>
      )}

      {/* -----------------------------
          RESULTADO DEL POKÉMON
      ----------------------------- */}

      {pokemon && ( // si la variable pokemon tiene datos traera la informacion especificada
        <View style={styles.resultContainer}> {/* Hoja de estilos con el resultado */} 

          {/* Nombre del Pokémon */}
          <Text style={styles.pokemonName}> {/* Hoja de estilos para pokemonName */}
            {pokemon.name.toUpperCase()} {/* busca en el diccionario el nombre y cambia a mayusculas */}
          </Text>


          {/* Imagen */}
          <View style={styles.imageCard}> {/* Hoja de estilos para el marco de la imagen del pokemon*/}
            <Image // Componente que trae la imagen desde internet
              source={{ uri: pokemon.sprites.front_default }} // ruta que navega al sprite del pokemon
              style={styles.pokemonImage} // Hoja de estilos para la imagen del pokemon
              contentFit="contain" // ajusta las proporciones de la imagen en el centro del view
            />
          </View>


          {/* -----------------------------
              CARACTERÍSTICAS
          ----------------------------- */}

          <Text style={styles.sectionTitle}>  {/* Hoja de estilos para la seccion de Caracteristicas*/}
            Características 
          </Text>

          <View style={styles.statsRow}> {/* Hoja de estilos para los stats */}

            {/* Altura */}
            <View style={styles.statCard}> {/* Hoja de estilos para el marco de los stats*/}
              <Text style={styles.statLabel}>ALTURA</Text>

              <Text style={styles.statValue}>
                {(pokemon.height / 10).toFixed(1)} {/* ajuste de la altura y funcion para agregar un solo decimal */}
              </Text>

              <Text style={styles.statUnit}> {/* Hoja de estilos para el texto */}
                metros
              </Text>
            </View> 


            {/* Peso */}
            <View style={styles.statCard}> {/* Hoja de estilos para el marco de los stats*/}
              <Text style={styles.statLabel}>PESO</Text> 

              <Text style={styles.statValue}> {/* ajuste del peso y funcion para agregar un solo decimal*/}
              </Text>

              <Text style={styles.statUnit}> {/* Hoja de estilos para el texto*/}
                kilogramos
              </Text>
            </View>

          </View>


          {/* -----------------------------
              MOVIMIENTOS
          ----------------------------- */}

          <Text style={styles.sectionTitle}> {/* Hoja de estilos para el texto */}
            Movimientos
          </Text>

          <View style={styles.moveCard}> {/* Hoja de estilos para el marco de los movimientos */}
            <View style={styles.moveNumber}> {/* hoja de estilos para los movimientos */}
              <Text style={styles.moveNumberText}>1</Text> {/* Hoja de estilos para el texto del movimiento 1 */}
            </View>

            <Text style={styles.moveText}> {/* Encadenamiento Opcional */}
              {pokemon.moves[0]?.move.name} {/* condicion para traer el movimiento 1 si existe */}
            </Text>
          </View>


          <View style={styles.moveCard}> {/* Hoja de estilos para el marco de los movimientos */}
            <View style={styles.moveNumber}> {/* hoja de estilos para los movimientos */}
              <Text style={styles.moveNumberText}>2</Text> {/* Hoja de estilos para el texto del movimiento 2 */}
            </View>

            <Text style={styles.moveText}>
              {pokemon.moves[1]?.move.name} {/* condicion para traer el movimiento 2 si existe */}
            </Text>
          </View>

        </View>
      )}

    </ScrollView> // ciera la vista de desplazamiento
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