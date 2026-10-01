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

test('postText: Defaults, Parsing und Roundtrip ueber den Query-String', () => {
  const defaults = parseParams(paramsFrom({}));
  assert.equal(defaults.postText, '');
  assert.equal(defaults.postTextColor, '#fdb336');
  assert.equal(defaults.postTextFont, 'Bangers');
  assert.equal(defaults.postTextSize, 32);
  assert.equal(defaults.postTextWeight, '400');

  const config = parseParams(paramsFrom({ postText: 'von 40.000', postTextSize: '48' }));
  assert.equal(config.postText, 'von 40.000');
  assert.equal(config.postTextSize, 48);

  const roundtripped = parseParams(new URLSearchParams(buildQueryString(config)));
  assert.equal(roundtripped.postText, 'von 40.000');
  assert.equal(roundtripped.postTextSize, 48);
});
