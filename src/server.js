const express = require('express');
const path = require('path');

function createServer(registry, twitchClient) {
  const app = express();

  // Darstellungsseite (public/index.html, style.css, app.js) unter "/" ausliefern.
  // Aufruf z.B. als http://host/?channel=kanalname oder ?channels=kanal1,kanal2
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // WICHTIG: Diese Route muss VOR /api/:channel/counter stehen, sonst wuerde
  // Express "aggregate" als Kanalnamen interpretieren und die generische
  // Route faelschlicherweise zuerst matchen.
  //
  // GET /api/aggregate/counter?channels=kanal1,kanal2,kanal3
  // Summiert die Monatswerte mehrerer getrackter Kanaele zu einem gemeinsamen JSON.
  app.get('/api/aggregate/counter', (req, res) => {
    const raw = (req.query.channels || '').toString();
    const requested = raw
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    if (requested.length === 0) {
      return res.status(400).json({ error: "Query-Parameter 'channels' fehlt, z.B. ?channels=kanal1,kanal2" });
    }

    const unknown = requested.filter((c) => !registry.has(c));
    if (unknown.length > 0) {
      return res.status(404).json({ error: `Unbekannte Kanaele: ${unknown.join(', ')}` });
    }

    const aggregated = {};
    for (const channel of requested) {
      const counter = registry.get(channel);
      counter.ensureCurrentMonthKey();
      const data = counter.getAll();
      for (const [ym, count] of Object.entries(data)) {
        aggregated[ym] = (aggregated[ym] || 0) + count;
      }
    }

    return res.json(aggregated);
  });

  // GET /api/:channel/counter -> { "2026-07": 15234, "2026-08": 18901, "2026-09": 4021 }
  app.get('/api/:channel/counter', (req, res) => {
    const channel = req.params.channel.toLowerCase();

    if (!registry.has(channel)) {
      return res.status(404).json({ error: `Kanal '${channel}' wird nicht getrackt` });
    }

    const counter = registry.get(channel);
    // Sicherstellen, dass der laufende Monat auch mit 0 Nachrichten im Response auftaucht
    counter.ensureCurrentMonthKey();

    return res.json(counter.getAll());
  });

  // Healthcheck: liefert immer HTTP 200 solange der HTTP-Server laeuft (wichtig fuer
  // Docker HEALTHCHECK/Reverse-Proxy, damit kurze Twitch-Reconnects keine Restart-Loops
  // ausloesen), enthaelt den Twitch-Verbindungsstatus separat im Body fuer Monitoring.
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', twitch: twitchClient ? twitchClient.getStatus() : 'unknown' });
  });

  return app;
}

module.exports = { createServer };
