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

const app = createServer(registry, twitchClient);
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
