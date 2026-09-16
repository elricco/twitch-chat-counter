const els = {
  channelModeRadios: document.querySelectorAll('input[name="channelMode"]'),
  channel: document.getElementById('channel'),
  channels: document.getElementById('channels'),
  refreshRate: document.getElementById('refreshRate'),
  history: document.getElementById('history'),
  textAlign: document.getElementById('textAlign'),
  bgColor: document.getElementById('bgColor'),
  bgTransparent: document.getElementById('bgTransparent'),

  preText: document.getElementById('preText'),
  preTextFont: document.getElementById('preTextFont'),
  preTextFontCustom: document.getElementById('preTextFontCustom'),
  preTextSize: document.getElementById('preTextSize'),
  preTextWeight: document.getElementById('preTextWeight'),
  preTextColor: document.getElementById('preTextColor'),

  showMonth: document.getElementById('showMonth'),
  monthFont: document.getElementById('monthFont'),
  monthFontCustom: document.getElementById('monthFontCustom'),
  monthSize: document.getElementById('monthSize'),
  monthWeight: document.getElementById('monthWeight'),
  monthColor: document.getElementById('monthColor'),

  counterFont: document.getElementById('counterFont'),
  counterFontCustom: document.getElementById('counterFontCustom'),
  counterSize: document.getElementById('counterSize'),
  counterWeight: document.getElementById('counterWeight'),
  counterColor: document.getElementById('counterColor'),

  previewFrame: document.getElementById('previewFrame'),
  generatedUrl: document.getElementById('generatedUrl'),
  copyBtn: document.getElementById('copyBtn'),
  copyFeedback: document.getElementById('copyFeedback'),
  themeToggle: document.getElementById('themeToggle'),
};

const CUSTOM_FONT_VALUE = '__custom__';

// Schriftstärke-Dropdowns aus der gemeinsamen Definition befüllen
document.querySelectorAll('.weight-select').forEach((select) => {
  for (const [value, label] of FONT_WEIGHT_OPTIONS) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    if (value === '400') opt.selected = true;
    select.appendChild(opt);
  }
});

// Schriftart-Dropdowns aus der kuratierten Liste befüllen, plus Escape-Hatch für
// beliebige andere Google Fonts (Freitext blieb bisher moeglich, das soll so bleiben).
const fontSelectPairs = [
  [els.preTextFont, els.preTextFontCustom],
  [els.monthFont, els.monthFontCustom],
  [els.counterFont, els.counterFontCustom],
];

for (const [select] of fontSelectPairs) {
  for (const font of FONT_OPTIONS) {
    const opt = document.createElement('option');
    opt.value = font;
    opt.textContent = font;
    if (font === 'Bangers') opt.selected = true;
    select.appendChild(opt);
  }
  const customOpt = document.createElement('option');
  customOpt.value = CUSTOM_FONT_VALUE;
  customOpt.textContent = 'Eigene Google Font …';
  select.appendChild(customOpt);
}

for (const [select, customInput] of fontSelectPairs) {
  select.addEventListener('change', () => {
    customInput.hidden = select.value !== CUSTOM_FONT_VALUE;
    if (!customInput.hidden) customInput.focus();
  });
}

function resolveFont(select, customInput) {
  if (select.value === CUSTOM_FONT_VALUE) {
    return customInput.value.trim() || 'Bangers';
  }
  return select.value;
}

function getChannelMode() {
  return document.querySelector('input[name="channelMode"]:checked').value;
}

function collectConfig() {
  const mode = getChannelMode();
  return {
    channel: mode === 'single' ? els.channel.value.trim() : '',
    channels: mode === 'aggregate' ? els.channels.value.trim() : '',
    refreshRate: parseInt(els.refreshRate.value, 10) || 5000,
    history: els.history.checked,
    textAlign: els.textAlign.value,
    bg: els.bgTransparent.checked ? 'transparent' : els.bgColor.value,

    preText: els.preText.value,
    preTextFont: resolveFont(els.preTextFont, els.preTextFontCustom),
    preTextSize: parseInt(els.preTextSize.value, 10) || 32,
    preTextWeight: els.preTextWeight.value,
    preTextColor: els.preTextColor.value,

    showMonth: els.showMonth.checked,
    monthFont: resolveFont(els.monthFont, els.monthFontCustom),
    monthSize: parseInt(els.monthSize.value, 10) || 32,
    monthWeight: els.monthWeight.value,
    monthColor: els.monthColor.value,

    counterFont: resolveFont(els.counterFont, els.counterFontCustom),
    counterSize: parseInt(els.counterSize.value, 10) || 70,
    counterWeight: els.counterWeight.value,
    counterColor: els.counterColor.value,
  };
}

let debounceTimer = null;

function updatePreview() {
  const config = collectConfig();
  const queryString = buildQueryString(config);
  const relativeUrl = `index.html${queryString ? '?' + queryString : ''}`;
  const absoluteUrl = `${window.location.origin}${window.location.pathname.replace('config.html', '')}${relativeUrl}`;

  els.previewFrame.src = relativeUrl;
  els.previewFrame.style.background = config.bg === 'transparent' ? 'transparent' : config.bg;
  els.generatedUrl.value = absoluteUrl;
  els.copyFeedback.hidden = true;
}

function scheduleUpdate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(updatePreview, 250);
}

// Alle Formularfelder ueberwachen
document.getElementById('configForm').addEventListener('input', scheduleUpdate);
document.getElementById('configForm').addEventListener('change', scheduleUpdate);

// Kanal-Modus: passendes Eingabefeld aktivieren/deaktivieren
els.channelModeRadios.forEach((radio) => {
  radio.addEventListener('change', () => {
    const mode = getChannelMode();
    els.channel.disabled = mode !== 'single';
    els.channels.disabled = mode !== 'aggregate';
    scheduleUpdate();
  });
});

// Transparenz-Checkbox steuert, ob der Farbwähler relevant ist
els.bgTransparent.addEventListener('change', () => {
  els.bgColor.disabled = els.bgTransparent.checked;
});
els.bgColor.disabled = els.bgTransparent.checked;

// Theme-Toggle: Zustand wurde im <head>-Inline-Script schon vor dem ersten Paint
// gesetzt (siehe config.html) - hier nur die Checkbox synchronisieren und auf
// Umschalten reagieren.
function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    // z.B. privates Fenster ohne Storage-Zugriff -> Theme gilt nur fuer diese Sitzung.
  }
}

els.themeToggle.checked = document.documentElement.dataset.theme === 'dark';
els.themeToggle.addEventListener('change', () => {
  const theme = els.themeToggle.checked ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  safeLocalStorageSet('chatCounterTheme', theme);
});

els.copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(els.generatedUrl.value);
    els.copyFeedback.hidden = false;
  } catch (err) {
    els.generatedUrl.select();
    document.execCommand('copy');
    els.copyFeedback.hidden = false;
  }
});

updatePreview();
