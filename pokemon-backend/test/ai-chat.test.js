import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { afterEach, test } from 'node:test';
import { createAiRouter } from '../ai-chat.js';

const servers = new Set();
const pokemonPool = {
  query: async () => ({
    rows: [{
      id: 1,
      name: 'Bulbasaur',
      height: 7,
      weight: 69,
      image: 'https://example.test/bulbasaur.png',
    }],
  }),
};

async function withServer(options, run) {
  const app = express();
  app.use(express.json());
  app.use('/api/ai', createAiRouter({ pool: pokemonPool, ...options }));

  const server = app.listen(0, '127.0.0.1');
  servers.add(server);
  await once(server, 'listening');

  try {
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}/api/ai/database-chat`);
  } finally {
    server.close();
    servers.delete(server);
  }
}

afterEach(async () => {
  await Promise.all(
    [...servers].map(
      (server) => new Promise((resolve) => server.close(resolve))
    )
  );
});

test('sends conversation to Gemini and returns only the generated text', async () => {
  const apiKey = 'test-secret-key';
  let requestUrl;
  let requestOptions;

  await withServer(
    {
      apiKey,
      fetchImpl: async (url, options) => {
        requestUrl = url;
        requestOptions = options;
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Hola desde Gemini.' }] } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      },
    },
    async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'pokemon',
          messages: [
            { role: 'user', content: '¿Qué datos tienes de Bulbasaur?' },
            { role: 'assistant', content: 'Veo su ficha.' },
            { role: 'user', content: 'Cuéntame sobre Bulbasaur.' },
          ],
        }),
      });

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { reply: 'Hola desde Gemini.' });
      assert.match(requestUrl, /models\/gemini-3\.5-flash-lite:generateContent$/);
      assert.equal(requestUrl.includes(apiKey), false);
      assert.equal(requestOptions.headers['x-goog-api-key'], apiKey);
      assert.ok(requestOptions.signal instanceof AbortSignal);
      const providerRequest = JSON.parse(requestOptions.body);
      assert.deepEqual(providerRequest.generationConfig, {
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingLevel: 'LOW' },
      });
      assert.equal(providerRequest.contents.length, 1);
      assert.match(providerRequest.contents[0].parts[0].text, /Bulbasaur/);
      assert.match(providerRequest.contents[0].parts[0].text, /"weight":69/);
      assert.match(providerRequest.systemInstruction.parts[0].text, /conocimiento general entrenado/i);
      assert.match(providerRequest.systemInstruction.parts[0].text, /No uses herramientas/i);
    }
  );
});

test('rejects invalid conversations without calling the provider', async () => {
  let called = false;

  await withServer(
    { apiKey: 'test-key', fetchImpl: async () => { called = true; } },
    async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'pokemon',
          messages: [{ role: 'system', content: 'No' }],
        }),
      });

      assert.equal(response.status, 400);
      assert.equal(called, false);
    }
  );
});

test('reports missing credentials without revealing provider details', async () => {
  await withServer({ apiKey: '' }, async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: 'pokemon',
        messages: [{ role: 'user', content: 'Hola' }],
      }),
    });

    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /no está configurado/i);
  });
});

test('maps provider rate limits to a clear 429 response', async () => {
  await withServer(
    {
      apiKey: 'test-key',
      fetchImpl: async () => new Response('private provider details', { status: 429 }),
    },
    async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'pokemon',
          messages: [{ role: 'user', content: '¿Qué datos tienes de Bulbasaur?' }],
        }),
      });

      assert.equal(response.status, 429);
      assert.doesNotMatch(JSON.stringify(await response.json()), /private provider details/);
    }
  );
});

test('maps upstream timeouts to a gateway timeout', async () => {
  await withServer(
    {
      apiKey: 'test-key',
      fetchImpl: async () => {
        const error = new Error('timeout');
        error.name = 'TimeoutError';
        throw error;
      },
    },
    async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'pokemon',
          messages: [{ role: 'user', content: '¿Qué datos tienes de Bulbasaur?' }],
        }),
      });

      assert.equal(response.status, 504);
    }
  );
});

test('limits requests per IP before calling the provider again', async () => {
  let providerCalls = 0;

  await withServer(
    {
      apiKey: 'test-key',
      rateLimitOptions: { limit: 2, windowMs: 60_000 },
      fetchImpl: async () => {
        providerCalls += 1;
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Respuesta' }] } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      },
    },
    async (url) => {
      const request = () =>
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain: 'pokemon',
            messages: [{ role: 'user', content: '¿Qué datos tienes de Bulbasaur?' }],
          }),
        });

      assert.equal((await request()).status, 200);
      assert.equal((await request()).status, 200);

      const limited = await request();
      assert.equal(limited.status, 429);
      assert.equal(providerCalls, 2);
      assert.ok(limited.headers.has('ratelimit-limit'));
    }
  );
});

test('does not fall back to another model when Gemini is unavailable', async () => {
  let providerCalls = 0;
  let requestUrl;

  await withServer(
    {
      apiKey: 'test-key',
      fetchImpl: async (url) => {
        providerCalls += 1;
        requestUrl = url;
        return new Response('model unavailable', { status: 404 });
      },
    },
    async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'pokemon',
          messages: [{ role: 'user', content: '¿Qué datos tienes de Bulbasaur?' }],
        }),
      });

      assert.equal(response.status, 502);
      assert.equal(providerCalls, 1);
      assert.match(requestUrl, /models\/gemini-3\.5-flash-lite:generateContent$/);
    }
  );
});

test('does not call Gemini when the selected database has no matching record', async () => {
  let providerCalls = 0;

  await withServer(
    { apiKey: 'test-key', fetchImpl: async () => { providerCalls += 1; } },
    async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'pokemon',
          messages: [{ role: 'user', content: '¿Cuál es el peso de Pikachu?' }],
        }),
      });
      const result = await response.json();

      assert.equal(response.status, 200);
      assert.match(result.reply, /no encontré/i);
      assert.equal(providerCalls, 0);
    }
  );
});

test('uses only the current question and record after an unlisted Pokemon was asked about', async () => {
  let providerRequest;

  await withServer(
    {
      apiKey: 'test-key',
      fetchImpl: async (_url, options) => {
        providerRequest = JSON.parse(options.body);
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Bulbasaur es de tipo Planta y Veneno.' }] } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      },
    },
    async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'pokemon',
          messages: [
            { role: 'user', content: '¿Qué tipo es Ditto?' },
            { role: 'assistant', content: 'No encontré ese registro en la base de datos.' },
            { role: 'user', content: '¿Cuánto pesa Bulbasaur?' },
          ],
        }),
      });

      assert.equal(response.status, 200);
      assert.match(providerRequest.contents[0].parts[0].text, /Pregunta actual.*Bulbasaur/i);
      assert.doesNotMatch(providerRequest.contents[0].parts[0].text, /Ditto/i);
      assert.match(providerRequest.contents[0].parts[0].text, /"name":"Bulbasaur"/);
      assert.match(providerRequest.systemInstruction.parts[0].text, /conocimiento general entrenado/i);
      assert.doesNotMatch(providerRequest.systemInstruction.parts[0].text, /Ditto/i);
    }
  );
});

test('does not resolve an unlisted current Pokemon from a previous listed Pokemon mention', async () => {
  let providerCalls = 0;

  await withServer(
    { apiKey: 'test-key', fetchImpl: async () => { providerCalls += 1; } },
    async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'pokemon',
          messages: [
            { role: 'user', content: '¿Qué datos tienes de Bulbasaur?' },
            { role: 'assistant', content: 'Veo su ficha.' },
            { role: 'user', content: '¿Qué tipo es Ditto?' },
          ],
        }),
      });

      assert.equal(response.status, 200);
      assert.match((await response.json()).reply, /no encontré/i);
      assert.equal(providerCalls, 0);
    }
  );
});

test('answers linked questions about listed Pokemon but never calls Gemini for an unlisted Pokemon', async () => {
  let providerCalls = 0;
  const conversation = [];
  const generatedReplies = [
    'Bulbasaur es de tipo Planta y Veneno.',
    'Bulbasaur pesa 69 hectogramos.',
  ];

  await withServer(
    {
      apiKey: 'test-key',
      fetchImpl: async () => {
        const reply = generatedReplies[providerCalls];
        providerCalls += 1;
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: reply }] } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      },
    },
    async (url) => {
      const questions = [
        '¿Qué tipo tiene Bulbasaur?',
        '¿Qué altura tiene Bulbasaur?',
        '¿Qué tipo tiene Ditto?',
      ];
      const replies = [];

      for (const question of questions) {
        conversation.push({ role: 'user', content: question });
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: 'pokemon', messages: conversation }),
        });
        const result = await response.json();

        assert.equal(response.status, 200);
        assert.equal(typeof result.reply, 'string');
        replies.push(result.reply);
        conversation.push({ role: 'assistant', content: result.reply });
      }

      assert.match(replies[0], /Bulbasaur.*Planta y Veneno/i);
      assert.match(replies[1], /Bulbasaur pesa 69 hectogramos/i);
      assert.match(replies[2], /no encontré ese registro/i);
      assert.doesNotMatch(replies[2], /tipo|transform|estadísticas|habilidad/i);
      assert.equal(providerCalls, 2);
    }
  );
});

test('calls Gemini for missing attributes when the Pokemon exists in the database', async () => {
  let providerCalls = 0;
  let providerRequest;

  await withServer(
    {
      apiKey: 'test-key',
      pool: {
        query: async () => ({
          rows: [{
            id: 8,
            name: 'Wartortle',
            height: 10,
            weight: 225,
            image: 'https://example.test/wartortle.png',
          }],
        }),
      },
      fetchImpl: async (_url, options) => {
        providerCalls += 1;
        providerRequest = JSON.parse(options.body);
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Wartortle es de tipo Agua.' }] } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      },
    },
    async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'pokemon',
          messages: [{ role: 'user', content: '¿Qué tipo tiene Wartortle?' }],
        }),
      });
      const result = await response.json();

      assert.equal(response.status, 200);
      assert.equal(result.reply, 'Wartortle es de tipo Agua.');
      assert.equal(providerCalls, 1);
      assert.match(providerRequest.contents[0].parts[0].text, /"name":"Wartortle"/);
      assert.doesNotMatch(providerRequest.contents[0].parts[0].text, /"type"/);
      assert.match(providerRequest.systemInstruction.parts[0].text, /conocimiento general entrenado/i);
    }
  );
});

test('resolves contextual follow-up questions only against the selected domain records', async () => {
  const cases = [
    {
      domain: 'pokemon',
      name: 'Bulbasaur',
      messages: [
        { role: 'user', content: '¿Qué datos tienes de Bulbasaur?' },
        { role: 'assistant', content: 'Bulbasaur tiene altura 7 y peso 69.' },
        { role: 'user', content: '¿Cuánto pesa?' },
      ],
      fetchData: undefined,
      expectedData: /"weight":69/,
    },
    {
      domain: 'dragonball',
      name: 'Goku',
      messages: [
        { role: 'user', content: '¿Qué raza tiene Goku?' },
        { role: 'assistant', content: 'Goku es Saiyan.' },
        { role: 'user', content: '¿Y su género?' },
      ],
      fetchData: async () => new Response(
        JSON.stringify([{ id: 1, name: 'Goku', race: 'Saiyan', gender: 'Male' }]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ),
      expectedData: /"gender":"Male"/,
    },
  ];

  for (const example of cases) {
    let providerCalls = 0;
    let providerRequest;
    await withServer({
      apiKey: 'test-key',
      ...(example.fetchData ? { dataFetchImpl: example.fetchData } : {}),
      fetchImpl: async (_url, options) => {
        providerCalls += 1;
        providerRequest = JSON.parse(options.body);
        return new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: `${example.name} contexto recibido.` }] } }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      },
    }, async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: example.domain, messages: example.messages }),
      });

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { reply: `${example.name} contexto recibido.` });
      assert.equal(providerCalls, 1);
      assert.match(providerRequest.contents[0].parts[0].text, /Contexto previo/);
      assert.match(providerRequest.contents[0].parts[0].text, /Usuario:.*Bulbasaur|Usuario:.*Goku/);
      assert.match(providerRequest.contents[0].parts[0].text, example.expectedData);
      assert.match(providerRequest.systemInstruction.parts[0].text, new RegExp(`dominio ${example.domain === 'pokemon' ? 'Pokémon' : 'Dragon Ball'}`));
    });
  }
});

test('does not reuse prior entity context when the current question names an unknown record', async () => {
  let providerCalls = 0;
  await withServer({
    apiKey: 'test-key',
    fetchImpl: async () => { providerCalls += 1; },
  }, async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: 'pokemon',
        messages: [
          { role: 'user', content: '¿Qué datos tienes de Bulbasaur?' },
          { role: 'assistant', content: 'Bulbasaur tiene altura 7 y peso 69.' },
          { role: 'user', content: '¿Qué tipo tiene Ditto?' },
        ],
      }),
    });

    assert.equal(response.status, 200);
    assert.match((await response.json()).reply, /no encontré ese registro/i);
    assert.equal(providerCalls, 0);
  });
});

test('does not resume an older entity after an unknown entity interrupted the conversation', async () => {
  let providerCalls = 0;
  await withServer({
    apiKey: 'test-key',
    fetchImpl: async () => { providerCalls += 1; },
  }, async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: 'pokemon',
        messages: [
          { role: 'user', content: '¿Qué datos tienes de Bulbasaur?' },
          { role: 'assistant', content: 'Bulbasaur tiene altura 7 y peso 69.' },
          { role: 'user', content: '¿Qué tipo tiene Ditto?' },
          { role: 'assistant', content: 'No encontré ese registro.' },
          { role: 'user', content: '¿Y su peso?' },
        ],
      }),
    });

    assert.equal(response.status, 200);
    assert.match((await response.json()).reply, /no encontré ese registro/i);
    assert.equal(providerCalls, 0);
  });
});

test('Dragon Ball requests use only the first-party Dragon Ball data service', async () => {
  let dataUrl;
  let providerRequest;

  await withServer(
    {
      apiKey: 'test-key',
      pool: { query: async () => { throw new Error('Pokémon DB must not be queried'); } },
      dataFetchImpl: async (url) => {
        dataUrl = url;
        return new Response(
          JSON.stringify([{ id: 1, name: 'Goku', race: 'Saiyan', gender: 'Male', image: 'goku.png' }]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      },
      fetchImpl: async (_url, options) => {
        providerRequest = JSON.parse(options.body);
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'En la base figura Goku, raza Saiyan.' }] } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      },
    },
    async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'dragonball',
          messages: [{ role: 'user', content: 'Háblame de Goku.' }],
        }),
      });

      assert.equal(response.status, 200);
      assert.match(dataUrl, /dragonball-python-bpao\.onrender\.com\/api\/characters$/);
      assert.match(providerRequest.contents[0].parts[0].text, /"race":"Saiyan"/);
      assert.match(providerRequest.systemInstruction.parts[0].text, /conocimiento general entrenado/i);
    }
  );
});

test('reports Dragon Ball service connection failures without calling an AI provider', async () => {
  let providerCalls = 0;

  await withServer({
    apiKey: 'test-key',
    dataFetchImpl: async () => { throw new TypeError('network unavailable'); },
    fetchImpl: async () => { providerCalls += 1; },
  }, async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: 'dragonball',
        messages: [{ role: 'user', content: 'Háblame de Goku.' }],
      }),
    });

    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /base de datos de Dragon Ball/);
    assert.equal(providerCalls, 0);
  });
});

test('rejects failed HTTP and malformed Dragon Ball responses before calling an AI provider', async (t) => {
  const invalidResponses = [
    ['non-success HTTP status', async () => new Response('unavailable', { status: 502 })],
    ['non-array JSON payload', async () => new Response(JSON.stringify({ characters: [] }), { status: 200 })],
    ['invalid JSON payload', async () => new Response('{', { status: 200 })],
  ];

  for (const [caseName, dataFetchImpl] of invalidResponses) {
    await t.test(caseName, async () => {
      let providerCalls = 0;
      await withServer({
        apiKey: 'test-key',
        dataFetchImpl,
        fetchImpl: async () => { providerCalls += 1; },
      }, async (url) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain: 'dragonball',
            messages: [{ role: 'user', content: 'Háblame de Goku.' }],
          }),
        });

        assert.equal(response.status, 503);
        assert.match((await response.json()).error, /base de datos de Dragon Ball/);
        assert.equal(providerCalls, 0);
      });
    });
  }
});

test('does not call an AI provider when the Dragon Ball service has no matching character', async () => {
  let providerCalls = 0;

  await withServer({
    apiKey: 'test-key',
    dataFetchImpl: async () => new Response(JSON.stringify([
      { id: 1, name: 'Goku', race: 'Saiyan' },
    ]), { status: 200 }),
    fetchImpl: async () => { providerCalls += 1; },
  }, async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: 'dragonball',
        messages: [{ role: 'user', content: 'Háblame de Vegeta.' }],
      }),
    });

    assert.equal(response.status, 200);
    assert.match((await response.json()).reply, /no encontré ese registro/i);
    assert.equal(providerCalls, 0);
  });
});

test('routes all providers with their own credentials and compatible response parsing', async () => {
  for (const provider of ['gemini', 'openai', 'groq']) {
    let calledUrl;
    let calledOptions;
    await withServer({
      apiKeys: { gemini: 'g-key', openai: 'o-key', groq: 'groq-key' },
      fetchImpl: async (url, options) => {
        calledUrl = url;
        calledOptions = options;
        const body = provider === 'gemini'
          ? { candidates: [{ content: { parts: [{ text: 'mock reply' }] } }] }
          : { choices: [{ message: { content: 'mock reply' } }] };
        return new Response(JSON.stringify(body), { status:  200 });
      },
    }, async (url) => {
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'pokemon', provider, timeout: 40, messages: [{ role: 'user', content: 'Bulbasaur?' }] }),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { reply: 'mock reply' });
      if (provider === 'gemini') {
        assert.match(calledUrl, /generativelanguage.googleapis.com/);
        assert.equal(calledOptions.headers['x-goog-api-key'], 'g-key');
      } else {
        assert.match(calledUrl, provider === 'openai' ? /api.openai.com/ : /api.groq.com\/openai\/v1\/chat\/completions/);
        assert.equal(calledOptions.headers.Authorization, `Bearer ${provider === 'openai' ? 'o-key' : 'groq-key'}`);
        if (provider === 'groq') {
          assert.equal(JSON.parse(calledOptions.body).model, 'llama-3.1-8b-instant');
        }
      }
      assert.ok(calledOptions.signal instanceof AbortSignal);
    });
  }
});

test('accepts all four timeout values and rejects invalid provider or timeout', async () => {
  for (const timeout of [20, 40, 80, 160]) {
    let signal;
    let timeoutDelay;
    await withServer({
      apiKey: 'g-key',
      setTimeoutImpl: (callback, delay) => { timeoutDelay = delay; return globalThis.setTimeout(callback, delay); },
      fetchImpl: async (_url, options) => {
        signal = options.signal;
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 });
      },
    }, async (url) => {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: 'pokemon', timeout, messages: [{ role: 'user', content: 'Bulbasaur?' }] }) });
      assert.equal(response.status, 200);
      assert.ok(signal instanceof AbortSignal);
      assert.equal(timeoutDelay, timeout * 1000);
    });
  }
  for (const invalid of [{ provider: 'unknown', timeout: 40 }, { provider: 'gemini', timeout: 30 }]) {
    await withServer({ apiKey: 'g-key', fetchImpl: async () => { throw new Error('must not call provider'); } }, async (url) => {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: 'pokemon', ...invalid, messages: [{ role: 'user', content: 'Bulbasaur?' }] }) });
      assert.equal(response.status, 400);
    });
  }
});

test('returns missing-key error for the selected provider without calling it', async () => {
  let calls = 0;
  await withServer({ apiKeys: { gemini: 'g-key' }, fetchImpl: async () => { calls += 1; } }, async (url) => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: 'pokemon', provider: 'groq', messages: [{ role: 'user', content: 'Bulbasaur?' }] }) });
    assert.equal(response.status, 503);
    assert.equal(calls, 0);
  });
});

test('aborts a provider request when its selected timeout expires', async () => {
  let requestedDelay;
  await withServer({
    apiKey: 'g-key',
    setTimeoutImpl: (callback, delay) => { requestedDelay = delay; callback(); return 1; },
    clearTimeoutImpl: () => {},
    fetchImpl: async (_url, options) => {
      assert.equal(requestedDelay, 40_000);
      assert.equal(options.signal.aborted, true);
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    },
  }, async (url) => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: 'pokemon', timeout: 40, messages: [{ role: 'user', content: 'Bulbasaur?' }] }) });
    assert.equal(response.status, 504);
  });
});

test('keeps the provider timeout active while reading the response body and maps expiry to 504', async () => {
  let expireProvider;
  let cleared = false;
  await withServer({
    apiKey: 'test-key',
    setTimeoutImpl: (callback, delay) => { assert.equal(delay, 40_000); expireProvider = callback; return 9; },
    clearTimeoutImpl: () => { cleared = true; },
    fetchImpl: async (_url, options) => ({
      status: 200,
      ok: true,
      json: async () => {
        assert.equal(cleared, false, 'provider timer must stay active while parsing JSON');
        expireProvider();
        assert.equal(options.signal.aborted, true);
        const error = new Error('body aborted');
        error.name = 'AbortError';
        throw error;
      },
    }),
  }, async (url) => {
    const response = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'pokemon', timeout: 40, messages: [{ role: 'user', content: 'Bulbasaur?' }] }),
    });
    assert.equal(response.status, 504);
    assert.equal(cleared, true);
  });
});
