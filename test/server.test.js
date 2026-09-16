const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');

// Fake-Registry statt echter ChannelCounter/Storage-Instanzen: die Server-Tests
// sollen nur das Routing/HTTP-Verhalten pruefen, nicht Datei-I/O.
function fakeRegistry(channelsData) {
  return {
    has: (channel) => Object.prototype.hasOwnProperty.call(channelsData, channel),
    get: (channel) => ({
      ensureCurrentMonthKey: () => {},
      getAll: () => channelsData[channel],
    }),
  };
}

async function withServer(app, fn) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

test('GET /api/:channel/counter liefert die Monatswerte eines bekannten Kanals', async () => {
  const registry = fakeRegistry({ foo: { '2026-09': 5 } });
  const app = createServer(registry, null);
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/foo/counter`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { '2026-09': 5 });
  });
});

test('GET /api/:channel/counter liefert 404 fuer unbekannten Kanal', async () => {
  const registry = fakeRegistry({});
  const app = createServer(registry, null);
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/unbekannt/counter`);
    assert.equal(res.status, 404);
  });
});

test('ein versehentlich mitgesendetes fuehrendes "#" im Kanalnamen wird toleriert', async () => {
  // Regressionstest: Kanalnamen werden ueberall sonst mit '#' geschrieben (Chat, IRC),
  // ein mitkopiertes '#' in der URL (hier %23-kodiert, sonst wuerde der Browser schon
  // vorher am Fragment abschneiden) darf den Kanal nicht unauffindbar machen.
  const registry = fakeRegistry({ foo: { '2026-09': 5 } });
  const app = createServer(registry, null);
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/%23foo/counter`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { '2026-09': 5 });
  });
});

test('aggregate-Route matcht nicht faelschlich als Kanalname "aggregate"', async () => {
  // Regressionstest fuer die Route-Reihenfolge: /api/aggregate/counter muss von der
  // dedizierten Aggregate-Route bedient werden, nicht von /api/:channel/counter mit
  // channel="aggregate". Waere die Reihenfolge vertauscht, kaeme hier ein 404
  // ("Kanal 'aggregate' wird nicht getrackt") statt eines 400 fuer den fehlenden
  // channels-Parameter.
  const registry = fakeRegistry({ a: { '2026-09': 1 }, b: { '2026-09': 2 } });
  const app = createServer(registry, null);
  await withServer(app, async (base) => {
    const missingParam = await fetch(`${base}/api/aggregate/counter`);
    assert.equal(missingParam.status, 400);

    const ok = await fetch(`${base}/api/aggregate/counter?channels=a,b`);
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { '2026-09': 3 });
  });
});

test('aggregate-Route toleriert ein fuehrendes "#" pro Kanalname', async () => {
  const registry = fakeRegistry({ a: { '2026-09': 1 }, b: { '2026-09': 2 } });
  const app = createServer(registry, null);
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/aggregate/counter?channels=%23a,%23b`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { '2026-09': 3 });
  });
});

test('aggregate-Route liefert 404 mit Namen der unbekannten Kanaele', async () => {
  const registry = fakeRegistry({ a: { '2026-09': 1 } });
  const app = createServer(registry, null);
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/aggregate/counter?channels=a,unbekannt`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.match(body.error, /unbekannt/);
  });
});

test('/health meldet den Twitch-Status separat von HTTP-Verfuegbarkeit', async () => {
  const registry = fakeRegistry({});
  const fakeTwitchClient = { getStatus: () => 'connected' };
  const app = createServer(registry, fakeTwitchClient);
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok', twitch: 'connected' });
  });
});

test('optionales Rate-Limiting greift, wenn konfiguriert', async () => {
  const registry = fakeRegistry({ foo: { '2026-09': 1 } });
  const app = createServer(registry, null, { rateLimit: { windowMs: 60000, max: 1 } });
  await withServer(app, async (base) => {
    const first = await fetch(`${base}/api/foo/counter`);
    assert.equal(first.status, 200);
    const second = await fetch(`${base}/api/foo/counter`);
    assert.equal(second.status, 429);
  });
});
