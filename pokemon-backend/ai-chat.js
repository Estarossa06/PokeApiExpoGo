import express from 'express';
import rateLimit from 'express-rate-limit';

// Límites de entrada y frecuencia: el límite temporal de la ruta es distinto al timeout de IA.
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;
const REQUESTS_PER_WINDOW = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
// Gemini usa este modelo; OpenAI y Groq seleccionan sus modelos al construir el cuerpo de la petición.
const MODEL = 'gemini-3.5-flash-lite';
const PROVIDERS = ['gemini', 'openai', 'groq'];
// Valores permitidos en segundos. El servidor valida la selección recibida desde la app.
const TIMEOUTS = [20, 40, 80, 160];
const DEFAULT_DRAGONBALL_API_URL = 'https://dragonball-python-bpao.onrender.com';

const DOMAIN_LABELS = {
  pokemon: 'Pokémon',
  dragonball: 'Dragon Ball',
};

/** Quita tildes y diferencias entre mayúsculas y minúsculas para comparar nombres. */
function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

/** Busca el último nombre registrado mencionado en una pregunta. */
function encontrarRegistroMencionado(registros, mensaje) {
  const pregunta = normalizarTexto(mensaje);

  return registros
    .filter((registro) => typeof registro?.name === 'string' && registro.name.trim())
    .map((registro) => ({
      registro,
      posicion: pregunta.lastIndexOf(normalizarTexto(registro.name)),
    }))
    .filter((coincidencia) => coincidencia.posicion >= 0)
    .sort((a, b) =>
      b.posicion - a.posicion || b.registro.name.length - a.registro.name.length
    )[0]?.registro;
}

const PALABRAS_DE_PREGUNTA = new Set([
  'a', 'al', 'algo', 'algun', 'alguna', 'algunos', 'algunas', 'como', 'cual',
  'cuales', 'cuando', 'cuanto', 'cuanta', 'cuantos', 'cuantas', 'de', 'del',
  'dime', 'donde', 'el', 'ella', 'ellas', 'ellos', 'en', 'es', 'esta', 'este',
  'estos', 'estas', 'hablame', 'hay', 'la', 'las', 'lo', 'los', 'mas', 'me',
  'mi', 'mis', 'puede', 'pueden', 'puedes', 'que', 'quien', 'quienes', 'sobre',
  'su', 'sus', 'tiene', 'tienen', 'tipo', 'un', 'una', 'unos', 'unas', 'y',
  'altura', 'color', 'edad', 'genero', 'habilidad', 'mide', 'pesa', 'peso',
  'raza', 'transformacion', 'transformaciones', 'ataque', 'ataques',
]);

/** Reconoce preguntas de seguimiento como «¿cuánto mide?» que dependen del turno anterior. */
function pareceSeguimientoSinNombre(mensaje) {
  const palabras = normalizarTexto(mensaje).match(/[a-z0-9]+/g) ?? [];
  return palabras.length > 0 && palabras.every((palabra) => PALABRAS_DE_PREGUNTA.has(palabra));
}

/** Evita reutilizar el contexto anterior si la pregunta introduce un nombre no registrado. */
function contieneNombreNoRegistrado(registros, mensaje) {
  const nombres = new Set(
    registros
      .filter((registro) => typeof registro?.name === 'string')
      .map((registro) => normalizarTexto(registro.name))
  );
  const palabrasCapitalizadas = mensaje.match(/\b\p{Lu}[\p{L}'’-]*\b/gu) ?? [];
  const palabrasDePregunta = new Set(['a', 'al', 'como', 'cual', 'cuales', 'cuando', 'cuanto', 'cuanta', 'cuantos', 'cuantas', 'dime', 'donde', 'el', 'ella', 'es', 'esta', 'este', 'hay', 'la', 'lo', 'los', 'me', 'que', 'quien', 'sobre', 'un', 'una', 'y']);

  return palabrasCapitalizadas.some((palabra) => {
    const normalizada = normalizarTexto(palabra);
    return !nombres.has(normalizada) && !palabrasDePregunta.has(normalizada);
  });
}

/** Recorre hacia atrás los mensajes del usuario para recuperar el último registro válido. */
function buscarRegistroEnHistorial(registros, messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role !== 'user') continue;
    const registro = encontrarRegistroMencionado(registros, messages[index].content);
    if (registro) return { registro, index };
    if (contieneNombreNoRegistrado(registros, messages[index].content)) return null;
  }
  return null;
}

/**
 * Crea la ruta del chat. Las dependencias se inyectan para configurar el servidor
 * y poder sustituir fetch, temporizadores o el limitador en pruebas.
 */
