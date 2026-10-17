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
      assert.equal(requestOptions.signal, undefined);
      const providerRequest = JSON.parse(requestOptions.body);
      assert.deepEqual(providerRequest.generationConfig, {
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingLevel: 'LOW' },
      });
      assert.equal(providerRequest.contents.length, 1);
      assert.match(providerRequest.contents[0].parts[0].text, /Bulbasaur/);
      assert.match(providerRequest.contents[0].parts[0].text, /"weight":69/);
      assert.match(providerRequest.systemInstruction.parts[0].text, /conocimiento general/i);
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

test('allows model knowledge for an attribute missing from the database record', async () => {
  let providerCalls = 0;
  let providerRequest;

  await withServer(
    {
      apiKey: 'test-key',
      fetchImpl: async (_url, options) => {
        providerCalls += 1;
        providerRequest = JSON.parse(options.body);
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Bulbasaur es verde.' }] } }],
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
          messages: [{ role: 'user', content: '¿Qué color tiene Bulbasaur?' }],
        }),
      });
      const result = await response.json();

      assert.equal(response.status, 200);
      assert.equal(result.reply, 'Bulbasaur es verde.');
      assert.equal(providerCalls, 1);
      assert.match(providerRequest.contents[0].parts[0].text, /"name":"Bulbasaur"/);
      assert.match(providerRequest.systemInstruction.parts[0].text, /conocimiento general/i);
      assert.match(providerRequest.systemInstruction.parts[0].text, /No uses herramientas/i);
    }
  );
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
      assert.match(providerRequest.systemInstruction.parts[0].text, /conocimiento general/i);
    }
  );
});