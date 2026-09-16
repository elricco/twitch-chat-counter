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
  preTextSize: document.getElementById('preTextSize'),
  preTextWeight: document.getElementById('preTextWeight'),
  preTextColor: document.getElementById('preTextColor'),

  showMonth: document.getElementById('showMonth'),
  monthFont: document.getElementById('monthFont'),
  monthSize: document.getElementById('monthSize'),
  monthWeight: document.getElementById('monthWeight'),
  monthColor: document.getElementById('monthColor'),

  counterFont: document.getElementById('counterFont'),
  counterSize: document.getElementById('counterSize'),
  counterWeight: document.getElementById('counterWeight'),
  counterColor: document.getElementById('counterColor'),

  previewFrame: document.getElementById('previewFrame'),
  generatedUrl: document.getElementById('generatedUrl'),
  copyBtn: document.getElementById('copyBtn'),
  copyFeedback: document.getElementById('copyFeedback'),
};

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
    preTextFont: els.preTextFont.value || 'Bangers',
    preTextSize: parseInt(els.preTextSize.value, 10) || 32,
    preTextWeight: els.preTextWeight.value,
    preTextColor: els.preTextColor.value,

    showMonth: els.showMonth.checked,
    monthFont: els.monthFont.value || 'Bangers',
    monthSize: parseInt(els.monthSize.value, 10) || 32,
    monthWeight: els.monthWeight.value,
    monthColor: els.monthColor.value,

    counterFont: els.counterFont.value || 'Bangers',
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
