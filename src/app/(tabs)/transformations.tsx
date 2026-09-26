import { router } from 'expo-router';
import {Text, View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Image } from "expo-image";
import { useDragonBall } from "../../context/DragonBallContext";

export default function TransformationsScreen() {
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
        Transformaciones de {character.name}
      </Text>

      {character.transformations.length === 0 ? (
        <Text style={styles.emptyText}>
          Este personaje no tiene transformaciones disponibles.
        </Text>
      ) : (
        character.transformations.map((transformation) => (
          <View
            key={transformation.name}
            style={styles.card}
          >
            <Image
              source={{ uri: transformation.image }}
              style={styles.transformationImage}
              contentFit="contain"
            />

            <Text style={styles.transformationName}>
              {transformation.name}
            </Text>

            <Text style={styles.ki}>
              Ki: {transformation.ki}
            </Text>
          </View>
        ))
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
    fontSize: 26,
    fontWeight: "bold",
    color: "#4F1720",
    textAlign: "center",
    marginBottom: 20,
    margin: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    alignItems: "center",
  },
  transformationImage: {
    width: "100%",
    height: 220,
    marginBottom: 12,
  },
  transformationName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4F1720",
    textAlign: "center",
    marginBottom: 8,
  },
  ki: {
    fontSize: 16,
    color: "#25292e",
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#F7F4F5",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyText: {
    color: "#4F1720",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 26,
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