import express from 'express';
import rateLimit from 'express-rate-limit';

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;
const REQUESTS_PER_WINDOW = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MODEL = 'gemini-3.5-flash-lite';

export function createAiRouter({
  apiKey = process.env.GEMINI_API_KEY,
  fetchImpl = globalThis.fetch,
  rateLimitOptions = {},
} = {}) {
  const router = express.Router();
  const limiter = rateLimit({
    windowMs: rateLimitOptions.windowMs ?? RATE_LIMIT_WINDOW_MS,
    limit: rateLimitOptions.limit ?? REQUESTS_PER_WINDOW,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({
        error: 'Has alcanzado el límite de solicitudes. Espera un minuto y vuelve a intentar.',
      }),
  });

  router.use(limiter);

  router.post('/chat', async (req, res) => {
    if (!apiKey) {
      return res.status(503).json({
        error: 'El servicio de IA no está configurado en el servidor.',
      });
    }

    const { messages } = req.body ?? {};
    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > MAX_MESSAGES
    ) {
      return res.status(400).json({
        error: `Envía entre 1 y ${MAX_MESSAGES} mensajes de conversación.`,
      });
    }

    const validMessages = messages.every(
      (message) =>
        message &&
        typeof message === 'object' &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0 &&
        message.content.length <= MAX_MESSAGE_LENGTH
    );

    if (!validMessages || messages.at(-1)?.role !== 'user') {
      return res.status(400).json({
        error: 'La conversación contiene mensajes inválidos.',
      });
    }

    const contents = messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content.trim() }],
    }));

    try {
      const upstream = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              maxOutputTokens: 1024,
              thinkingConfig: { thinkingLevel: 'LOW' },
            },
          }),
        }
      );

      if (upstream.status === 429) {
        return res.status(429).json({
          error: 'Se alcanzó el límite temporal del proveedor. Espera un momento y vuelve a intentar.',
        });
      }

      if (upstream.status === 401 || upstream.status === 403) {
        return res.status(503).json({
          error: 'El proveedor rechazó la clave o los permisos configurados.',
        });
      }

      if (!upstream.ok) {
        return res.status(502).json({
          error: 'El proveedor de IA no pudo completar la solicitud.',
        });
      }

      let result;
      try {
        result = await upstream.json();
      } catch {
        return res.status(502).json({
          error: 'El proveedor devolvió una respuesta inválida.',
        });
      }

      const reply = result?.candidates?.[0]?.content?.parts
        ?.map((part) => (typeof part.text === 'string' ? part.text : ''))
        .join('')
        .trim();

      if (!reply) {
        return res.status(502).json({
          error: 'El proveedor no devolvió texto. Intenta reformular la pregunta.',
        });
      }

      return res.status(200).json({ reply });
    } catch (error) {
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        return res.status(504).json({
          error: 'El proveedor tardó demasiado en responder. Inténtalo nuevamente.',
        });
      }

      return res.status(502).json({
        error: 'No fue posible conectar con el proveedor de IA.',
      });
    }
  });

  return router;
}