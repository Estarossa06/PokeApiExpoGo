import {createContext, useContext, useState, type ReactNode } from "react";

export type Transformation = {
  name: string;
  image: string;
  ki: string;
};

export type Character = {
  name: string;
  image: string;
  race: string;
  description: string;
  transformations: Transformation[];
};

type DragonBallContextType = {
  character: Character | null;
  loading: boolean;
  error: string;
  buscarCharacter: (nombre: string) => Promise<void>;
};

const DragonBallContext = createContext<
  DragonBallContextType | undefined
>(undefined);

const API_URL = "http://172.16.3.0:3001";

export function DragonBallProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buscarCharacter = async (nombre: string) => {
    const cleanName = nombre.trim().toLowerCase();

    setError("");

    if (!cleanName) {
      setCharacter(null);
      setError("Escribe el nombre de un personaje");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/dragonball/${cleanName}`
      );

      const data = await response.json();

      if (!response.ok) {
        setCharacter(null);
        setError(data.error || "Personaje no encontrado");
        return;
      }

      setCharacter(data);
    } catch (error) {
      setCharacter(null);
      setError("No se pudo conectar con el servidor local");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DragonBallContext.Provider
      value={{
        character,
        loading,
        error,
        buscarCharacter,
      }}
    >
      {children}
    </DragonBallContext.Provider>
  );
}

export function useDragonBall() {
  const context = useContext(DragonBallContext);

  if (!context) {
    throw new Error(
      "useDragonBall debe utilizarse dentro de DragonBallProvider"
    );
  }

  return context;
}