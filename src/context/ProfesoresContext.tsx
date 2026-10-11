
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import NetInfo from '@react-native-community/netinfo';

import {
  ProfesorLocal,
  completarOperacionPendiente,
  crearProfesorOffline,
  eliminarDocentesRecientesAusentes,
  eliminarProfesorLocal,
  guardarDocenteDetectadoEnNube,
  guardarProfesorDescargado,
  guardarProfesorLocal,
  marcarDocenteComoReciente,
  marcarProfesorSincronizado,
  obtenerDocentesRecientes,
  obtenerOperacionesPendientes,
  obtenerProfesores,
  registrarOperacionPendiente,
  actualizarFotoPendiente,
  vincularProfesorConRemoto
} from '../database/profesoresSQLite';

import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';

const API = 'https://profesores-backend.onrender.com/api/profesores';

export interface Profesores {
  id: number;
  nombre: string;
  foto: string;
  formacion: string;
  profesion: string;
  cargo: string;
  area: string;
  nuevoRemoto?: boolean;
}

interface ProfesoresContextType {
  profesores: Profesores[];
  docentesRecientes: Profesores[];
  intervaloMonitoreo: 2 | 10 | 30;
  setIntervaloMonitoreo: (segundos: 2 | 10 | 30) => void;
  monitoreoActivo: boolean;
  loading: boolean;
  error: string | null;
  buscarProfesor: (nombre: string) => Promise<void>;
  crearProfesor: (profesor: Omit<Profesores, 'id'>) => Promise<boolean>;
  actualizarProfesor: (profesor: Profesores) => Promise<boolean>;
  eliminarProfesor: (id: number) => Promise<boolean>;
  limpiarProfesor: () => void;
}

const ProfesoresContext =
  createContext<ProfesoresContextType | undefined>(undefined);

function convertirLocal(p: ProfesorLocal): Profesores {
  return {
    id: p.id,
    nombre: p.nombre,
    foto: p.foto,
    formacion: p.formacion,
    profesion: p.profesion,
    cargo: p.cargo,
    area: p.area,
    nuevoRemoto: p.nuevo_remoto === 1,
  };
}

function datosLocales(p: Profesores, id: number): ProfesorLocal {
  return {
    ...p,
    id,
    id_remoto: null,
    foto_local_uri: null,
    sincronizado: 0,
  };
}

function datosServidor(p: Profesores): Omit<
  ProfesorLocal,
  'sincronizado' | 'foto_local_uri'
> {
  return {
    ...p,
    id_remoto: p.id,
  };
}

function normalizarCampo(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function mismosDatos(
  a: Pick<Profesores, 'nombre' | 'formacion' | 'profesion' | 'cargo' | 'area'>,
  b: Pick<Profesores, 'nombre' | 'formacion' | 'profesion' | 'cargo' | 'area'>
): boolean {
  const campos = [
    'nombre',
    'formacion',
    'profesion',
    'cargo',
    'area',
  ] as const;

  return campos.every(
    (campo) => normalizarCampo(a[campo]) === normalizarCampo(b[campo])
  );
}

async function hayInternet(): Promise<boolean> {
  const estado = await NetInfo.fetch();

  return (
    estado.isConnected === true &&
    estado.isInternetReachable !== false
  );
}

async function subirFotoCloudinary(uri: string): Promise<string> {
  const archivo = new File(uri);
  const datos = new FormData();

  datos.append('file', archivo);
  datos.append('upload_preset', 'profesores_fotos');

  const respuesta = await expoFetch(
    'https://api.cloudinary.com/v1_1/khrqmkui/image/upload',
    {
      method: 'POST',
      body: datos,
    }
  );

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error('No se pudo subir la foto a Cloudinary');
  }

  return resultado.secure_url;
}

