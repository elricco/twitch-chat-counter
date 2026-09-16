const test = require('node:test');
const assert = require('node:assert/strict');
const { isBotMessage } = require('../src/botFilter');

test('normaler User wird nicht gefiltert', () => {
  assert.equal(isBotMessage({ username: 'irgendeinuser', badges: {} }), false);
});

test('bekannter Bot aus der Blockliste wird gefiltert', () => {
  assert.equal(isBotMessage({ username: 'streamelements', badges: {} }), true);
});

test('Blockliste greift unabhaengig von Gross-/Kleinschreibung', () => {
  assert.equal(isBotMessage({ username: 'StreamElements', badges: {} }), true);
});

test('Account mit offiziellem Twitch-Bot-Badge wird gefiltert, auch ohne Blockliste', () => {
  assert.equal(isBotMessage({ username: 'irgendeinbot', badges: { bot_badge: '1' } }), true);
});

test('fehlende Absenderinfo wird sicherheitshalber als Bot behandelt', () => {
  assert.equal(isBotMessage({ username: '', badges: {} }), true);
  assert.equal(isBotMessage({}), true);
});

test('EXTRA_BOT_BLOCKLIST erweitert die eingebaute Liste (Modul-Reload noetig)', () => {
  const originalEnv = process.env.EXTRA_BOT_BLOCKLIST;
  process.env.EXTRA_BOT_BLOCKLIST = 'meinCustomBot';
  delete require.cache[require.resolve('../src/botFilter')];
  const { isBotMessage: isBotMessageWithExtra } = require('../src/botFilter');

  assert.equal(isBotMessageWithExtra({ username: 'meincustombot', badges: {} }), true);

  process.env.EXTRA_BOT_BLOCKLIST = originalEnv;
  delete require.cache[require.resolve('../src/botFilter')];
});
