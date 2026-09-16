// Gemeinsame Defaults + Parameter-Definition fuer Anzeigeseite (display.js)
// und Konfigseite (config.js). An einer Stelle pflegen, damit beide synchron bleiben.

const MONTH_NAMES = {
  '01': 'Januar', '02': 'Februar', '03': 'März', '04': 'April',
  '05': 'Mai', '06': 'Juni', '07': 'Juli', '08': 'August',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Dezember',
};

// Jeder Eintrag: [Parametername, Default-Wert]
// type: 'string' | 'bool' | 'number' | 'color'
const PARAM_DEFS = [
  { key: 'channel', type: 'string', default: '' },
  { key: 'channels', type: 'string', default: '' },
  { key: 'refreshRate', type: 'number', default: 5000 },
  { key: 'history', type: 'bool', default: false },
  { key: 'textAlign', type: 'string', default: 'left' },
  { key: 'bg', type: 'string', default: 'transparent' },

  { key: 'preText', type: 'string', default: '' },
  { key: 'preTextColor', type: 'color', default: '#fdb336' },
  { key: 'preTextFont', type: 'string', default: 'Bangers' },
  { key: 'preTextSize', type: 'number', default: 32 },
  { key: 'preTextWeight', type: 'string', default: '400' },

  { key: 'showMonth', type: 'bool', default: false },
  { key: 'monthColor', type: 'color', default: '#fdb336' },
  { key: 'monthFont', type: 'string', default: 'Bangers' },
  { key: 'monthSize', type: 'number', default: 32 },
  { key: 'monthWeight', type: 'string', default: '400' },

  { key: 'counterColor', type: 'color', default: '#fdb336' },
  { key: 'counterFont', type: 'string', default: 'Bangers' },
  { key: 'counterSize', type: 'number', default: 70 },
  { key: 'counterWeight', type: 'string', default: '400' },
];

const FONT_WEIGHT_OPTIONS = [
  ['100', 'Thin (100)'],
  ['300', 'Light (300)'],
  ['400', 'Regular (400)'],
  ['500', 'Medium (500)'],
  ['700', 'Bold (700)'],
  ['900', 'Black (900)'],
];

function parseParams(searchParams) {
  const result = {};
  for (const def of PARAM_DEFS) {
    const raw = searchParams.get(def.key);
    if (raw === null || raw === '') {
      result[def.key] = def.default;
      continue;
    }
    if (def.type === 'bool') {
      result[def.key] = raw === 'true' || raw === '1';
    } else if (def.type === 'number') {
      const n = parseFloat(raw);
      result[def.key] = Number.isFinite(n) ? n : def.default;
    } else {
      result[def.key] = raw;
    }
  }
  return result;
}

function buildQueryString(config) {
  const params = new URLSearchParams();
  for (const def of PARAM_DEFS) {
    const value = config[def.key];
    if (value === def.default || value === '' || value === undefined) continue;
    params.set(def.key, value);
  }
  return params.toString();
}

// Laedt eine Google-Font-Familie dynamisch nach, falls noch nicht geschehen.
function loadGoogleFont(fontName) {
  if (!fontName) return;
  const id = 'gfont-' + fontName.replace(/[^a-zA-Z0-9]/g, '-');
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css?family=${encodeURIComponent(fontName)}:400,700`;
  document.head.appendChild(link);
}

function formatMonthLabel(yearMonth) {
  const [, month] = yearMonth.split('-');
  return MONTH_NAMES[month] || yearMonth;
}
