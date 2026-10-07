import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { Profesores, useProfesores } from '../../context/ProfesoresContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

export default function ProfesoresScreen() {
  const {
    profesores,
    loading,
    error,
    buscarProfesor,
    crearProfesor,
    actualizarProfesor,
    eliminarProfesor,
    limpiarProfesor,
  } = useProfesores();

  const [nombre, setNombre] = useState('');
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [profesorSeleccionado, setProfesorSeleccionado] =
    useState<Profesores | null>(null);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [profesorEditando, setProfesorEditando] =
    useState<Profesores | null>(null);

  const [nuevoProfesor, setNuevoProfesor] = useState({
    nombre: '',
    foto: '',
    formacion: '',
    profesion: '',
    cargo: '',
    area: '',
  });

  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const subirFotoCloudinary = async (
    uri: string
  ): Promise<string> => {
    const archivo = new File(uri);

    const datos = new FormData();

    datos.append('file', archivo);
    datos.append(
      'upload_preset',
      'profesores_fotos'
    );

    const respuesta = await fetch(
      'https://api.cloudinary.com/v1_1/khrqmkui/image/upload',
      {
        method: 'POST',
        body: datos,
      }
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        resultado.error?.message ||
        'No se pudo subir la imagen a Cloudinary'
      );
    }

    return resultado.secure_url;
  };

  const seleccionarFoto = async (
    modo: 'crear' | 'editar'
  ) => {
    const permiso = await ImagePicker.getMediaLibraryPermissionsAsync();

    if (!permiso.granted) {
      const nuevoPermiso =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!nuevoPermiso.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tus fotos para seleccionar una imagen.'
        );
        return;
      }
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (resultado.canceled) {
      return;
    }

    const uri = resultado.assets[0].uri;

    // Mostrar la foto inmediatamente usando la URI local.
    if (modo === 'crear') {
      setNuevoProfesor((actual) => ({
        ...actual,
        foto: uri,
      }));
    } else if (modo === 'editar') {
      setProfesorEditando((actual) => {
        if (!actual) return null;

        return {
          ...actual,
          foto: uri,
        };
      });
    }

    // Subir la foto a Cloudinary después de mostrarla.
    setSubiendoFoto(true);

    try {
      const urlCloudinary = await subirFotoCloudinary(uri);

      if (modo === 'crear') {
        setNuevoProfesor((actual) => ({
          ...actual,
          foto: urlCloudinary,
        }));
      } else if (modo === 'editar') {
        setProfesorEditando((actual) => {
          if (!actual) return null;

          return {
            ...actual,
            foto: urlCloudinary,
          };
        });
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo subir la foto a Cloudinary.'
      );
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleBuscar = () => {
    if (!nombre.trim()) return;

    setMostrarDetalles(false);
    setProfesorSeleccionado(null);
    setProfesorEditando(null);

    buscarProfesor(nombre.trim());
  };

  const handleVerMas = (profesor: Profesores) => {
    setProfesorSeleccionado(profesor);
    setMostrarDetalles(true);
    setProfesorEditando(null);
  };

  const handleEditar = () => {
    if (!profesorSeleccionado) return;

    setProfesorEditando({
      ...profesorSeleccionado,
    });
  };

  const handleCancelarEdicion = () => {
    setProfesorEditando(null);
  };

  const handleGuardarEdicion = () => {
    if (!profesorEditando) return;

    if (subiendoFoto) {
      Alert.alert(
        'Espera',
        'La foto todavía se está subiendo. Intenta guardar nuevamente en unos segundos.'
      );
      return;
    }

    const profesor = profesorEditando;

    Alert.alert(
      'Guardar cambios',
      '¿Desea guardar los cambios realizados al profesor?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Guardar',
          onPress: async () => {
            const resultado = await actualizarProfesor(profesor);

            if (resultado) {
              setProfesorSeleccionado(profesor);
              setProfesorEditando(null);

              Alert.alert(
                'Cambios guardados',
                'La información del profesor fue actualizada correctamente.'
              );
            }
          },
        },
      ]
    );
  };

  const handleEliminar = () => {
    if (!profesorSeleccionado) return;

    Alert.alert(
      'Eliminar profesor',
      `¿Está seguro de eliminar a ${profesorSeleccionado.nombre}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const resultado = await eliminarProfesor(
              profesorSeleccionado.id
            );

            if (resultado) {
              setProfesorSeleccionado(null);
              setMostrarDetalles(false);

              Alert.alert(
                'Profesor eliminado',
                'El profesor fue eliminado correctamente.'
              );
            }
          },
        },
      ]
    );
  };

  const handleRegresar = () => {
    setMostrarDetalles(false);
    setProfesorSeleccionado(null);
    setProfesorEditando(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profesores</Text>

      <TextInput
        style={styles.input}
        placeholder="Ingrese el nombre del profesor"
        placeholderTextColor="#888"
        value={nombre}
        onChangeText={setNombre}
      />

      <TouchableOpacity style={styles.button} onPress={handleBuscar}>
        <Text style={styles.buttonText}>BUSCAR</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setMostrarFormulario(!mostrarFormulario)}
      >
        <Text style={styles.buttonText}>
          {mostrarFormulario ? 'CANCELAR' : 'AGREGAR PROFESOR'}
        </Text>
      </TouchableOpacity>

      {/* Formulario para crear un profesor */}
      {mostrarFormulario && (
        <View style={styles.card}>
          <Text style={styles.name}>Nuevo profesor</Text>

          <TextInput
            style={styles.input}
            placeholder="Nombre"
            placeholderTextColor="#888"
            value={nuevoProfesor.nombre}
            onChangeText={(texto) =>
              setNuevoProfesor({
                ...nuevoProfesor,
                nombre: texto,
              })
            }
          />

          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => seleccionarFoto('crear')}
          >
            <Ionicons
              name="image-outline"
              size={24}
              color="#800020"
            />

            <Text style={styles.photoButtonText}>
              Seleccionar foto
            </Text>
          </TouchableOpacity>

          {nuevoProfesor.foto !== '' && (
            <Image
              source={{ uri: nuevoProfesor.foto }}
              style={styles.photoPreview}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Formación"
            placeholderTextColor="#888"
            value={nuevoProfesor.formacion}
            onChangeText={(texto) =>
              setNuevoProfesor({
                ...nuevoProfesor,
                formacion: texto,
              })
            }
          />

          <TextInput
            style={styles.input}
            placeholder="Profesión"
            placeholderTextColor="#888"
            value={nuevoProfesor.profesion}
            onChangeText={(texto) =>
              setNuevoProfesor({
                ...nuevoProfesor,
                profesion: texto,
              })
            }
          />

          <TextInput
            style={styles.input}
            placeholder="Cargo"
            placeholderTextColor="#888"
            value={nuevoProfesor.cargo}
            onChangeText={(texto) =>
              setNuevoProfesor({
                ...nuevoProfesor,
                cargo: texto,
              })
            }
          />

          <TextInput
            style={styles.input}
            placeholder="Área"
            placeholderTextColor="#888"
            value={nuevoProfesor.area}
            onChangeText={(texto) =>
              setNuevoProfesor({
                ...nuevoProfesor,
                area: texto,
              })
            }
          />

          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              if (subiendoFoto) {
                Alert.alert(
                  'Espera',
                  'La foto todavía se está subiendo. Intenta guardar nuevamente en unos segundos.'
                );
                return;
              }

              const resultado = await crearProfesor(nuevoProfesor);

              if (resultado) {
                setNuevoProfesor({
                  nombre: '',
                  foto: '',
                  formacion: '',
                  profesion: '',
                  cargo: '',
                  area: '',
                });

                setMostrarFormulario(false);
              }
            }}
          >
            <Text style={styles.buttonText}>GUARDAR PROFESOR</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Resultados de búsqueda */}
      {profesores.length > 0 && !mostrarDetalles && (
        <>
          {profesores.map((profesor) => (
            <View key={profesor.id} style={styles.card}>
              <Image
                source={{ uri: profesor.foto }}
                style={styles.image}
              />

              <Text style={styles.name}>
                {profesor.nombre}
              </Text>

              <Text style={styles.text}>
                {profesor.nombre} es docente de UNINPAHU y pertenece al área de{' '}
                {profesor.area}.
              </Text>

              <TouchableOpacity
                style={styles.button}
                onPress={() => handleVerMas(profesor)}
              >
                <Text style={styles.buttonText}>VER MÁS</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* Detalle del profesor */}
      {profesorSeleccionado && mostrarDetalles && (
        <View style={styles.card}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>
              {profesorEditando ? 'Editar profesor' : 'Información del profesor'}
            </Text>

            {!profesorEditando && (
              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={handleEditar}
                >
                  <Ionicons name="pencil" size={20} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteIconButton}
                  onPress={handleEliminar}
                >
                  <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {profesorEditando ? (
            <View style={styles.photoContainer}>
              <Image
                source={{ uri: profesorEditando.foto }}
                style={styles.profilePhoto}
              />

              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => seleccionarFoto('editar')}
              >
                <Ionicons
                  name="camera"
                  size={18}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          ) : (
            <Image
              source={{ uri: profesorSeleccionado.foto }}
              style={styles.image}
            />
          )}

          {profesorEditando ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                placeholderTextColor="#888"
                value={profesorEditando.nombre}
                onChangeText={(texto) => {
                  setProfesorEditando({
                    ...profesorEditando,
                    nombre: texto,
                  });
                }}
              />

              <TextInput
                style={styles.input}
                placeholder="Formación"
                placeholderTextColor="#888"
                value={profesorEditando.formacion}
                onChangeText={(texto) => {
                  setProfesorEditando({
                    ...profesorEditando,
                    formacion: texto,
                  });
                }}
              />

              <TextInput
                style={styles.input}
                placeholder="Profesión"
                placeholderTextColor="#888"
                value={profesorEditando.profesion}
                onChangeText={(texto) => {
                  setProfesorEditando({
                    ...profesorEditando,
                    profesion: texto,
                  });
                }}
              />

              <TextInput
                style={styles.input}
                placeholder="Cargo"
                placeholderTextColor="#888"
                value={profesorEditando.cargo}
                onChangeText={(texto) => {
                  setProfesorEditando({
                    ...profesorEditando,
                    cargo: texto,
                  });
                }}
              />

              <TextInput
                style={styles.input}
                placeholder="Área"
                placeholderTextColor="#888"
                value={profesorEditando.area}
                onChangeText={(texto) => {
                  setProfesorEditando({
                    ...profesorEditando,
                    area: texto,
                  });
                }}
              />

              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleGuardarEdicion}
                >
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelarEdicion}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.name}>
                {profesorSeleccionado.nombre}
              </Text>

              <Text style={styles.info}>
                <Text style={styles.label}>Formación: </Text>
                {profesorSeleccionado.formacion}
              </Text>

              <Text style={styles.info}>
                <Text style={styles.label}>Profesión: </Text>
                {profesorSeleccionado.profesion}
              </Text>

              <Text style={styles.info}>
                <Text style={styles.label}>Cargo: </Text>
                {profesorSeleccionado.cargo}
              </Text>

              <Text style={styles.info}>
                <Text style={styles.label}>Área: </Text>
                {profesorSeleccionado.area}
              </Text>
            </>
          )}

          {!profesorEditando && (
            <TouchableOpacity
              style={styles.button}
              onPress={handleRegresar}
            >
              <Text style={styles.buttonText}>REGRESAR</Text>
            </TouchableOpacity>
          )}
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
    backgroundColor: '#F7F4F5',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#800020',
    marginBottom: 20,
    margin: 40,
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

  detailHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  detailTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#800020',
    marginRight: 10,
  },

  editIconButton: {
    width: 30,
    height: 30,
    borderRadius: 21,
    backgroundColor: '#800020',
    alignItems: 'center',
    justifyContent: 'center',
  },

  editActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 5,
    marginBottom: 10,
  },

  confirmButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#800020',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#800020',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },

  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },

  deleteIconButton: {
    width: 30,
    height: 30,
    borderRadius: 21,
    backgroundColor: '#800020',
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoButton: {
    width: '100%',
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#800020',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },

  photoButtonText: {
    fontSize: 16,
    color: '#800020',
    fontWeight: '600',
  },

  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 15,
  },

  photoContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 15,
  },

  profilePhoto: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },

  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#800020',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

});