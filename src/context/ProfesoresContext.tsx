import { createContext, useContext, useState, ReactNode } from 'react';

// Datos de un profesor
export interface Profesores {
  id: number;
  nombre: string;
  foto: string;
  formacion: string;
  profesion: string;
  cargo: string;
  area: string;
}

// Funciones y datos compartidos
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

const ProfesoresContext = createContext<ProfesoresContextType | undefined>(
  undefined
);

export function ProfesoresProvider({ children }: { children: ReactNode }) {
  const [profesores, setProfesor] = useState<Profesores[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscarProfesor = async (nombre: string) => {
    try {
      setLoading(true);
      setError(null);
      setProfesor([]);

      const respuesta = await fetch(
        `https://profesores-backend.onrender.com/api/profesores?nombre=${encodeURIComponent(nombre)}`
      );

      if (!respuesta.ok) {
        const datos = await respuesta.json();

        if (respuesta.status === 404) {
          throw new Error(datos.error || 'Profesor no encontrado');
        }

        throw new Error(
          datos.error || 'Error al consultar el microservicio'
        );
      }

      const datos: Profesores[] = await respuesta.json();
      setProfesor(datos);

    } catch (error) {

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Error de conexión con el servidor');
      }

    } finally {
      setLoading(false);
    }
  };

  const crearProfesor = async (profesor: Omit<Profesores, 'id'>): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const respuesta = await fetch(
        'https://profesores-backend.onrender.com/api/profesores',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profesor),
        }
      );

      if (!respuesta.ok) {
        throw new Error('Error al crear el profesor');
      }

      await respuesta.json();

      return true;

    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Error de conexión con el servidor');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const actualizarProfesor = async (
    profesor: Profesores
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const respuesta = await fetch(
        'https://profesores-backend.onrender.com/api/profesores',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profesor),
        }
      );

      if (!respuesta.ok) {
        if (respuesta.status === 404) {
          throw new Error('Profesor no encontrado');
        }

        throw new Error('Error al actualizar el profesor');
      }

      const profesorActualizado: Profesores = await respuesta.json();

      setProfesor((listaActual) =>
        listaActual.map((item) =>
          item.id === profesorActualizado.id
            ? profesorActualizado
            : item
        )
      );

      return true;
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Error de conexión con el servidor');
      }

      return false;
    } finally {
      setLoading(false);
    }
  };

  const eliminarProfesor = async (
    id: number
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const respuesta = await fetch(
        `https://profesores-backend.onrender.com/api/profesores?id=${id}`,
        {
          method: 'DELETE',
        }
      );

      if (!respuesta.ok) {
        if (respuesta.status === 404) {
          throw new Error('Profesor no encontrado');
        }

        throw new Error('Error al eliminar el profesor');
      }

      await respuesta.json();

      setProfesor((listaActual) =>
        listaActual.filter((item) => item.id !== id)
      );

      return true;
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Error de conexión con el servidor');
      }

      return false;
    } finally {
      setLoading(false);
    }
  };

  // Limpiar el resultado actual
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