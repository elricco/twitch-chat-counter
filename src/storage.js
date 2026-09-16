const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || './data';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function filePathFor(channel) {
  // Kanalnamen sind bereits durch Twitch auf a-z0-9_ beschraenkt (lowercase),
  // trotzdem defensiv saubern, um Path-Traversal auszuschliessen.
  const safe = channel.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return path.join(DATA_DIR, `${safe}.json`);
}

function loadCounters(channel) {
  const file = filePathFor(channel);
  if (!fs.existsSync(file)) return {};
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[storage] Konnte ${file} nicht lesen/parsen, starte mit leerem Objekt:`, err.message);
    return {};
  }
}

// Atomarer Write: erst in Tempfile schreiben, dann per rename ersetzen.
// So bleibt bei einem Absturz mitten im Schreibvorgang immer die alte, valide Datei erhalten.
function saveCounters(channel, data) {
  ensureDataDir();
  const file = filePathFor(channel);
  const tmpFile = path.join(DATA_DIR, `.${path.basename(file)}.${process.pid}.tmp`);

  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpFile, file); // rename ist auf demselben Filesystem atomar
}

module.exports = { loadCounters, saveCounters, filePathFor, ensureDataDir };
