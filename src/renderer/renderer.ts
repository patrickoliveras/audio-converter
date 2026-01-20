import type { AppSettings, I18nBundle } from '../shared/types';

type View = 'idle' | 'ready' | 'converting' | 'done' | 'error';

interface State {
  view: View;
  inputPath: string | null;
  inputName: string | null;
  outputFolderPath: string | null;
  outputPath: string | null;
  jobId: string | null;
  lastOutputPath: string | null;
  errorMessage: string | null;
  settings: AppSettings;
  i18n: I18nBundle | null;
}

const state: State = {
  view: 'idle',
  inputPath: null,
  inputName: null,
  outputFolderPath: null,
  outputPath: null,
  jobId: null,
  lastOutputPath: null,
  errorMessage: null,
  settings: { notificationsEnabled: true },
  i18n: null
};

// Views
const views = {
  idle: document.getElementById('idleView')!,
  ready: document.getElementById('readyView')!,
  converting: document.getElementById('convertingView')!,
  done: document.getElementById('doneView')!,
  error: document.getElementById('errorView')!
};

// Elements
const els = {
  dropZone: document.getElementById('dropZone')!,
  fileInput: document.getElementById('fileInput') as HTMLInputElement,
  inputName: document.getElementById('inputName')!,
  outputName: document.getElementById('outputName')!,
  convertBtn: document.getElementById('convertBtn')!,
  changeFileBtn: document.getElementById('changeFileBtn')!,
  changeFolderBtn: document.getElementById('changeFolderBtn')!,
  convertingFilename: document.getElementById('convertingFilename')!,
  progressBar: document.getElementById('progressBar')!,
  progressText: document.getElementById('progressText')!,
  cancelBtn: document.getElementById('cancelBtn')!,
  doneOutputName: document.getElementById('doneOutputName')!,
  revealBtn: document.getElementById('revealBtn')!,
  anotherBtn: document.getElementById('anotherBtn')!,
  errorMessage: document.getElementById('errorMessage')!,
  errorLogsBtn: document.getElementById('errorLogsBtn')!,
  errorRetryBtn: document.getElementById('errorRetryBtn')!,
  logsBtn: document.getElementById('logsBtn')!,
  notificationToggle: document.getElementById('notificationToggle')!,
  notificationIcon: document.getElementById('notificationIcon')!,
  notificationLabel: document.getElementById('notificationLabel')!
};

// ─────────────────────────────────────────────────────────────────────────────
// i18n
// ─────────────────────────────────────────────────────────────────────────────

function t(key: string, params?: Record<string, string>): string {
  if (!state.i18n) return key;

  let text = state.i18n.translations[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }

  return text;
}

function applyI18n(): void {
  if (!state.i18n) return;

  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });

  // Update HTML lang attribute
  document.documentElement.lang = state.i18n.locale;

  // Update notification label based on current setting
  syncNotificationToggle();
}

