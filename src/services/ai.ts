// Estos valores describen el formato compartido entre la pantalla y el backend.
export type ChatRole = 'user' | 'assistant';
export type ChatDomain = 'pokemon' | 'dragonball';
export type AiProvider = 'gemini' | 'openai' | 'groq';
export type AiTimeout = 20 | 40 | 80 | 160;

/** Un mensaje de conversación con su emisor y contenido de texto. */
export interface ChatTurn {
  role: ChatRole;
  content: string;
}

// Los campos se reciben como unknown porque la respuesta HTTP no está validada por TypeScript.
interface ChatResponse {
  reply?: unknown;
  error?: unknown;
}

// Permite cambiar el servidor en desarrollo; si no hay variable pública usa el backend desplegado.
const API_BASE_URL =
  process.env.EXPO_PUBLIC_AI_API_URL ??
  'https://pokemon-backend-rfz3.onrender.com';

/**
 * Envía al backend el historial y las preferencias de la pantalla, y devuelve
 * únicamente el texto de respuesta ya validado.
 */
export async function sendChatMessage(
  messages: ChatTurn[],
  domain: ChatDomain,
  provider: AiProvider = 'gemini',
  timeout: AiTimeout = 40
): Promise<string> {
  // Este temporizador limita la solicitud completa desde la app (incluye backend y proveedor).
  // El mismo valor `timeout` también se envía al backend, que inicia su propio límite
  // únicamente cuando va a llamar al proveedor; son dos temporizadores independientes.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);
  try {
    // El backend monta esta ruta bajo /api/ai y recibe dominio, historial, proveedor y segundos.
    const response = await fetch(
      `${API_BASE_URL.replace(/\/+$/, '')}/api/ai/database-chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, messages, provider, timeout }),
        signal: controller.signal,
      }
    );
    // Un cuerpo que no sea JSON se convierte en null para tratarlo como respuesta inválida.
    const result: ChatResponse | null = await response
      .json()
      .catch(() => null);

    // Los errores HTTP del backend se propagan usando su mensaje cuando está disponible.
    if (!response.ok) {
      throw new Error(
        typeof result?.error === 'string'
          ? result.error
          : 'No se pudo obtener una respuesta del asistente.'
      );
    }

    if (typeof result?.reply !== 'string' || !result.reply.trim()) {
      throw new Error('El servidor devolvió una respuesta vacía o inválida.');
    }

    return result.reply.trim();
  } catch (error) {
    // AbortError corresponde al límite de esta app; TypeError normalmente indica fallo de conexión.
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Inténtalo nuevamente.');
    }
    if (error instanceof TypeError) {
      throw new Error('No se pudo conectar con el servicio de IA.');
    }
    throw error;
  } finally {
    // Evita dejar temporizadores activos si la respuesta llegó antes del límite.
    clearTimeout(timeoutId);
  }
}
