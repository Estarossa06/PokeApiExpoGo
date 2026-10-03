import { createContext, useContext, useState, ReactNode } from 'react';

// Datos de un profesor
interface Profesor {
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
  profesor: Profesor | null;
  loading: boolean;
  error: string | null;
  buscarProfesor: (nombre: string) => Promise<void>;
  limpiarProfesor: () => void;
}

const ProfesoresContext = createContext<ProfesoresContextType | undefined>(
  undefined
);

export function ProfesoresProvider({ children }: { children: ReactNode }) {
  const [profesor, setProfesor] = useState<Profesor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscarProfesor = async (nombre: string) => {
    try {
      setLoading(true);
      setError(null);
      setProfesor(null);

      const respuesta = await fetch(
        `https://profesores-backend.onrender.com/api/profesores?nombre=${encodeURIComponent(nombre)}`
      );

      if (!respuesta.ok) {
        if (respuesta.status === 404) {
          throw new Error('Profesor no encontrado');
        }

        throw new Error('Error al consultar el microservicio');
      }

      const datos: Profesor = await respuesta.json();

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

  // Limpiar el resultado actual
  const limpiarProfesor = () => {
    setProfesor(null);
    setError(null);
  };

  return (
    <ProfesoresContext.Provider
      value={{
        profesor,
        loading,
        error,
        buscarProfesor,
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