async function loadI18n(): Promise<void> {
  state.i18n = await window.audioConverter.getI18n();
  applyI18n();
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────────

function syncNotificationToggle(): void {
  const enabled = state.settings.notificationsEnabled;
  const key = enabled ? 'settings.notificationsOn' : 'settings.notificationsOff';
  els.notificationLabel.textContent = t(key);
  els.notificationIcon.style.opacity = enabled ? '1' : '0.4';
}

async function loadSettings(): Promise<void> {
  state.settings = await window.audioConverter.getSettings();
  syncNotificationToggle();
}

async function toggleNotifications(): Promise<void> {
  const newValue = !state.settings.notificationsEnabled;
  state.settings = await window.audioConverter.updateSettings({ notificationsEnabled: newValue });
  syncNotificationToggle();
}

// ─────────────────────────────────────────────────────────────────────────────
// Views
// ─────────────────────────────────────────────────────────────────────────────

function showView(view: View): void {
  state.view = view;
  for (const [key, el] of Object.entries(views)) {
    el.classList.toggle('active', key === view);
  }
}

function setProgress(percent: number): void {
  const clamped = Math.max(0, Math.min(100, Math.round(percent * 100)));
  els.progressBar.style.width = `${clamped}%`;
  els.progressText.textContent = `${clamped}%`;
}

function getOutputBasename(outputPath: string | null): string {
  if (!outputPath) return '.m4a';
  const parts = outputPath.split(/[/\\]/);
  return parts[parts.length - 1] || '.m4a';
}

function syncReadyView(): void {
  els.inputName.textContent = state.inputName || '—';
  els.outputName.textContent = getOutputBasename(state.outputPath);
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

async function setInputFile(inputPath: string, name: string | null): Promise<void> {
  state.inputPath = inputPath;
  state.inputName = name || inputPath.split(/[/\\]/).pop() || 'file';
  state.outputFolderPath = null;
  state.lastOutputPath = null;
  state.errorMessage = null;

  // Get suggested output path
  state.outputPath = await window.audioConverter.suggestOutputPath(inputPath, null);

  syncReadyView();
  showView('ready');
}

async function chooseFile(): Promise<void> {
  const file = await window.audioConverter.selectInputFile();
  if (!file) return;
  await setInputFile(file.path, file.name);
}

async function chooseOutputFolder(): Promise<void> {
  if (!state.inputPath) return;
  const folder = await window.audioConverter.selectOutputFolder();
  if (!folder) return;

  state.outputFolderPath = folder.path;
  state.outputPath = await window.audioConverter.suggestOutputPath(state.inputPath, folder.path);
  syncReadyView();
}

async function startConversion(): Promise<void> {
  if (!state.inputPath || !state.outputPath) return;
  if (state.jobId) return;

  let outputPath = state.outputPath;
  let overwrite = false;

  const exists = await window.audioConverter.pathExists(outputPath);
  if (exists) {
    const ok = window.confirm(t('confirm.overwrite'));
    if (ok) {
      overwrite = true;
    } else {
      const picked = await window.audioConverter.selectOutputFile(outputPath);
      if (!picked) return;
      outputPath = picked.path;
      state.outputPath = outputPath;
    }
  }

  els.convertingFilename.textContent = state.inputName || t('converting.title');
  setProgress(0);
  showView('converting');

  try {
    const res = await window.audioConverter.startConversion({
      inputPath: state.inputPath,
      outputPath,
      bitrateKbps: 256,
      overwrite
    });
    state.jobId = res.jobId;
  } catch (err) {
    state.errorMessage = err instanceof Error ? err.message : String(err);
    els.errorMessage.textContent = state.errorMessage;
    showView('error');
  }
}

async function cancelConversion(): Promise<void> {
  if (!state.jobId) return;
  await window.audioConverter.cancelConversion(state.jobId);
}

function resetToIdle(): void {
  state.inputPath = null;
  state.inputName = null;
  state.outputFolderPath = null;
  state.outputPath = null;
  state.jobId = null;
  state.lastOutputPath = null;
  state.errorMessage = null;
  showView('idle');
}

async function revealOutput(): Promise<void> {
  if (!state.lastOutputPath) return;
  await window.audioConverter.revealItemInFolder(state.lastOutputPath);
}

async function revealLogs(): Promise<void> {
  await window.audioConverter.revealLogs();
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Handlers
// ─────────────────────────────────────────────────────────────────────────────

// Drop zone: click to open file picker
els.dropZone.addEventListener('click', () => {
  els.fileInput.click();
});

els.fileInput.addEventListener('change', async () => {
  const file = els.fileInput.files?.[0];
  if (!file) return;

  // Electron exposes `path` on File objects
  const maybePath = (file as unknown as { path?: string }).path;
  if (typeof maybePath === 'string' && maybePath.length > 0) {
    await setInputFile(maybePath, file.name);
  }

  // Reset input so same file can be re-selected
  els.fileInput.value = '';
});

// Drag and drop
els.dropZone.addEventListener('dragover', (ev) => {
  ev.preventDefault();
  els.dropZone.classList.add('dragover');
});

els.dropZone.addEventListener('dragleave', () => {
  els.dropZone.classList.remove('dragover');
});

els.dropZone.addEventListener('drop', async (ev) => {
  ev.preventDefault();
  els.dropZone.classList.remove('dragover');

  const file = ev.dataTransfer?.files?.[0];
  const maybePath = (file as unknown as { path?: string } | undefined)?.path;

  if (typeof maybePath === 'string' && maybePath.length > 0) {
    await setInputFile(maybePath, file?.name || null);
  }
});

// Button handlers
els.convertBtn.addEventListener('click', () => void startConversion());
els.changeFileBtn.addEventListener('click', () => void chooseFile());
els.changeFolderBtn.addEventListener('click', () => void chooseOutputFolder());
els.cancelBtn.addEventListener('click', () => void cancelConversion());
els.revealBtn.addEventListener('click', () => void revealOutput());
els.anotherBtn.addEventListener('click', () => resetToIdle());
els.errorLogsBtn.addEventListener('click', () => void revealLogs());
els.errorRetryBtn.addEventListener('click', () => {
  if (state.inputPath && state.inputName) {
    syncReadyView();
    showView('ready');
  } else {
    resetToIdle();
  }
});
els.logsBtn.addEventListener('click', () => void revealLogs());
els.notificationToggle.addEventListener('click', () => void toggleNotifications());

// IPC event handlers
window.audioConverter.onConversionProgress((ev) => {
  if (!state.jobId || ev.jobId !== state.jobId) return;
  if (ev.percent != null) {
    setProgress(ev.percent);
  }
});

window.audioConverter.onConversionDone((ev) => {
  if (!state.jobId || ev.jobId !== state.jobId) return;

  state.jobId = null;
  state.lastOutputPath = ev.outputPath;
  els.doneOutputName.textContent = getOutputBasename(ev.outputPath);
  showView('done');
});

window.audioConverter.onConversionError((ev) => {
  if (!state.jobId || ev.jobId !== state.jobId) return;

  state.jobId = null;

  if (ev.code === 'CANCELLED') {
    // Go back to ready view on cancel
    if (state.inputPath) {
      syncReadyView();
      showView('ready');
    } else {
      resetToIdle();
    }
  } else {
    state.errorMessage = ev.message;
    els.errorMessage.textContent = ev.message;
    showView('error');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  // Load i18n and settings in parallel
  await Promise.all([loadI18n(), loadSettings()]);

  // Start in idle view
  showView('idle');
}

void init();
