require('dotenv').config();

const { CounterRegistry } = require('./counter');
const { createTwitchClient } = require('./twitchClient');
const { createServer } = require('./server');
const { ensureDataDir } = require('./storage');

const CHANNELS = (process.env.CHANNELS || '')
  .split(',')
  .map((c) => c.trim().toLowerCase())
  .filter(Boolean);

const FLUSH_INTERVAL_SECONDS = parseInt(process.env.FLUSH_INTERVAL_SECONDS || '20', 10);
const PORT = parseInt(process.env.PORT || '3000', 10);

// Rate-Limiting ist standardmaessig aus (kein Verhaltenswechsel fuer bestehende Setups) und
// wird erst aktiv, sobald RATE_LIMIT_MAX gesetzt ist.
const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : null;
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);

// Nur setzen, wenn explizit hinter einem Reverse-Proxy deployed (siehe .env.example).
const TRUST_PROXY = process.env.TRUST_PROXY || null;

if (CHANNELS.length === 0) {
  console.error('Keine Kanaele konfiguriert. Bitte CHANNELS in der .env setzen (z.B. CHANNELS=meinkanal).');
  process.exit(1);
}

ensureDataDir();

const registry = new CounterRegistry(CHANNELS);
registry.startFlushLoop(FLUSH_INTERVAL_SECONDS);
registry.startMonthRolloverCheck();

const twitchClient = createTwitchClient(CHANNELS, registry);
twitchClient.connect().catch((err) => {
  console.error('[twitch] Verbindung fehlgeschlagen:', err.message);
});

const app = createServer(registry, twitchClient, {
  trustProxy: TRUST_PROXY,
  rateLimit: RATE_LIMIT_MAX ? { windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX } : null,
});
app.listen(PORT, () => {
  console.log(`[http] Server laeuft auf Port ${PORT}`);
  console.log(`[http] Beispiel: http://localhost:${PORT}/api/${CHANNELS[0]}/counter`);
});

// Beim Beenden (z.B. docker stop) noch einmal alles final auf Platte schreiben
function gracefulShutdown() {
  console.log('\n[shutdown] Schreibe finalen Stand und beende...');
  for (const counter of registry.counters.values()) {
    counter.flushIfDirty();
  }
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
