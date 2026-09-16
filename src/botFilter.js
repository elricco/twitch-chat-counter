// Fest eingebaute, gaengige Chat-/Moderationsbots.
const BUILT_IN_BLOCKLIST = new Set([
  'streamelements',
  'nightbot',
  'moobot',
  'fossabot',
  'wizebot',
  'streamlabs',
  'soundalerts',
  'pretzelrocks',
  'streamlootsbot',
  'commanderroot',
]);

function buildBlocklist() {
  const extra = (process.env.EXTRA_BOT_BLOCKLIST || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...BUILT_IN_BLOCKLIST, ...extra]);
}

const blocklist = buildBlocklist();

function isBotMessage(tags) {
  const username = (tags?.username || '').toLowerCase();
  if (!username) return true; // keine Absenderinfo -> sicherheitshalber nicht zaehlen

  if (blocklist.has(username)) return true;

  // Twitch markiert manche Accounts als offiziellen "bot" Badge-Typ
  const badges = tags?.badges || {};
  if (badges.bot_badge) return true;

  return false;
}

module.exports = { isBotMessage, blocklist };
