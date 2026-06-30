const APP_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby-USxqI9gM8zqtEHFOV-dUfaHgc3Ngyu1dStIm9mpgcrgCBCw66PI8f5_Q9n8R2Tnmuw/exec";

const state = {
  songs: [],
  selectedSongId: null,
  selectedInstrument: "Voz",
  query: "",
  tuner: {
    animationId: null,
    analyser: null,
    audioContext: null,
    buffer: null,
    enabled: false,
    source: null,
    stream: null,
  },
};

const dom = {
  searchInput: document.querySelector("#searchInput"),
  songList: document.querySelector("#songList"),
  songCount: document.querySelector("#songCount"),
  instrumentCount: document.querySelector("#instrumentCount"),
  pageTitle: document.querySelector("#pageTitle"),
  songArtist: document.querySelector("#songArtist"),
  songTitle: document.querySelector("#songTitle"),
  songMeta: document.querySelector("#songMeta"),
  notesBox: document.querySelector("#notesBox"),
  instrumentTabs: document.querySelector("#instrumentTabs"),
  chartTitle: document.querySelector("#chartTitle"),
  chartText: document.querySelector("#chartText"),
  lyricsText: document.querySelector("#lyricsText"),
  addSongBtn: document.querySelector("#addSongBtn"),
  editSongBtn: document.querySelector("#editSongBtn"),
  syncBtn: document.querySelector("#syncBtn"),
  printBtn: document.querySelector("#printBtn"),
  copyChartBtn: document.querySelector("#copyChartBtn"),
  copyLyricsBtn: document.querySelector("#copyLyricsBtn"),
  songDialog: document.querySelector("#songDialog"),
  songForm: document.querySelector("#songForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  closeDialogBtn: document.querySelector("#closeDialogBtn"),
  cancelDialogBtn: document.querySelector("#cancelDialogBtn"),
  addInstrumentBtn: document.querySelector("#addInstrumentBtn"),
  instrumentFields: document.querySelector("#instrumentFields"),
  tunerFrequency: document.querySelector("#tunerFrequency"),
  tunerNeedle: document.querySelector("#tunerNeedle"),
  tunerNote: document.querySelector("#tunerNote"),
  tunerStatus: document.querySelector("#tunerStatus"),
  tunerToggleBtn: document.querySelector("#tunerToggleBtn"),
  toast: document.querySelector("#toast"),
};

init();

function init() {
  state.songs = loadLocalSongs();
  state.selectedSongId = state.songs[0]?.id ?? null;
  bindEvents();
  render();
  refreshIcons();
  if (APP_SCRIPT_URL) {
    syncWithBackend({ silent: true });
  }
}

function createSong(title, artist) {
  return {
    id: slugify(`${artist}-${title}`),
    title,
    artist,
    key: "",
    bpm: "",
    notes: "Cifra e letra ainda nao cadastradas.",
    lyrics: "",
    instruments: [
      { name: "Voz", chart: "" },
      { name: "Violao", chart: "" },
      { name: "Guitarra", chart: "" },
      { name: "Baixo", chart: "" },
    ],
    updatedAt: new Date().toISOString(),
  };
}

function bindEvents() {
  dom.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderSongList();
  });

  dom.addSongBtn.addEventListener("click", () => openSongDialog());
  dom.editSongBtn.addEventListener("click", () => openSongDialog(getSelectedSong()));
  dom.syncBtn.addEventListener("click", syncWithBackend);
  dom.printBtn.addEventListener("click", () => window.print());
  dom.closeDialogBtn.addEventListener("click", closeDialog);
  dom.cancelDialogBtn.addEventListener("click", closeDialog);
  dom.addInstrumentBtn.addEventListener("click", () => addInstrumentField());
  dom.tunerToggleBtn.addEventListener("click", toggleTuner);

  dom.copyChartBtn.addEventListener("click", () => copyText(dom.chartText.textContent, "Cifra copiada."));
  dom.copyLyricsBtn.addEventListener("click", () => copyText(dom.lyricsText.textContent, "Letra copiada."));

  dom.songForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const song = readFormSong();
    upsertSong(song);
    saveLocalSongs();
    closeDialog();
    render();
    await saveToBackend(song);
  });
}

function render() {
  renderStats();
  renderSongList();
  renderSelectedSong();
  refreshIcons();
}

function renderStats() {
  const instrumentTotal = state.songs.reduce((total, song) => total + song.instruments.length, 0);
  dom.songCount.textContent = state.songs.length;
  dom.instrumentCount.textContent = instrumentTotal;
}

