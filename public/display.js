const config = parseParams(new URLSearchParams(window.location.search));

const chatcounterEl = document.getElementById('chatcounter');
const preTextEl = document.getElementById('preText');
const monthTextEl = document.getElementById('monthText');
const counterTextEl = document.getElementById('counterText');
const historyEl = document.getElementById('history');

function applyStyles() {
  document.body.style.background = config.bg;
  chatcounterEl.style.textAlign = config.textAlign;

  loadGoogleFont(config.preTextFont);
  loadGoogleFont(config.monthFont);
  loadGoogleFont(config.counterFont);

  // Pre-Text
  if (config.preText === '') {
    preTextEl.style.display = 'none';
  } else {
    preTextEl.style.display = 'inline-block';
    preTextEl.textContent = config.preText;
    preTextEl.style.fontFamily = `'${config.preTextFont}', sans-serif`;
    preTextEl.style.fontSize = `${config.preTextSize}px`;
    preTextEl.style.fontWeight = config.preTextWeight;
    preTextEl.style.color = config.preTextColor;
    preTextEl.style.textAlign = config.textAlign;
  }

  // Monat
  if (!config.showMonth) {
    monthTextEl.style.display = 'none';
  } else {
    monthTextEl.style.display = 'inline-block';
    monthTextEl.style.fontFamily = `'${config.monthFont}', sans-serif`;
    monthTextEl.style.fontSize = `${config.monthSize}px`;
    monthTextEl.style.fontWeight = config.monthWeight;
    monthTextEl.style.color = config.monthColor;
    monthTextEl.style.textAlign = config.textAlign;
  }

  // Counter
  counterTextEl.style.fontFamily = `'${config.counterFont}', sans-serif`;
  counterTextEl.style.fontSize = `${config.counterSize}px`;
  counterTextEl.style.fontWeight = config.counterWeight;
  counterTextEl.style.color = config.counterColor;
  counterTextEl.style.textAlign = config.textAlign;

  if (config.history) {
    historyEl.hidden = false;
    historyEl.style.textAlign = config.textAlign;
    historyEl.style.justifyContent = config.textAlign === 'center' ? 'center' : (config.textAlign === 'right' ? 'flex-end' : 'flex-start');
  } else {
    historyEl.hidden = true;
  }
}

function buildApiUrl() {
  if (config.channels) {
    return `/api/aggregate/counter?channels=${encodeURIComponent(config.channels)}`;
  }
  if (config.channel) {
    return `/api/${encodeURIComponent(config.channel)}/counter`;
  }
  return null;
}

function renderHistory(data, currentKey) {
  historyEl.innerHTML = '';
  const historySize = Math.round(config.counterSize * 0.4);

  const keys = Object.keys(data)
    .filter((k) => k !== currentKey)
    .sort()
    .reverse();

  for (const key of keys) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <span class="h-month" style="font-family:'${config.monthFont}', sans-serif; font-size:${Math.round(historySize * 0.45)}px; color:${config.counterColor};">${formatMonthLabel(key)}</span>
      <span class="h-count" style="font-family:'${config.counterFont}', sans-serif; font-size:${historySize}px; font-weight:${config.counterWeight}; color:${config.counterColor};">${data[key]}</span>
    `;
    historyEl.appendChild(item);
  }
}

async function tick() {
  const apiUrl = buildApiUrl();
  if (!apiUrl) {
    counterTextEl.textContent = '–';
    return;
  }

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) return;
    const data = await response.json();

    const keys = Object.keys(data).sort();
    if (keys.length === 0) return;

    const currentKey = keys[keys.length - 1];
    counterTextEl.textContent = data[currentKey];
    if (config.showMonth) {
      monthTextEl.textContent = formatMonthLabel(currentKey);
    }

    if (config.history) {
      renderHistory(data, currentKey);
    }
  } catch (err) {
    // Bewusst still: als OBS-Overlay soll kein Fehlertext im Stream erscheinen.
    // Bei Bedarf ueber die Browser-Konsole (F12) im OBS Browser-Source debuggen.
    console.error('Chat Counter: Fehler beim Laden der Daten', err);
  }
}

applyStyles();
tick();
setInterval(tick, config.refreshRate);
