const tmi = require('tmi.js');
const { isBotMessage } = require('./botFilter');

function createTwitchClient(channels, registry) {
  const hasCredentials = !!(process.env.TWITCH_USERNAME && process.env.TWITCH_OAUTH_TOKEN);

  const client = new tmi.Client({
    options: { debug: false },
    connection: {
      reconnect: true,
      secure: true,
    },
    // Ohne Credentials verbindet tmi.js sich anonym (justinfan-User) -> reicht zum Mitlesen.
    identity: hasCredentials
      ? {
          username: process.env.TWITCH_USERNAME,
          password: process.env.TWITCH_OAUTH_TOKEN,
        }
      : undefined,
    channels,
  });

  client.on('message', (channel, tags, message, self) => {
    if (self) return;

    const channelName = channel.replace(/^#/, '').toLowerCase();
    const counter = registry.get(channelName);
    if (!counter) return;

    if (isBotMessage(tags)) return;

    counter.increment();
  });

  client.on('connected', (addr, port) => {
    console.log(`[twitch] Verbunden mit ${addr}:${port}, Kanaele: ${channels.join(', ')}`);
  });

  client.on('disconnected', (reason) => {
    console.warn('[twitch] Verbindung getrennt:', reason);
  });

  client.on('reconnect', () => {
    console.log('[twitch] Versuche erneut zu verbinden...');
  });

  return client;
}

module.exports = { createTwitchClient };
