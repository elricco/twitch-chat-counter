const test = require('node:test');
const assert = require('node:assert/strict');
const { parseParams, buildQueryString, formatMonthLabel } = require('../public/shared');

function paramsFrom(obj) {
  return new URLSearchParams(obj);
}

test('parseParams liefert Defaults, wenn nichts gesetzt ist', () => {
  const config = parseParams(paramsFrom({}));
  assert.equal(config.textAlign, 'left');
  assert.equal(config.bg, 'transparent');
  assert.equal(config.history, false);
  assert.equal(config.refreshRate, 5000);
});

test('parseParams uebernimmt gesetzte Werte inkl. Typkonvertierung', () => {
  const config = parseParams(paramsFrom({ history: 'true', refreshRate: '1000', counterColor: '#ff0000' }));
  assert.equal(config.history, true);
  assert.equal(config.refreshRate, 1000);
  assert.equal(config.counterColor, '#ff0000');
});

test('parseParams faellt bei ungueltigen Zahlen auf den Default zurueck', () => {
  const config = parseParams(paramsFrom({ refreshRate: 'keine-zahl' }));
  assert.equal(config.refreshRate, 5000);
});

test('buildQueryString liess Default-Werte weg (Roundtrip bleibt kompakt)', () => {
  const qs = buildQueryString({ channel: 'foo', textAlign: 'left', bg: 'transparent' });
  assert.equal(qs, 'channel=foo');
});

test('parseParams(buildQueryString(x)) ist ein stabiler Roundtrip fuer gesetzte Werte', () => {
  const original = parseParams(paramsFrom({ channel: 'foo', history: 'true', counterSize: '90' }));
  const qs = buildQueryString(original);
  const roundtripped = parseParams(new URLSearchParams(qs));
  assert.equal(roundtripped.channel, 'foo');
  assert.equal(roundtripped.history, true);
  assert.equal(roundtripped.counterSize, 90);
});

test('formatMonthLabel uebersetzt bekannte Monate, sonst Fallback auf den Rohwert', () => {
  assert.equal(formatMonthLabel('2026-09'), 'September');
  assert.equal(formatMonthLabel('2026-13'), '2026-13');
});
