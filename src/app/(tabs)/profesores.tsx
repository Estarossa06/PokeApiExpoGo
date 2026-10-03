import { View, Text, StyleSheet } from 'react-native';

export default function ProfesoresScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profesores</Text>
      <Text style={styles.text}>
        Aquí podremos buscar información de los profesores.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  text: {
    fontSize: 16,
    textAlign: 'center',
  },
});