function renderSongList() {
  const filteredSongs = state.songs.filter((song) => {
    const haystack = `${song.title} ${song.artist}`.toLowerCase();
    return haystack.includes(state.query);
  });

  dom.songList.innerHTML = "";

  filteredSongs.forEach((song) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `song-item${song.id === state.selectedSongId ? " active" : ""}`;
    button.innerHTML = `<strong>${escapeHtml(song.title)}</strong><span>${escapeHtml(song.artist)}</span>`;
    button.addEventListener("click", () => {
      state.selectedSongId = song.id;
      state.selectedInstrument = song.instruments[0]?.name ?? "";
      render();
    });
    dom.songList.append(button);
  });

  if (!filteredSongs.length) {
    const empty = document.createElement("p");
    empty.className = "song-meta";
    empty.textContent = "Nenhuma musica encontrada.";
    dom.songList.append(empty);
  }
}

function renderSelectedSong() {
  const song = getSelectedSong();
  if (!song) {
    dom.pageTitle.textContent = "ReperArthuRio";
    dom.songArtist.textContent = "";
    dom.songTitle.textContent = "Repertorio vazio";
    dom.songMeta.textContent = "";
    dom.notesBox.textContent = "Clique em Sync para carregar as musicas do Apps Script.";
    dom.notesBox.classList.add("visible");
    dom.instrumentTabs.innerHTML = "";
    dom.chartTitle.textContent = "Cifra";
    dom.chartText.textContent = "Nenhuma musica carregada.";
    dom.lyricsText.textContent = "Nenhuma letra carregada.";
    return;
  }

  const instrument = getSelectedInstrument(song);
  dom.pageTitle.textContent = song.title;
  dom.songArtist.textContent = song.artist;
  dom.songTitle.textContent = song.title;
  dom.songMeta.textContent = [song.key && `Tom: ${song.key}`, song.bpm && `${song.bpm} BPM`]
    .filter(Boolean)
    .join(" | ");

  dom.notesBox.textContent = song.notes || "";
  dom.notesBox.classList.toggle("visible", Boolean(song.notes));

  renderInstrumentTabs(song);
  dom.chartTitle.textContent = instrument ? `Cifra - ${instrument.name}` : "Cifra";
  dom.chartText.textContent =
    instrument?.chart?.trim() ||
    "Sem cifra cadastrada para este instrumento.\nUse Editar para adicionar sua transcricao.";
  dom.lyricsText.textContent =
    song.lyrics?.trim() || "Sem letra cadastrada.\nUse Editar para adicionar uma letra licenciada ou autoral.";
}