export function createAiRouter({
  apiKeys = {
    gemini: process.env.GEMINI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    groq: process.env.GROQ_API_KEY,
  },
  apiKey,
  pool,
  dataFetchImpl = globalThis.fetch,
  dragonballApiUrl = process.env.DRAGONBALL_API_URL || DEFAULT_DRAGONBALL_API_URL,
  fetchImpl = globalThis.fetch,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
  rateLimitOptions = {},
} = {}) {
  const router = express.Router();
  // Limita por IP (10 solicitudes por minuto de forma predeterminada), antes de validar la ruta.
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

  // index.js monta este router en /api/ai, por lo que la ruta completa es /api/ai/database-chat.
  router.post('/database-chat', async (req, res) => {
    const { domain, messages, provider = 'gemini', timeout = 40 } = req.body ?? {};
    // Proveedor o timeout desconocido y dominio no soportado producen 400; el servidor no confía
    // únicamente en las opciones que ofrece la interfaz.
    if (!PROVIDERS.includes(provider) || !TIMEOUTS.includes(timeout)) {
      return res.status(400).json({ error: 'El proveedor o tiempo de espera no es válido.' });
    }
    if (!Object.hasOwn(DOMAIN_LABELS, domain)) {
      return res.status(400).json({
        error: 'Selecciona el dominio Pokémon o Dragon Ball.',
      });
    }

    // Las claves permanecen en el servidor; `apiKey` es un alias de compatibilidad para Gemini.
    const selectedApiKey = apiKey && provider === 'gemini' ? apiKey : apiKeys[provider];
    if (!selectedApiKey) {
      // La falta de configuración es un problema del servidor y se devuelve como 503.
      return res.status(503).json({ error: 'El servicio de IA no está configurado en el servidor.' });
    }

    // El historial debe tener entre 1 y 20 mensajes y cada texto no puede superar 4000 caracteres.
    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > MAX_MESSAGES
    ) {
      // Una lista vacía, no-array o mayor de 20 mensajes es una petición inválida (400).
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
      // Cada mensaje requiere rol conocido, texto no vacío y hasta 4000 caracteres;
      // además, la conversación debe terminar con el turno del usuario.
      return res.status(400).json({
        error: 'La conversación contiene mensajes inválidos.',
      });
    }

    // La consulta de datos ocurre antes del timeout de proveedor; aquí no se configura un timeout propio.
    let registros;
    try {
      if (domain === 'pokemon') {
        // Solo se leen los campos que la app puede mostrar o usar como contexto del asistente.
        if (!pool) throw new Error('PostgreSQL no está configurado');
        const resultado = await pool.query(
          'SELECT id, name, height, weight, image FROM pokemons'
        );
        registros = resultado.rows;
      } else {
        // Dragon Ball se obtiene del microservicio Python, que a su vez consulta su almacén de datos.
        const respuestaDatos = await dataFetchImpl(
          `${dragonballApiUrl.replace(/\/+$/, '')}/api/characters`
        );
        if (!respuestaDatos.ok) throw new Error('Microservicio Dragon Ball no disponible');
        registros = await respuestaDatos.json();
        if (!Array.isArray(registros)) throw new Error('Respuesta Dragon Ball inválida');
      }
    } catch {
      // Errores SQL, de red o una respuesta incorrecta del microservicio se reportan como 503.
      return res.status(503).json({
        error: `No se pudo consultar la base de datos de ${DOMAIN_LABELS[domain]}.`,
      });
    }

    // El servidor confirma que el registro exista antes de permitir que la IA responda sobre él.
    const preguntaActual = messages.at(-1).content.trim();
    const registroActual = encontrarRegistroMencionado(registros, preguntaActual);
    const historialRegistro = buscarRegistroEnHistorial(registros, messages.slice(0, -1));
    const puedeUsarContexto =
      !registroActual &&
      historialRegistro &&
      pareceSeguimientoSinNombre(preguntaActual) &&
      !contieneNombreNoRegistrado(registros, preguntaActual);
    const registro = registroActual ?? (puedeUsarContexto ? historialRegistro.registro : null);
    if (!registro) {
      // Es una respuesta normal del chat (200); se evita gastar una llamada al proveedor.
      return res.status(200).json({
        reply: `No encontré ese registro en la base de datos de ${DOMAIN_LABELS[domain]}. Menciona el nombre de un registro disponible.`,
      });
    }

    // Solo se incluye el tramo previo necesario cuando la pregunta actual continúa la conversación.
    const historialRelevante = !registroActual && puedeUsarContexto
      ? messages.slice(historialRegistro.index, -1)
      : [];
    const textoHistorial = historialRelevante.length
      ? `Contexto previo de esta conversación en el dominio ${DOMAIN_LABELS[domain]}:\n${historialRelevante
          .map((message) => `${message.role === 'user' ? 'Usuario' : 'Asistente'}: ${message.content}`)
          .join('\n')}`
      : '';

    // Se entrega al proveedor la pregunta, el contexto relevante y un único registro autorizado.
    const contents = [{
      role: 'user',
      parts: [{
        text: [
          `Pregunta actual del usuario: ${preguntaActual}`,
          textoHistorial,
          `Único registro disponible de la base de datos de ${DOMAIN_LABELS[domain]}: ${JSON.stringify(registro)}`,
          `Campos disponibles en este registro: ${Object.keys(registro).join(', ')}`,
        ].join('\n'),
      }],
    }];

    // Este timeout empieza después de consultar y validar los registros. Su señal se pasa al fetch
    // del proveedor; no limita la consulta SQL ni el fetch del microservicio de Dragon Ball. La app
    // también mantiene un AbortController independiente para toda la petición HTTP al backend.
    const controller = new AbortController();
    const timeoutId = setTimeoutImpl(() => controller.abort(), timeout * 1000);
    try {
      // Cada proveedor tiene una URL y un formato de petición propios.
      const isGemini = provider === 'gemini';
      const providerUrl = isGemini
        ? `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
        : provider === 'openai'
          ? 'https://api.openai.com/v1/chat/completions'
        : 'https://api.groq.com/openai/v1/chat/completions';
      const prompt = `La base de datos confirma la existencia e identidad de ${registro.name} en el dominio ${DOMAIN_LABELS[domain]}. Responde sobre ${registro.name} usando su registro y tu conocimiento general entrenado cuando falten datos. No mezcles entidades, no uses herramientas, buscadores ni APIs externas.`;
      // Para OpenAI y Groq se usan sus modelos propios; el historial útil se resume en un turno user.
      const requestBody = isGemini
        ? {
            systemInstruction: { parts: [{ text: prompt }] },
            contents,
            generationConfig: {
              maxOutputTokens: 1024,
              thinkingConfig: { thinkingLevel: 'LOW' },
            },
          }
        : {
            model: provider === 'openai' ? 'gpt-4o-mini' : 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: prompt },
              { role: 'user', content: contents[0].parts[0].text },
            ],
            max_tokens: 1024,
          };
      // El mismo AbortSignal cancela la llamada externa cuando vence el límite del backend.
      const upstream = await fetchImpl(providerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isGemini ? { 'x-goog-api-key': selectedApiKey } : { Authorization: `Bearer ${selectedApiKey}` }),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      // 429 del proveedor se conserva como 429; credenciales rechazadas se traducen a 503.
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
        // Los demás estados no exitosos del proveedor se comunican como error de pasarela (502).
        return res.status(502).json({
          error: 'El proveedor de IA no pudo completar la solicitud.',
        });
      }

      let result;
      try {
        result = await upstream.json();
      } catch (error) {
        if (error?.name === 'AbortError' || error?.name === 'TimeoutError') throw error;
        // Una respuesta no JSON del proveedor también se considera una respuesta de pasarela inválida.
        return res.status(502).json({
          error: 'El proveedor devolvió una respuesta inválida.',
        });
      }

      // Gemini y las APIs compatibles con OpenAI devuelven el texto en rutas JSON diferentes.
      const reply = isGemini
        ? result?.candidates?.[0]?.content?.parts
            ?.map((part) => (typeof part.text === 'string' ? part.text : ''))
            .join('')
            .trim()
        : result?.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        // Una respuesta sin texto no es un timeout: el proveedor contestó, pero sin contenido utilizable.
        return res.status(502).json({
          error: 'El proveedor no devolvió texto. Intenta reformular la pregunta.',
        });
      }

      return res.status(200).json({ reply });
    } catch (error) {
      // 504 identifica el timeout de proveedor; otros fallos de la llamada externa se responden como 502.
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        return res.status(504).json({
          error: 'El proveedor tardó demasiado en responder. Inténtalo nuevamente.',
        });
      }

      return res.status(502).json({
        error: 'No fue posible conectar con el proveedor de IA.',
      });
    } finally {
      // También se ejecuta al responder antes de tiempo o ante errores.
      clearTimeoutImpl(timeoutId);
    }
  });

  return router;
}
