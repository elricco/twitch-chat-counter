const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// DATA_DIR wird beim Require von storage.js einmalig gelesen -> vor dem Require setzen
// und einen isolierten Temp-Ordner verwenden (node --test isoliert Testdateien in
// eigenen Prozessen, daher beeinflusst das keine anderen Testdateien).
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-counter-storage-'));
process.env.DATA_DIR = tmpDir;

const { loadCounters, saveCounters, filePathFor } = require('../src/storage');

test.after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('loadCounters liefert leeres Objekt, wenn noch keine Datei existiert', () => {
  assert.deepEqual(loadCounters('nochNieGesehenerKanal'), {});
});

test('saveCounters + loadCounters Roundtrip', () => {
  const data = { '2026-09': 42 };
  saveCounters('testkanal', data);
  assert.deepEqual(loadCounters('testkanal'), data);
});

test('saveCounters schreibt atomar (kein sichtbares .tmp-Artefakt nach dem Schreiben)', () => {
  saveCounters('atomartest', { '2026-09': 1 });
  const files = fs.readdirSync(tmpDir);
  assert.ok(files.includes('atomartest.json'));
  assert.ok(!files.some((f) => f.includes('.tmp')));
});

test('kaputte JSON-Datei fuehrt zu leerem Objekt statt Absturz', () => {
  const file = filePathFor('korrupt');
  fs.writeFileSync(file, '{ das ist kein json', 'utf8');
  assert.deepEqual(loadCounters('korrupt'), {});
});

test('filePathFor saeubert Kanalnamen defensiv gegen Path-Traversal', () => {
  const file = filePathFor('../../etc/passwd');
  assert.equal(path.dirname(file), tmpDir);
  assert.equal(path.basename(file), 'etcpasswd.json');
});
