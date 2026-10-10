
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';

import NetInfo from '@react-native-community/netinfo';

import {
  ProfesorLocal,
  obtenerProfesores,
  guardarProfesorLocal,
  guardarProfesorDescargado,
  actualizarProfesorLocal,
  eliminarProfesorLocal,
  crearProfesorOffline,
  registrarOperacionPendiente,
  obtenerOperacionesPendientes,
  completarOperacionPendiente,
  marcarProfesorSincronizado,
  actualizarIdRemotoProfesor,
} from '../database/profesoresDB';

const API = 'https://profesores-backend.onrender.com/api/profesores';

export interface Profesores {
  id: number;
  nombre: string;
  foto: string;
  formacion: string;
  profesion: string;
  cargo: string;
  area: string;
}

interface ProfesoresContextType {
  profesores: Profesores[];
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

async function hayInternet(): Promise<boolean> {
  const estado = await NetInfo.fetch();

  return (
    estado.isConnected === true &&
    estado.isInternetReachable !== false
  );
}

export function ProfesoresProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [profesores, setProfesor] = useState<Profesores[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sincronizando = useRef(false);

  const cargarLocales = useCallback(async () => {
    const locales = await obtenerProfesores();
    setProfesor(locales.map(convertirLocal));
  }, []);

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

            const remoto: Profesores = await respuesta.json();

            await actualizarIdRemotoProfesor(
              op.profesor_id,
              remoto.id
            );

            await marcarProfesorSincronizado(op.profesor_id);
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

      await cargarLocales();
    } catch (e) {
      console.error('Error de sincronización:', e);
    } finally {
      sincronizando.current = false;
    }
  }, [cargarLocales]);

  useEffect(() => {
    cargarLocales().catch((e) => {
      console.error('Error cargando SQLite:', e);
      setError('No se pudieron cargar los profesores locales');
    });

    const unsubscribe = NetInfo.addEventListener((estado) => {
      if (
        estado.isConnected === true &&
        estado.isInternetReachable !== false
      ) {
        void sincronizar();
      }
    });

    return unsubscribe;
  }, [cargarLocales, sincronizar]);

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
          const respuesta = await fetch(API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(profesor),
          });

          if (!respuesta.ok) {
            setError('El servidor rechazó la creación');
            return false;
          }

          const remoto: Profesores = await respuesta.json();

          await guardarProfesorDescargado(
            datosServidor(remoto)
          );

          setProfesor((actuales) => [...actuales, remoto]);
          return true;
        } catch (e) {
          console.warn('Creación remota fallida; guardando localmente', e);
        }
      }

      const id = await crearProfesorOffline({
        ...profesor,
        foto_local_uri: null,
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