function renderInstrumentTabs(song) {
  dom.instrumentTabs.innerHTML = "";
  song.instruments.forEach((instrument) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tab-button${instrument.name === state.selectedInstrument ? " active" : ""}`;
    button.textContent = instrument.name;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(instrument.name === state.selectedInstrument));
    button.addEventListener("click", () => {
      state.selectedInstrument = instrument.name;
      renderSelectedSong();
    });
    dom.instrumentTabs.append(button);
  });
}

function openSongDialog(song = null) {
  const editing = Boolean(song);
  const targetSong = structuredClone(song ?? createSong("", ""));
  dom.dialogTitle.textContent = editing ? "Editar musica" : "Adicionar musica";
  dom.songForm.dataset.songId = targetSong.id;
  dom.songForm.elements.title.value = targetSong.title;
  dom.songForm.elements.artist.value = targetSong.artist;
  dom.songForm.elements.key.value = targetSong.key;
  dom.songForm.elements.bpm.value = targetSong.bpm;
  dom.songForm.elements.notes.value = targetSong.notes;
  dom.songForm.elements.lyrics.value = targetSong.lyrics;
  dom.instrumentFields.innerHTML = "";
  targetSong.instruments.forEach((instrument) => addInstrumentField(instrument));
  dom.songDialog.showModal();
  refreshIcons();
}

function closeDialog() {
  dom.songDialog.close();
}

function addInstrumentField(instrument = { name: "", chart: "" }) {
  const row = document.createElement("div");
  row.className = "instrument-row";
  row.innerHTML = `
    <label>
      Instrumento
      <input data-field="instrument-name" value="${escapeAttribute(instrument.name)}" placeholder="Ex.: Violao" />
    </label>
    <label>
      Cifra
      <textarea data-field="instrument-chart" rows="5" placeholder="Cole aqui a cifra deste instrumento.">${escapeHtml(
        instrument.chart,
      )}</textarea>
    </label>
    <button class="icon-button" type="button" title="Remover instrumento">
      <i data-lucide="trash-2" aria-hidden="true"></i>
    </button>
  `;
  row.querySelector("button").addEventListener("click", () => row.remove());
  dom.instrumentFields.append(row);
  refreshIcons();
}

function readFormSong() {
  const form = dom.songForm;
  const title = form.elements.title.value.trim();
  const artist = form.elements.artist.value.trim();
  const existingId = form.dataset.songId;
  const id = existingId || slugify(`${artist}-${title}`);
  const instruments = [...dom.instrumentFields.querySelectorAll(".instrument-row")]
    .map((row) => ({
      name: row.querySelector('[data-field="instrument-name"]').value.trim(),
      chart: row.querySelector('[data-field="instrument-chart"]').value.trim(),
    }))
    .filter((instrument) => instrument.name);

  return {
    id: id || crypto.randomUUID(),
    title,
    artist,
    key: form.elements.key.value.trim(),
    bpm: form.elements.bpm.value.trim(),
    notes: form.elements.notes.value.trim(),
    lyrics: form.elements.lyrics.value.trim(),
    instruments: instruments.length ? instruments : [{ name: "Voz", chart: "" }],
    updatedAt: new Date().toISOString(),
  };
}

function upsertSong(song) {
  const index = state.songs.findIndex((item) => item.id === song.id);
  if (index >= 0) {
    state.songs[index] = song;
  } else {
    state.songs.push(song);
  }
  state.songs.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  state.selectedSongId = song.id;
  state.selectedInstrument = song.instruments[0]?.name ?? "";
}

function getSelectedSong() {
  return state.songs.find((song) => song.id === state.selectedSongId) ?? state.songs[0];
}

function getSelectedInstrument(song) {
  return (
    song.instruments.find((instrument) => instrument.name === state.selectedInstrument) ??
    song.instruments[0]
  );
}

function loadLocalSongs() {
  const stored = localStorage.getItem("arthurio-repertoire");
  if (!stored) return [];
  try {
    const songs = JSON.parse(stored);
    return Array.isArray(songs) ? songs : [];
  } catch {
    return [];
  }
}

function saveLocalSongs() {
  localStorage.setItem("arthurio-repertoire", JSON.stringify(state.songs));
}

function backupLocalSongs() {
  localStorage.setItem(
    `arthurio-repertoire-backup-${new Date().toISOString()}`,
    JSON.stringify(state.songs),
  );
}

async function syncWithBackend(options = {}) {
  const { silent = false } = options;
  if (!APP_SCRIPT_URL) {
    showToast("Configure APP_SCRIPT_URL no app.js para sincronizar com Apps Script.");
    return;
  }

  try {
    const songs = await getBackendSongs();
    if (!songs.length) {
      if (!silent) showToast("Nenhuma musica encontrada no Apps Script.");
      return;
    }

    backupLocalSongs();
    const currentSongId = state.selectedSongId;
    state.songs = songs.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    state.selectedSongId = state.songs.some((song) => song.id === currentSongId)
      ? currentSongId
      : state.songs[0].id;
    state.selectedInstrument = getSelectedSong()?.instruments[0]?.name ?? "";
    saveLocalSongs();
    render();
    if (!silent) showToast("Repertorio carregado do Apps Script.");
  } catch (error) {
    console.error(error);
    if (!silent) showToast("Nao foi possivel sincronizar agora.");
  }
}

function getBackendSongs() {
  return new Promise((resolve, reject) => {
    const callbackName = `arthurioCallback_${Date.now()}`;
    const script = document.createElement("script");
    const url = new URL(APP_SCRIPT_URL);
    url.searchParams.set("action", "list");
    url.searchParams.set("callback", callbackName);

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload?.songs ?? []);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP request failed"));
    };

    function cleanup() {
      script.remove();
      delete window[callbackName];
    }

    script.src = url.toString();
    document.body.append(script);
  });
}

async function saveToBackend(song) {
  if (!APP_SCRIPT_URL) {
    showToast("Musica salva neste navegador.");
    return;
  }

  const body = new FormData();
  body.set("action", "save");
  body.set("song", JSON.stringify(song));

  try {
    await fetch(APP_SCRIPT_URL, {
      method: "POST",
      body,
      mode: "no-cors",
    });
    showToast("Musica enviada para o Apps Script.");
  } catch (error) {
    console.error(error);
    showToast("Salva localmente; envio ao Apps Script falhou.");
  }
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch {
    showToast("Nao foi possivel copiar.");
  }
}

async function toggleTuner() {
  if (state.tuner.enabled) {
    stopTuner();
    return;
  }

  await startTuner();
}

async function startTuner() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("Este navegador nao liberou acesso ao microfone.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 4096;
    source.connect(analyser);

    state.tuner = {
      animationId: null,
      analyser,
      audioContext,
      buffer: new Float32Array(analyser.fftSize),
      enabled: true,
      source,
      stream,
    };

    updateTunerButton(true);
    dom.tunerStatus.textContent = "Ouvindo...";
    readTuner();
  } catch (error) {
    console.error(error);
    showToast("Nao foi possivel acessar o microfone.");
  }
}

function stopTuner() {
  if (state.tuner.animationId) {
    cancelAnimationFrame(state.tuner.animationId);
  }
  state.tuner.stream?.getTracks().forEach((track) => track.stop());
  state.tuner.audioContext?.close();
  state.tuner = {
    animationId: null,
    analyser: null,
    audioContext: null,
    buffer: null,
    enabled: false,
    source: null,
    stream: null,
  };
  updateTunerButton(false);
  dom.tunerNote.textContent = "--";
  dom.tunerFrequency.textContent = "Microfone desligado";
  dom.tunerStatus.textContent = "Toque uma corda depois de ligar o afinador.";
  dom.tunerNeedle.style.transform = "translateX(-50%)";
}

function readTuner() {
  if (!state.tuner.enabled) return;

  state.tuner.analyser.getFloatTimeDomainData(state.tuner.buffer);
  const frequency = detectPitch(state.tuner.buffer, state.tuner.audioContext.sampleRate);

  if (frequency > 0) {
    renderTunerResult(frequency);
  } else {
    dom.tunerNote.textContent = "--";
    dom.tunerFrequency.textContent = "Sem nota estavel";
    dom.tunerStatus.textContent = "Aproxime o instrumento e toque uma nota por vez.";
    dom.tunerNeedle.style.transform = "translateX(-50%)";
  }

  state.tuner.animationId = requestAnimationFrame(readTuner);
}

function detectPitch(buffer, sampleRate) {
  const bufferLength = buffer.length;
  let rms = 0;

  for (let i = 0; i < bufferLength; i += 1) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / bufferLength);
  if (rms < 0.01) return -1;

  let bestOffset = -1;
  let bestCorrelation = 0;
  const minOffset = Math.floor(sampleRate / 1000);
  const maxOffset = Math.floor(sampleRate / 55);

  for (let offset = minOffset; offset <= maxOffset; offset += 1) {
    let correlation = 0;
    for (let i = 0; i < bufferLength - offset; i += 1) {
      correlation += 1 - Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation /= bufferLength - offset;

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    }
  }

  if (bestCorrelation < 0.82 || bestOffset < 0) return -1;
  return sampleRate / bestOffset;
}

function renderTunerResult(frequency) {
  const noteNumber = Math.round(12 * Math.log2(frequency / 440) + 69);
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const noteName = noteNames[((noteNumber % 12) + 12) % 12];
  const targetFrequency = 440 * 2 ** ((noteNumber - 69) / 12);
  const cents = Math.round(1200 * Math.log2(frequency / targetFrequency));
  const clampedCents = Math.max(-50, Math.min(50, cents));

  dom.tunerNote.textContent = noteName;
  dom.tunerFrequency.textContent = `${frequency.toFixed(1)} Hz`;
  dom.tunerStatus.textContent = getTunerStatus(cents);
  dom.tunerNeedle.style.transform = `translateX(calc(-50% + ${clampedCents * 2.4}px))`;
}

function getTunerStatus(cents) {
  if (Math.abs(cents) <= 4) return "Afinado";
  if (cents < 0) return `${Math.abs(cents)} cents abaixo`;
  return `${cents} cents acima`;
}

function updateTunerButton(enabled) {
  dom.tunerToggleBtn.innerHTML = enabled
    ? '<i data-lucide="mic-off" aria-hidden="true"></i><span>Desligar</span>'
    : '<i data-lucide="mic" aria-hidden="true"></i><span>Ligar</span>';
  refreshIcons();
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => dom.toast.classList.remove("visible"), 2800);
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