export function ProfesoresProvider({
  children,
}: {
  children: ReactNode;
}) {

  const [profesores, setProfesor] = useState<Profesores[]>([]);
  const [docentesRecientes, setDocentesRecientes] = useState<Profesores[]>([]);
  const [intervaloMonitoreo, setIntervaloMonitoreo] = useState<2 | 10 | 30>(10);
  const [monitoreoActivo, setMonitoreoActivo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sincronizando = useRef(false);
  // IDs de creaciones offline que deben entrar al historial en el próximo sondeo.

  const cargarRecientes = useCallback(async () => {
    const recientes = await obtenerDocentesRecientes();
    setDocentesRecientes(recientes.map(convertirLocal));
  }, []);

  // Consulta el listado completo de la nube y registra las inserciones nuevas.
  const consultarCambiosNube = useCallback(async () => {
    if (!(await hayInternet())) {
      setMonitoreoActivo(false);
      return;
    }

    try {
      const respuesta = await fetch(API);
      if (!respuesta.ok) throw new Error('No se pudo consultar el listado remoto');

      const remotos: Profesores[] = await respuesta.json();
      if (!Array.isArray(remotos)) {
        throw new Error('El servidor no devolvió una lista de docentes');
      }

      // El historial solo conserva docentes que siguen existiendo en la nube.
      await eliminarDocentesRecientesAusentes(
        remotos.map((remoto) => remoto.id)
      );

      for (const remoto of remotos) {
        await guardarDocenteDetectadoEnNube({
          ...datosServidor(remoto),
          id_remoto: remoto.id,
        });
      }

      await cargarRecientes();
      setMonitoreoActivo(true);
    } catch (e) {
      setMonitoreoActivo(false);
      console.warn('No se pudieron comprobar cambios en la nube:', e);
    }
  }, [cargarRecientes]);

  const sincronizar = useCallback(async () => {
    if (sincronizando.current || !(await hayInternet())) {
      return;
    }

    sincronizando.current = true;

    try {
      const operaciones = await obtenerOperacionesPendientes();

      for (const op of operaciones) {
        try {
          const locales = await obtenerProfesores();
          const local = locales.find(
            (p) => p.id === op.profesor_id
          );

          const datos = op.datos
            ? JSON.parse(op.datos)
            : null;



          if (op.operacion === 'CREATE') {
            const respuestaLista = await fetch(API);

            if (!respuestaLista.ok) {
              throw new Error('No se pudo comprobar si el docente existe en la nube');
            }

            const remotos: Profesores[] = await respuestaLista.json();

            if (!Array.isArray(remotos)) {
              throw new Error('El servidor no devolvió una lista de docentes');
            }

            const coincidente = remotos.find((remoto) =>
              mismosDatos(datos, remoto)
            );
            const remotoYaEstabaLocal = coincidente
              ? locales.some((p) => p.id_remoto === coincidente.id)
              : false;

            let remotoFinal: Profesores;

            if (coincidente) {
              remotoFinal = coincidente;
            } else {
              if (!datos.foto.startsWith('http')) {
                const fotoUrl = await subirFotoCloudinary(datos.foto);
                await actualizarFotoPendiente(
                  op.id,
                  op.profesor_id,
                  fotoUrl
                );
                datos.foto = fotoUrl;
              }

              const respuesta = await fetch(API, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  nombre: datos.nombre,
                  foto: datos.foto,
                  formacion: datos.formacion,
                  profesion: datos.profesion,
                  cargo: datos.cargo,
                  area: datos.area,
                }),
              });

              if (!respuesta.ok) {
                throw new Error('No se pudo sincronizar la creación');
              }

              remotoFinal = await respuesta.json();
            }

            await vincularProfesorConRemoto(
              op.profesor_id,
              remotoFinal,
              !remotoYaEstabaLocal
            );

            setProfesor((actuales) =>
              actuales.map((p) =>
                p.id === op.profesor_id
                  ? { ...remotoFinal, id: op.profesor_id }
                  : p
              )
            );
            await cargarRecientes();
          }

          if (op.operacion === 'UPDATE') {
            const idRemoto =
              local?.id_remoto ??
              (datos?.id > 0 ? datos.id : null);

            if (idRemoto == null) {
              continue;
            }

            const respuesta = await fetch(API, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...datos,
                id: idRemoto,
              }),
            });

            if (!respuesta.ok) {
              throw new Error('No se pudo sincronizar la edición');
            }

            await marcarProfesorSincronizado(op.profesor_id);
          }

          if (op.operacion === 'DELETE') {
            const idRemoto =
              datos?.id_remoto ??
              local?.id_remoto ??
              (op.profesor_id > 0 ? op.profesor_id : null);

            if (idRemoto != null) {
              const respuesta = await fetch(
                `${API}?id=${idRemoto}`,
                { method: 'DELETE' }
              );

              if (!respuesta.ok && respuesta.status !== 404) {
                throw new Error('No se pudo sincronizar la eliminación');
              }
            }
          }

          await completarOperacionPendiente(op.id);
        } catch (e) {
          console.warn('Operación pendiente conservada:', e);
          // Si falla, se conserva para el próximo intento.
          break;
        }
      }

    } catch (e) {
      console.error('Error de sincronización:', e);
    } finally {
      sincronizando.current = false;
    }
  }, [cargarRecientes]);

  useEffect(() => {
    cargarRecientes().catch((e) => console.warn('Error cargando historial:', e));
    void consultarCambiosNube();

    const unsubscribe = NetInfo.addEventListener((estado) => {
      if (
        estado.isConnected === true &&
        estado.isInternetReachable !== false
      ) {
        void sincronizar();
        void consultarCambiosNube();
      } else {
        setMonitoreoActivo(false);
      }
    });

    return unsubscribe;
  }, [cargarRecientes, sincronizar, consultarCambiosNube]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      void consultarCambiosNube();
    }, intervaloMonitoreo * 1000);

    return () => clearInterval(intervalo);
  }, [intervaloMonitoreo, consultarCambiosNube]);

  const buscarProfesor = async (nombre: string) => {
    setLoading(true);
    setError(null);

    try {
      if (await hayInternet()) {
        try {
          const respuesta = await fetch(
            `${API}?nombre=${encodeURIComponent(nombre)}`
          );

          if (!respuesta.ok) {
            if (respuesta.status === 404) {
              setProfesor([]);
              setError('No se encontraron profesores');
              return;
            }

            throw new Error('Error consultando el servidor');
          }

          const remotos: Profesores[] = await respuesta.json();
          const locales = await obtenerProfesores();

          for (const remoto of remotos) {
            const yaExiste = locales.some(
              (p) =>
                p.id_remoto === remoto.id ||
                (p.id === remoto.id && p.id_remoto === remoto.id)
            );

            if (!yaExiste) {
              await guardarProfesorDescargado(
                datosServidor(remoto)
              );
            }
          }

          setProfesor(remotos);
          return;
        } catch (e) {
          console.warn('Consulta remota fallida; usando SQLite', e);
        }
      }

      const locales = await obtenerProfesores();
      const termino = nombre.trim().toLocaleLowerCase();

      const encontrados = locales.filter((p) =>
        p.nombre.toLocaleLowerCase().includes(termino)
      );

      setProfesor(encontrados.map(convertirLocal));

      if (encontrados.length === 0) {
        setError('Sin conexión: no hay resultados guardados localmente');
      }
    } catch (e) {
      setError('No se pudieron consultar los profesores');
    } finally {
      setLoading(false);
    }
  };

  const crearProfesor = async (
    profesor: Omit<Profesores, 'id'>
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      if (await hayInternet()) {
        try {
          const respuestaLista = await fetch(API);
          if (!respuestaLista.ok) {
            throw new Error('No se pudo comprobar el listado de Atlas');
          }

          const remotos: Profesores[] = await respuestaLista.json();
          const coincidente = remotos.find((remoto) =>
            mismosDatos(profesor, remoto)
          );

          if (coincidente) {
            const yaEstabaLocal = (await obtenerProfesores()).some(
              (p) => p.id_remoto === coincidente.id
            );
            await guardarProfesorDescargado(datosServidor(coincidente));
            if (!yaEstabaLocal) {
              await marcarDocenteComoReciente(coincidente.id);
              await cargarRecientes();
            }
            setProfesor((actuales) => [...actuales, coincidente]);
            return true;
          }

          let profesorParaCrear = profesor;
          if (!profesor.foto.startsWith('http')) {
            const fotoUrl = await subirFotoCloudinary(profesor.foto);
            profesorParaCrear = { ...profesor, foto: fotoUrl };
          }

          const respuesta = await fetch(API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(profesorParaCrear),
          });

          if (!respuesta.ok) {
            setError('El servidor rechazó la creación');
            return false;
          }

          const remoto: Profesores = await respuesta.json();
          await guardarProfesorDescargado(datosServidor(remoto));
          if (respuesta.status === 201) {
            await marcarDocenteComoReciente(remoto.id);
            await cargarRecientes();
          }

          // El historial se actualiza únicamente en el siguiente sondeo,
          // respetando el intervalo configurado por el usuario.
          setProfesor((actuales) => [...actuales, remoto]);
          return true;
        } catch (e) {
          console.warn('Creación remota fallida; guardando localmente', e);
        }
      }

      const id = await crearProfesorOffline({
        ...profesor,
        foto_local_uri: profesor.foto.startsWith('http')
          ? null
          : profesor.foto,
      });

      setProfesor((actuales) => [
        ...actuales,
        { ...profesor, id },
      ]);

      return true;
    } catch (e) {
      setError('No se pudo guardar el profesor');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const actualizarProfesor = async (
    profesor: Profesores
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const locales = await obtenerProfesores();

      const local = locales.find(
        (p) =>
          p.id === profesor.id ||
          p.id_remoto === profesor.id
      );

      if (await hayInternet()) {
        try {
          const idRemoto =
            local?.id_remoto ??
            (profesor.id > 0 ? profesor.id : null);

          if (idRemoto == null) {
            throw new Error('El profesor aún no tiene ID remoto');
          }

          const respuesta = await fetch(API, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...profesor,
              id: idRemoto,
            }),
          });

          if (!respuesta.ok) {
            setError('No se pudo actualizar en el servidor');
            return false;
          }

          const actualizado: Profesores = await respuesta.json();

          if (local) {
            await guardarProfesorLocal({
              ...actualizado,
              id: local.id,
              id_remoto: actualizado.id,
              foto_local_uri: local.foto_local_uri,
            });

            await marcarProfesorSincronizado(local.id);
          } else {
            await guardarProfesorDescargado(
              datosServidor(actualizado)
            );
          }

          setProfesor((actuales) =>
            actuales.map((p) =>
              p.id === profesor.id ? actualizado : p
            )
          );

          return true;
        } catch (e) {
          console.warn('Edición remota fallida; usando SQLite', e);
        }
      }

      const idLocal = local?.id ?? profesor.id;

      await guardarProfesorLocal({
        ...profesor,
        id: idLocal,
        id_remoto: local?.id_remoto ?? null,
        foto_local_uri: local?.foto_local_uri ?? null,
      });

      await registrarOperacionPendiente(
        'UPDATE',
        idLocal,
        { ...profesor, id: idLocal }
      );

      setProfesor((actuales) =>
        actuales.map((p) =>
          p.id === profesor.id
            ? { ...profesor, id: idLocal }
            : p
        )
      );

      return true;
    } catch (e) {
      setError('No se pudo guardar la edición');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const eliminarProfesor = async (
    id: number
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const locales = await obtenerProfesores();

      const local = locales.find(
        (p) => p.id === id || p.id_remoto === id
      );

      const idLocal = local?.id ?? id;
      const operaciones = await obtenerOperacionesPendientes();

      const creacionPendiente = operaciones.some(
        (op) =>
          op.profesor_id === idLocal &&
          op.operacion === 'CREATE'
      );

      if (await hayInternet() && !creacionPendiente) {
        try {
          const idRemoto =
            local?.id_remoto ?? (id > 0 ? id : null);

          if (idRemoto == null) {
            throw new Error('No se encontró el ID remoto');
          }

          const respuesta = await fetch(
            `${API}?id=${idRemoto}`,
            { method: 'DELETE' }
          );

          if (!respuesta.ok && respuesta.status !== 404) {
            setError('No se pudo eliminar en el servidor');
            return false;
          }

          if (local) {
            await eliminarProfesorLocal(idLocal);
          }

          setProfesor((actuales) =>
            actuales.filter((p) => p.id !== id)
          );
          await cargarRecientes();

          return true;
        } catch (e) {
          console.warn('Eliminación remota fallida; usando SQLite', e);
        }
      }

      if (creacionPendiente) {
        // Si nunca llegó al servidor, no hay nada remoto que eliminar.
        for (const op of operaciones) {
          if (op.profesor_id === idLocal) {
            await completarOperacionPendiente(op.id);
          }
        }
      } else {
        await registrarOperacionPendiente(
          'DELETE',
          idLocal,
          {
            id_remoto:
              local?.id_remoto ?? (id > 0 ? id : null),
          }
        );
      }

      await eliminarProfesorLocal(idLocal);

      setProfesor((actuales) =>
        actuales.filter((p) => p.id !== id)
      );
      await cargarRecientes();

      return true;
    } catch (e) {
      setError('No se pudo eliminar el profesor');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const limpiarProfesor = () => {
    setProfesor([]);
    setError(null);
  };

  return (
    <ProfesoresContext.Provider
      value={{
        profesores,
        docentesRecientes,
        intervaloMonitoreo,
        setIntervaloMonitoreo,
        monitoreoActivo,
        loading,
        error,
        buscarProfesor,
        crearProfesor,
        actualizarProfesor,
        eliminarProfesor,
        limpiarProfesor,
      }}
    >
      {children}
    </ProfesoresContext.Provider>
  );
}

export function useProfesores() {
  const context = useContext(ProfesoresContext);

  if (!context) {
    throw new Error(
      'useProfesores debe utilizarse dentro de ProfesoresProvider'
    );
  }

  return context;
}
