// Simpler In-Memory Fixed-Window Rate-Limiter pro IP, ohne zusaetzliche Dependency.
// Bewusst schlank gehalten: fuer diesen Anwendungsfall (leichte, oeffentliche
// Read-Only-Endpunkte) reicht ein grobes Limit als Schutz vor Abuse/Scans auf
// Shared Hosting mit begrenzten Ressourcen.
function createRateLimiter({ windowMs, max }) {
  const hits = new Map(); // ip -> { count, resetAt }

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(ip);
    }
  }, windowMs);
  cleanup.unref();

  return function rateLimiter(req, res, next) {
    const ip = req.ip || 'unknown';
    const now = Date.now();

    let entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Zu viele Anfragen, bitte spaeter erneut versuchen.' });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
