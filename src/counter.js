const { loadCounters, saveCounters } = require('./storage');

function currentYearMonth() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

class ChannelCounter {
  constructor(channel) {
    this.channel = channel;
    // Beim Start bestehende Monate von Platte laden, damit nach einem Neustart
    // nichts verloren geht und der laufende Monat weitergezaehlt wird.
    this.data = loadCounters(channel);
    this.dirty = false;
  }

  increment() {
    const ym = currentYearMonth();
    this.data[ym] = (this.data[ym] || 0) + 1;
    this.dirty = true;
  }

  flushIfDirty() {
    if (!this.dirty) return;
    try {
      saveCounters(this.channel, this.data);
      this.dirty = false;
    } catch (err) {
      // Bewusst nicht werfen: ein einzelner fehlgeschlagener Schreibvorgang (z.B. Platte
      // voll, Rechte-Problem) soll weder den Flush-Loop noch den Shutdown-Handler fuer die
      // anderen Kanaele abbrechen. dirty bleibt true, der naechste Tick versucht es erneut.
      console.error(`[storage] Konnte Zaehlerstand fuer '${this.channel}' nicht speichern, versuche es spaeter erneut:`, err.message);
    }
  }

  // Erzwingt, dass der aktuelle Monats-Key existiert, auch wenn noch 0 Nachrichten kamen
  ensureCurrentMonthKey() {
    const ym = currentYearMonth();
    if (!(ym in this.data)) {
      this.data[ym] = 0;
      this.dirty = true;
    }
  }

  getAll() {
    return { ...this.data };
  }
}

class CounterRegistry {
  constructor(channels) {
    this.counters = new Map();
    for (const ch of channels) {
      const counter = new ChannelCounter(ch);
      counter.ensureCurrentMonthKey();
      this.counters.set(ch.toLowerCase(), counter);
    }
  }

  get(channel) {
    return this.counters.get(channel.toLowerCase());
  }

  has(channel) {
    return this.counters.has(channel.toLowerCase());
  }

  startFlushLoop(intervalSeconds) {
    setInterval(() => {
      for (const counter of this.counters.values()) {
        counter.flushIfDirty();
      }
    }, intervalSeconds * 1000);
  }

  // Beim Monatswechsel legt ensureCurrentMonthKey automatisch den neuen Key an,
  // sobald die erste Nachricht im neuen Monat gezaehlt wird (increment()).
  // Dieser Tick sorgt dafuer, dass der neue Monat auch OHNE Nachrichten sichtbar ist.
  startMonthRolloverCheck() {
    setInterval(() => {
      for (const counter of this.counters.values()) {
        counter.ensureCurrentMonthKey();
      }
    }, 60 * 1000);
  }
}

module.exports = { CounterRegistry, currentYearMonth };
