# Twitch Chat Counter

File-basierter, monatsweiser Chat-Message-Zähler für beliebige Twitch-Kanäle.
Kein Datenbank-Server, keine wachsenden Tabellen — pro Kanal existiert genau
eine kleine JSON-Datei mit einem Eintrag pro Monat.

```json
{ "2026-07": 15234, "2026-08": 18901, "2026-09": 4021 }
```

## Warum kein DB-Absturz mehr passieren kann

- Es wird **nicht** pro Chat-Nachricht in eine Datei/DB geschrieben, sondern
  nur ein Zähler im Arbeitsspeicher hochgezählt.
- Alle `FLUSH_INTERVAL_SECONDS` (Standard: 20s) wird der aktuelle Stand
  **atomar** auf Platte geschrieben (Tempfile + `rename`) — bei einem Absturz
  mitten im Schreibvorgang bleibt die alte, valide Datei erhalten.
- Pro Kanal gibt es dauerhaft nur eine Handvoll Zeilen (eine pro Monat),
  die Datei wächst also praktisch nie relevant.

## Setup

```bash
cp .env.example .env
# .env anpassen: mindestens CHANNELS ausfüllen
npm install
npm start
```

### Konfiguration (.env)

| Variable | Beschreibung |
|---|---|
| `CHANNELS` | Komma-getrennte Liste der zu trackenden Kanäle |
| `TWITCH_USERNAME` / `TWITCH_OAUTH_TOKEN` | Optional. Ohne Angabe wird anonym gelesen (reicht zum reinen Mitzählen) |
| `EXTRA_BOT_BLOCKLIST` | Zusätzliche Bot-Namen, die nicht gezählt werden sollen |
| `FLUSH_INTERVAL_SECONDS` | Wie oft auf Platte geschrieben wird |
| `PORT` | Port des HTTP-Servers |
| `DATA_DIR` | Speicherort der JSON-Dateien |

Bereits fest eingebaut (ohne Konfiguration ausgeschlossen): StreamElements,
Nightbot, Moobot, Fossabot, Wizebot, Streamlabs, SoundAlerts, PretzelRocks,
StreamlootsBot, CommanderRoot — sowie jeder Account mit Twitch's offiziellem
Bot-Badge.

## Endpunkt

```
GET /api/:channel/counter
```

Liefert alle bisherigen Monate **inklusive** des laufenden Monats als JSON —
genau das Format, das euer bestehender Anzeige-Endpunkt erwartet.

```bash
curl http://localhost:3000/api/kanalname/counter
```

`GET /health` liefert einen simplen Health-Check für Monitoring/Docker.

### Mehrere Kanäle aggregieren (on-demand)

```
GET /api/aggregate/counter?channels=kanal1,kanal2,kanal3
```

Summiert die Monatswerte der angegebenen, getrackten Kanäle zu einem
gemeinsamen JSON im selben Format:

```bash
curl "http://localhost:3000/api/aggregate/counter?channels=kanal1,kanal2"
# -> { "2026-08": 120, "2026-09": 55 }
```

Alle angegebenen Kanäle müssen in `CHANNELS` konfiguriert sein und aktiv
getrackt werden — sonst liefert der Endpunkt `404` mit den unbekannten
Kanalnamen. Fehlt der `channels`-Parameter ganz, kommt `400`.

## Darstellungsseite & Konfiguration

Der Server liefert zwei Seiten unter `/` aus (kein separater Dienst nötig):

- **`/config.html`** — Formular zur optischen Konfiguration (Kanal-Auswahl,
  Schriftart/-größe/-farbe für Vortext, Monat und Zähler, Ausrichtung,
  Hintergrund, Historie an/aus) mit Live-Vorschau. Am Ende steht dort die
  fertige URL zum Kopieren.
- **`/index.html`** — die eigentliche Anzeige, gesteuert ausschließlich über
  URL-Parameter (transparenter Hintergrund standardmäßig, ideal als OBS
  Browser-Source).

Standardmäßig wird **nur der laufende Monat** angezeigt. Die Monats-Historie
erscheint nur, wenn `history=true` gesetzt ist.

### Wichtigste Parameter

| Parameter | Beschreibung | Default |
|---|---|---|
| `channel` | einzelner Kanal | — |
| `channels` | mehrere Kanäle, aggregiert (kommagetrennt) | — |
| `history` | vergangene Monate zusätzlich anzeigen | `false` |
| `showMonth` | Monatsname zum Zähler anzeigen | `false` |
| `preText` | Text vor dem Zähler | leer |
| `textAlign` | `left` / `center` / `right` | `left` |
| `bg` | Hintergrundfarbe (`transparent` für OBS) | `transparent` |
| `refreshRate` | Aktualisierungsintervall in ms | `5000` |
| `counterFont`, `counterSize`, `counterWeight`, `counterColor` | Zähler-Styling | Bangers / 70 / 400 / `#fdb336` |
| `preTextFont`, `preTextSize`, `preTextWeight`, `preTextColor` | Vortext-Styling | wie oben |
| `monthFont`, `monthSize`, `monthWeight`, `monthColor` | Monatsname-Styling | wie oben |

Alle Werte lassen sich bequem über `/config.html` zusammenklicken, statt die
URL von Hand zu bauen. Beispiel für eine fertige URL:

```
http://localhost:3000/index.html?channel=kanalname&showMonth=true&counterColor=%23ff0000&history=true
```

## Docker

```bash
docker compose up -d --build
```

Die `.env`-Datei wird automatisch von `docker-compose.yml` eingelesen. Das
`data/`-Verzeichnis wird als Volume gemountet, sodass die Zählerstände einen
Container-Neustart überleben.

## Shared Hosting (ohne Docker)

Läuft als normaler Node-Prozess (`npm start`), z.B. unter `pm2` oder als
systemd-Service für Dauerbetrieb:

```bash
pm2 start src/index.js --name twitch-chat-counter
```

Voraussetzung ist lediglich Node.js ≥ 18 und Schreibrechte auf `DATA_DIR`.

## Mehrere Kanäle

Einfach in `CHANNELS` mit Komma trennen (`CHANNELS=kanal1,kanal2,kanal3`) —
ein einzelner Prozess trackt beliebig viele Kanäle parallel, jeder bekommt
seine eigene JSON-Datei und ist über `/api/<kanal>/counter` einzeln abrufbar.

## Monatswechsel

Der laufende Monat wird automatisch als neuer Schlüssel angelegt, sobald er
beginnt — auch wenn noch keine Nachricht geschrieben wurde (minütlicher
Rollover-Check). Vergangene Monate bleiben unverändert in der Datei stehen.
