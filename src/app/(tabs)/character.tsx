import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useDragonBall } from "../../context/DragonBallContext";

export default function CharacterScreen() {
  const [characterName, setCharacterName] = useState("");

  const {
    character,
    loading,
    error,
    buscarCharacter,
  } = useDragonBall();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>
        Dragon Ball
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Escribe un personaje"
        placeholderTextColor="#888"
        value={characterName}
        onChangeText={setCharacterName}
      />

      <Pressable
        style={styles.button}
        onPress={() => buscarCharacter(characterName)}
      >
        <Text style={styles.buttonText}>
          Buscar
        </Text>
      </Pressable>

      {loading && (
        <ActivityIndicator
          size="large"
          color="#4F1720"
          style={styles.loading}
        />
      )}

      {error !== "" && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      {character && (
        <View style={styles.resultContainer}>
          <Text style={styles.characterName}>
            {character.name.toUpperCase()}
          </Text>

          <View style={styles.imageCard}>
            <Image
              source={{ uri: character.image }}
              style={styles.characterImage}
              contentFit="contain"
            />
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.label}>
              Raza
            </Text>

            <Text style={styles.infoText}>
              {character.race}
            </Text>

            <Text style={styles.label}>
              Descripción
            </Text>

            <Text style={styles.description}>
              {character.description}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F4F5",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4F1720",
    textAlign: "center",
    marginBottom: 20,
    margin: 40,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#25292e",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#4F1720",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  loading: {
    marginTop: 20,
  },
  error: {
    color: "#B00020",
    textAlign: "center",
    fontSize: 16,
    marginTop: 20,
  },
  resultContainer: {
    marginTop: 24,
  },
  characterName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#4F1720",
    textAlign: "center",
    marginBottom: 16,
  },
  imageCard: {
    height: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  characterImage: {
    width: "100%",
    height: "100%",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4F1720",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 16,
    color: "#25292e",
    marginBottom: 18,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#25292e",
  },
});