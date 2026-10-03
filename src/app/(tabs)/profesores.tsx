import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';

import { useState } from 'react';
import { useProfesores } from '../../context/ProfesoresContext';

export default function ProfesoresScreen() {
  const {
    profesor,
    loading,
    error,
    buscarProfesor,
    limpiarProfesor,
  } = useProfesores();

  const [nombre, setNombre] = useState('');
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  const handleBuscar = () => {
    if (!nombre.trim()) return;

    setMostrarDetalles(false);
    buscarProfesor(nombre.trim());
  };

  const handleRegresar = () => {
    setMostrarDetalles(false);
    setNombre('');
    limpiarProfesor();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profesores</Text>

      <TextInput
        style={styles.input}
        placeholder="Ingrese el nombre del profesor"
        value={nombre}
        onChangeText={setNombre}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleBuscar}
      >
        <Text style={styles.buttonText}>BUSCAR</Text>
      </TouchableOpacity>

      {loading && (
        <Text style={styles.text}>
          Buscando profesor...
        </Text>
      )}

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      {profesor && !mostrarDetalles && (
        <View style={styles.card}>
          <Image
            source={{ uri: profesor.foto }}
            style={styles.image}
          />

          <Text style={styles.name}>
            {profesor.nombre}
          </Text>

          <Text style={styles.text}>
            {profesor.nombre} es docente de UNINPAHU y pertenece al área de {profesor.area}.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setMostrarDetalles(true)}
          >
            <Text style={styles.buttonText}>VER MÁS</Text>
          </TouchableOpacity>
        </View>
      )}

      {profesor && mostrarDetalles && (
        <View style={styles.card}>
          <Image
            source={{ uri: profesor.foto }}
            style={styles.image}
          />

          <Text style={styles.name}>
            {profesor.nombre}
          </Text>

          <Text style={styles.info}>
            <Text style={styles.label}>Formación: </Text>
            {profesor.formacion}
          </Text>

          <Text style={styles.info}>
            <Text style={styles.label}>Profesión: </Text>
            {profesor.profesion}
          </Text>

          <Text style={styles.info}>
            <Text style={styles.label}>Cargo: </Text>
            {profesor.cargo}
          </Text>

          <Text style={styles.info}>
            <Text style={styles.label}>Área: </Text>
            {profesor.area}
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegresar}
          >
            <Text style={styles.buttonText}>REGRESAR</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },

  button: {
    backgroundColor: '#800020',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 15,
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },

  error: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
  },

  card: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
  },

  image: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 15,
  },

  name: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },

  info: {
    width: '100%',
    fontSize: 16,
    marginBottom: 12,
  },

  label: {
    fontWeight: 'bold',
  },
});