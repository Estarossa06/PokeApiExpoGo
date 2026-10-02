import {createContext, useContext, useState, type ReactNode} from "react";

// --------------------------------------------------
// DATOS DEL POKÉMON
// --------------------------------------------------

export type Pokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
  image: string;
};

// --------------------------------------------------
// DATOS QUE COMPARTIRÁ EL CONTEXT
// --------------------------------------------------

type PokemonContextType = {
  pokemon: Pokemon | null;
  loading: boolean;
  error: string;
  buscarPokemon: (nombre: string) => Promise<void>;
};

// --------------------------------------------------
// CONTEXT
// --------------------------------------------------

const PokemonContext = createContext<PokemonContextType | undefined>(
  undefined
);

// --------------------------------------------------
// URL DEL MICROSERVICIO
// --------------------------------------------------

// Cambiar IP_DE_MI_PC por la IP local de tu computador.
const API_URL = "https://pokemon-backend-rfz3.onrender.com";

// --------------------------------------------------
// PROVIDER
// --------------------------------------------------
export function PokemonProvider({ children }: { children: ReactNode }) {
  const [pokemon, setPokemon] = useState<Pokemon |   null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // BUSCAR POKÉMON
  // --------------------------------------------------

  const buscarPokemon = async (nombre: string) => {
    const cleanName = nombre.trim().toLowerCase();

    setError("");

    if (!cleanName) {
      setPokemon(null);
      setError("Escribe el nombre de un Pokémon");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch( // consulta a nuestro servidor
        `${API_URL}/api/pokemon/${cleanName}`
      );

      const data = await response.json();

      if (!response.ok) {
        setPokemon(null);
        setError(data.error || "Pokémon no encontrado");
        return;
      }

      setPokemon(data);
    } catch (error) {
      console.error("🚨 ERROR REAL DEL FETCH:", error);

      setPokemon(null);
      setError("No se pudo conectar con el servidor local");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // DATOS DISPONIBLES PARA LAS PANTALLAS
  // --------------------------------------------------

  return (
    <PokemonContext.Provider
      value={{
        pokemon,
        loading,
        error,
        buscarPokemon,
      }}
    >
      {children}
    </PokemonContext.Provider>
  );
}

// --------------------------------------------------
// HOOK PARA USAR EL CONTEXT
// --------------------------------------------------

export function usePokemon() {
  const context = useContext(PokemonContext);

  if (!context) {
    throw new Error(
      "usePokemon debe utilizarse dentro de PokemonProvider"
    );
  }

  return context;
}