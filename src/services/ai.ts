export type ChatRole = 'user' | 'assistant';
export type ChatDomain = 'pokemon' | 'dragonball';
export type AiProvider = 'gemini' | 'openai' | 'groq';
export type AiTimeout = 20 | 40 | 80 | 160;

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

interface ChatResponse {
  reply?: unknown;
  error?: unknown;
}

const API_BASE_URL =
  process.env.EXPO_PUBLIC_AI_API_URL ??
  'https://pokemon-backend-rfz3.onrender.com';

export async function sendChatMessage(
  messages: ChatTurn[],
  domain: ChatDomain,
  provider: AiProvider = 'gemini',
  timeout: AiTimeout = 40
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);
  try {
    const response = await fetch(
      `${API_BASE_URL.replace(/\/+$/, '')}/api/ai/database-chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, messages, provider, timeout }),
        signal: controller.signal,
      }
    );
    const result: ChatResponse | null = await response
      .json()
      .catch(() => null);

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
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Inténtalo nuevamente.');
    }
    if (error instanceof TypeError) {
      throw new Error('No se pudo conectar con el servicio de IA.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
