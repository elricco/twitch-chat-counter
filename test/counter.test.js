const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-counter-counter-'));
process.env.DATA_DIR = tmpDir;

const { CounterRegistry, currentYearMonth } = require('../src/counter');

test.after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('currentYearMonth liefert das Format YYYY-MM', () => {
  assert.match(currentYearMonth(), /^\d{4}-\d{2}$/);
});

test('increment erhoeht den laufenden Monat und persistiert erst beim Flush', () => {
  const registry = new CounterRegistry(['kanalA']);
  const counter = registry.get('kanalA');
  const ym = currentYearMonth();

  counter.increment();
  counter.increment();

  assert.equal(counter.getAll()[ym], 2);
  // Vor dem Flush darf noch nichts auf Platte stehen.
  assert.equal(fs.existsSync(path.join(tmpDir, 'kanala.json')), false);

  counter.flushIfDirty();
  const persisted = JSON.parse(fs.readFileSync(path.join(tmpDir, 'kanala.json'), 'utf8'));
  assert.equal(persisted[ym], 2);
});

test('ensureCurrentMonthKey legt den laufenden Monat auch ohne Nachrichten mit 0 an', () => {
  const registry = new CounterRegistry(['kanalb']);
  const counter = registry.get('kanalb');
  const ym = currentYearMonth();
  assert.equal(counter.getAll()[ym], 0);
});

test('Registry-Zugriff ist case-insensitiv', () => {
  const registry = new CounterRegistry(['KanalMixedCase']);
  assert.equal(registry.has('kanalmixedcase'), true);
  assert.equal(registry.has('KANALMIXEDCASE'), true);
  assert.notEqual(registry.get('kanalmixedcase'), undefined);
});

test('nach Neustart werden bestehende Monate von Platte geladen', () => {
  fs.writeFileSync(path.join(tmpDir, 'kanalc.json'), JSON.stringify({ '2020-01': 999 }), 'utf8');
  const registry = new CounterRegistry(['kanalc']);
  assert.equal(registry.get('kanalc').getAll()['2020-01'], 999);
});
