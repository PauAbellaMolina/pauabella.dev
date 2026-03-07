// ─────────────────────────────────────────────
//  codesynth — live music coding experiment
//
//  Language syntax:
//    bpm 128
//    kick   | x . . . | x . . . | x . . . | x . . . |
//    snare  | . . . . | x . . . | . . . . | x . . . |
//    synth  c4 | x . . x | . . x . |
//    bass   c2 | x . . . |
//    # comment
// ─────────────────────────────────────────────

const DEFAULT_CODE =
`bpm 128

kick   | x . . . | x . . . | x . . . | x . . . |
snare  | . . . . | x . . . | . . . . | x . . . |
hat    | x . x . | x . x . | x . x . | x . x . |

synth  c4 | x . . x | . . x . | x . . x | . x . . |
synth  e4 | . . x . | x . . . | . . x . | . . . x |
bass   c2 | x . . . | . . . . | x . . . | . . . . |`;

// ── Note frequencies ──────────────────────────

const NOTE_FREQ = {};
const NOTE_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
for (let oct = 0; oct <= 8; oct++) {
  for (let i = 0; i < 12; i++) {
    NOTE_FREQ[NOTE_NAMES[i] + oct] = 440 * Math.pow(2, (oct - 4) + (i - 9) / 12);
  }
}

// ── Constants ─────────────────────────────────

const STEPS = 16;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.12;
const MELODIC_INSTRUMENTS = ['synth', 'bass', 'pad'];

// ── Shared state ──────────────────────────────

let parsedTracks = [];
let currentBpm = 128;
let isUIMode = false;
let suppressEditorUpdate = false; // prevent parse→generate→parse loops

// ── Playback state ────────────────────────────

let audioCtx = null;
let isPlaying = false;
let timerID = null;
let schedulerStep = 0;
let nextStepTime = 0;

// Queue of {step, time} for syncing display to audio clock
const stepQueue = [];
let lastVizStep = -1;

// ── DOM refs ──────────────────────────────────

const app        = document.getElementById('app');
const editor     = document.getElementById('editor');
const playBtn    = document.getElementById('play-btn');
const bpmDisplay = document.getElementById('bpm-display');
const viz        = document.getElementById('viz');
const seqTracks  = document.getElementById('seq-tracks');
const statusBar  = document.getElementById('status-bar');
const statusText = document.getElementById('status-text');
const modeCode   = document.getElementById('mode-code');
const modeUI     = document.getElementById('mode-ui');
const bpmDown    = document.getElementById('bpm-down');
const bpmUp      = document.getElementById('bpm-up');
const bpmValue   = document.getElementById('bpm-value');
const instSelect = document.getElementById('inst-select');
const noteInput  = document.getElementById('note-input');
const addTrackBtn = document.getElementById('add-track-btn');

editor.value = DEFAULT_CODE;

// ── Parser ────────────────────────────────────

function parseCode(code) {
  const tracks = [];
  let bpm = 120;

  for (const rawLine of code.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;

    const bpmMatch = line.match(/^bpm\s+(\d+)/i);
    if (bpmMatch) {
      bpm = Math.min(300, Math.max(20, parseInt(bpmMatch[1])));
      continue;
    }

    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;

    const instrument = tokens[0].toLowerCase();
    const NOTE_RE = /^[a-g]#?\d$/i;
    let note = null;
    let patternTokens;

    if (NOTE_RE.test(tokens[1])) {
      note = tokens[1].toLowerCase();
      patternTokens = tokens.slice(2);
    } else {
      patternTokens = tokens.slice(1);
    }

    const steps = [];
    for (const tok of patternTokens) {
      for (const ch of tok) {
        if (ch === 'x' || ch === 'X') steps.push(true);
        else if (ch === '.') steps.push(false);
      }
    }

    if (steps.length === 0) continue;

    // Tile to 16 steps
    const tiled = Array.from({ length: STEPS }, (_, i) => steps[i % steps.length]);
    const label = note ? `${instrument} ${note}` : instrument;
    tracks.push({ instrument, note, steps: tiled, label });
  }

  return { bpm, tracks };
}

// ── Code generator (state → text) ────────────

function generateCode(tracks, bpm) {
  const lines = [`bpm ${bpm}`, ''];
  for (const track of tracks) {
    const groups = [];
    for (let g = 0; g < 4; g++) {
      groups.push(track.steps.slice(g * 4, g * 4 + 4).map(s => s ? 'x' : '.').join(' '));
    }
    const pattern = '| ' + groups.join(' | ') + ' |';
    const prefix = track.note ? `${track.instrument}  ${track.note}` : track.instrument;
    lines.push(prefix.padEnd(11) + pattern);
  }
  return lines.join('\n');
}

// Sync editor from current state without triggering re-parse
function syncEditorFromState() {
  suppressEditorUpdate = true;
  editor.value = generateCode(parsedTracks, currentBpm);
  suppressEditorUpdate = false;
}

// ── Audio synthesis ───────────────────────────

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playKick(ac, t) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.frequency.setValueAtTime(130, t);
  osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.42);
  gain.gain.setValueAtTime(1.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
  osc.start(t);
  osc.stop(t + 0.42);
}

function playSnare(ac, t) {
  const bufLen = Math.ceil(ac.sampleRate * 0.18);
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const hpf = ac.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 1200;
  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(0.65, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  noise.connect(hpf);
  hpf.connect(noiseGain);
  noiseGain.connect(ac.destination);
  noise.start(t);
  noise.stop(t + 0.18);

  const osc = ac.createOscillator();
  const oscGain = ac.createGain();
  osc.frequency.value = 185;
  oscGain.gain.setValueAtTime(0.5, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(oscGain);
  oscGain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

function playClap(ac, t) {
  for (let layer = 0; layer < 3; layer++) {
    const delay = layer * 0.012;
    const bufLen = Math.ceil(ac.sampleRate * 0.1);
    const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ac.createBufferSource();
    noise.buffer = buf;
    const bpf = ac.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 1200;
    bpf.Q.value = 0.7;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.5, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.1);
    noise.connect(bpf);
    bpf.connect(gain);
    gain.connect(ac.destination);
    noise.start(t + delay);
    noise.stop(t + delay + 0.1);
  }
}

function playHat(ac, t, open) {
  const dur = open ? 0.28 : 0.045;
  const bufLen = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const bpf = ac.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = 9500;
  bpf.Q.value = 0.3;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(open ? 0.3 : 0.38, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.connect(bpf);
  bpf.connect(gain);
  gain.connect(ac.destination);
  noise.start(t);
  noise.stop(t + dur);
}

function playRim(ac, t) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 480;
  gain.gain.setValueAtTime(0.45, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.055);
}

function playSynth(ac, t, note, instrument) {
  const freq = NOTE_FREQ[note] || NOTE_FREQ['c4'];
  const osc = ac.createOscillator();
  const filt = ac.createBiquadFilter();
  const gain = ac.createGain();

  if (instrument === 'bass') {
    osc.type = 'sine';
    filt.type = 'lowpass';
    filt.frequency.value = 350;
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
  } else if (instrument === 'pad') {
    osc.type = 'triangle';
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(1600, t);
    filt.frequency.exponentialRampToValueAtTime(700, t + 0.5);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  } else {
    osc.type = 'sawtooth';
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(2800, t);
    filt.frequency.exponentialRampToValueAtTime(700, t + 0.22);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  }

  osc.frequency.value = freq;
  osc.connect(filt);
  filt.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.6);
}

function triggerTrack(track, t) {
  const ac = getCtx();
  switch (track.instrument) {
    case 'kick':                  playKick(ac, t); break;
    case 'snare':                 playSnare(ac, t); break;
    case 'clap':                  playClap(ac, t); break;
    case 'hat': case 'hihat':     playHat(ac, t, false); break;
    case 'openhat':               playHat(ac, t, true); break;
    case 'rim':                   playRim(ac, t); break;
    case 'synth': case 'bass': case 'pad':
      playSynth(ac, t, track.note || 'c4', track.instrument); break;
  }
}

// ── Scheduler ─────────────────────────────────

function scheduleStep(step, time) {
  // At loop start: re-parse and update audio state
  if (step === 0) {
    const result = parseCode(editor.value);
    parsedTracks = result.tracks;
    if (result.bpm !== currentBpm) {
      currentBpm = result.bpm;
      bpmDisplay.textContent = `${currentBpm} bpm`;
      if (isUIMode) bpmValue.textContent = currentBpm;
    }
    // Rebuild viz in code mode only (sequencer updates via input events)
    if (!isUIMode) rebuildViz();
  }

  stepQueue.push({ step, time });

  for (const track of parsedTracks) {
    if (track.steps[step]) triggerTrack(track, time);
  }
}

function scheduler() {
  const ac = getCtx();
  const stepDur = 60 / currentBpm / 4;

  while (nextStepTime < ac.currentTime + SCHEDULE_AHEAD_S) {
    scheduleStep(schedulerStep, nextStepTime);
    schedulerStep = (schedulerStep + 1) % STEPS;
    nextStepTime += stepDur;
  }

  timerID = setTimeout(scheduler, LOOKAHEAD_MS);
}

// ── Visual sync (RAF) ─────────────────────────

function animateViz() {
  if (isPlaying && audioCtx) {
    const now = audioCtx.currentTime;
    let curStep = lastVizStep;

    while (stepQueue.length > 0 && stepQueue[0].time <= now) {
      curStep = stepQueue.shift().step;
    }

    if (curStep !== lastVizStep) {
      lastVizStep = curStep;
      if (isUIMode) highlightSeqStep(curStep);
      else          highlightVizStep(curStep);
    }
  }
  requestAnimationFrame(animateViz);
}

function highlightVizStep(step) {
  viz.querySelectorAll('.track-row').forEach(row => {
    row.querySelectorAll('.step').forEach((el, i) => el.classList.toggle('current', i === step));
  });
}

function highlightSeqStep(step) {
  seqTracks.querySelectorAll('.seq-row').forEach(row => {
    row.querySelectorAll('.seq-step').forEach((el, i) => el.classList.toggle('current', i === step));
  });
}

function clearStepHighlights() {
  viz.querySelectorAll('.step').forEach(el => el.classList.remove('current'));
  seqTracks.querySelectorAll('.seq-step').forEach(el => el.classList.remove('current'));
}

requestAnimationFrame(animateViz);

// ── Viz builder (code mode) ───────────────────

function rebuildViz() {
  const curStep = lastVizStep;
  viz.innerHTML = '';

  for (const track of parsedTracks) {
    const row = document.createElement('div');
    row.className = 'track-row';

    const nameEl = document.createElement('div');
    nameEl.className = 'track-name';
    nameEl.textContent = track.label;
    row.appendChild(nameEl);

    const stepsEl = document.createElement('div');
    stepsEl.className = 'track-steps';

    for (let g = 0; g < 4; g++) {
      const group = document.createElement('div');
      group.className = 'step-group';
      for (let s = 0; s < 4; s++) {
        const i = g * 4 + s;
        const el = document.createElement('div');
        el.className = `step ${track.steps[i] ? 'on' : 'off'}${i === curStep ? ' current' : ''}`;
        group.appendChild(el);
      }
      stepsEl.appendChild(group);
    }

    row.appendChild(stepsEl);
    viz.appendChild(row);
  }
}

// ── Sequencer builder (UI mode) ───────────────

function rebuildSequencer() {
  const curStep = lastVizStep;
  seqTracks.innerHTML = '';

  for (let ti = 0; ti < parsedTracks.length; ti++) {
    const track = parsedTracks[ti];

    const row = document.createElement('div');
    row.className = 'seq-row';

    const nameEl = document.createElement('div');
    nameEl.className = 'seq-name';
    nameEl.textContent = track.label;
    row.appendChild(nameEl);

    const stepsEl = document.createElement('div');
    stepsEl.className = 'seq-steps';

    for (let g = 0; g < 4; g++) {
      const group = document.createElement('div');
      group.className = 'seq-group';
      for (let s = 0; s < 4; s++) {
        const i = g * 4 + s;
        const btn = document.createElement('button');
        btn.className = `seq-step ${track.steps[i] ? 'on' : 'off'}${i === curStep ? ' current' : ''}`;
        btn.dataset.track = ti;
        btn.dataset.step = i;
        btn.addEventListener('click', handleStepClick);
        group.appendChild(btn);
      }
      stepsEl.appendChild(group);
    }

    row.appendChild(stepsEl);

    const del = document.createElement('button');
    del.className = 'seq-delete';
    del.textContent = '×';
    del.title = 'remove track';
    del.dataset.track = ti;
    del.addEventListener('click', handleDeleteTrack);
    row.appendChild(del);

    seqTracks.appendChild(row);
  }
}

// ── Sequencer interactions ────────────────────

function handleStepClick(e) {
  const ti = parseInt(e.currentTarget.dataset.track);
  const si = parseInt(e.currentTarget.dataset.step);
  parsedTracks[ti].steps[si] = !parsedTracks[ti].steps[si];
  // Update just the clicked button (no full rebuild)
  e.currentTarget.classList.toggle('on',  parsedTracks[ti].steps[si]);
  e.currentTarget.classList.toggle('off', !parsedTracks[ti].steps[si]);
  syncEditorFromState();
}

function handleDeleteTrack(e) {
  const ti = parseInt(e.currentTarget.dataset.track);
  parsedTracks.splice(ti, 1);
  rebuildSequencer();
  syncEditorFromState();
}

function handleAddTrack() {
  const instrument = instSelect.value;
  let note = null;

  if (MELODIC_INSTRUMENTS.includes(instrument)) {
    const raw = noteInput.value.trim().toLowerCase();
    note = NOTE_FREQ[raw] ? raw : 'c4';
  }

  const label = note ? `${instrument} ${note}` : instrument;
  const steps = Array(STEPS).fill(false);
  parsedTracks.push({ instrument, note, steps, label });

  rebuildSequencer();
  syncEditorFromState();

  // Scroll the new row into view
  seqTracks.lastElementChild?.scrollIntoView({ block: 'nearest' });
}

// Show/hide note input based on selected instrument
function updateNoteInputVisibility() {
  noteInput.style.display = MELODIC_INSTRUMENTS.includes(instSelect.value) ? '' : 'none';
}

instSelect.addEventListener('change', updateNoteInputVisibility);
addTrackBtn.addEventListener('click', handleAddTrack);

// BPM ± buttons
bpmDown.addEventListener('click', () => {
  currentBpm = Math.max(20, currentBpm - 5);
  bpmValue.textContent = currentBpm;
  bpmDisplay.textContent = `${currentBpm} bpm`;
  syncEditorFromState();
});

bpmUp.addEventListener('click', () => {
  currentBpm = Math.min(300, currentBpm + 5);
  bpmValue.textContent = currentBpm;
  bpmDisplay.textContent = `${currentBpm} bpm`;
  syncEditorFromState();
});

// ── Mode switching ────────────────────────────

function switchToUIMode() {
  // Parse latest code first
  const result = parseCode(editor.value);
  parsedTracks = result.tracks;
  currentBpm = result.bpm;

  isUIMode = true;
  app.classList.add('ui-mode');
  modeCode.classList.remove('active');
  modeUI.classList.add('active');

  bpmValue.textContent = currentBpm;
  rebuildSequencer();
}

function switchToCodeMode() {
  isUIMode = false;
  // Generate fresh code from current sequencer state
  syncEditorFromState();

  app.classList.remove('ui-mode');
  modeCode.classList.add('active');
  modeUI.classList.remove('active');

  rebuildViz();
}

modeCode.addEventListener('click', () => { if (isUIMode)  switchToCodeMode(); });
modeUI.addEventListener('click',   () => { if (!isUIMode) switchToUIMode(); });

// ── Playback control ──────────────────────────

function startPlaying() {
  const ac = getCtx();
  if (ac.state === 'suspended') ac.resume();

  const result = parseCode(editor.value);
  parsedTracks = result.tracks;
  currentBpm = result.bpm;
  bpmDisplay.textContent = `${currentBpm} bpm`;

  if (isUIMode) {
    bpmValue.textContent = currentBpm;
    rebuildSequencer();
  } else {
    rebuildViz();
  }

  schedulerStep = 0;
  nextStepTime = ac.currentTime + 0.05;
  stepQueue.length = 0;
  lastVizStep = -1;

  isPlaying = true;
  scheduler();

  playBtn.textContent = 'stop';
  playBtn.classList.add('playing');
  setStatus('playing — edit code or click steps, changes take effect on next loop');
}

function stopPlaying() {
  clearTimeout(timerID);
  isPlaying = false;
  stepQueue.length = 0;
  lastVizStep = -1;
  clearStepHighlights();

  playBtn.textContent = 'play';
  playBtn.classList.remove('playing');
  setStatus('stopped — press play or space to start');
}

function togglePlay() {
  if (isPlaying) stopPlaying();
  else startPlaying();
}

playBtn.addEventListener('click', togglePlay);

document.addEventListener('keydown', e => {
  if (e.target === editor) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
});

// ── Live code editing ─────────────────────────

let debounceTimer = null;
editor.addEventListener('input', () => {
  if (suppressEditorUpdate) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    try {
      const result = parseCode(editor.value);
      parsedTracks = result.tracks;
      currentBpm = result.bpm;
      bpmDisplay.textContent = `${currentBpm} bpm`;

      // Update whichever view is active
      if (isUIMode) {
        bpmValue.textContent = currentBpm;
        rebuildSequencer();
      } else {
        rebuildViz();
      }

      statusBar.classList.remove('error');
    } catch (err) {
      setStatus('parse error: ' + err.message, true);
    }
  }, 200);
});

// ── Status ────────────────────────────────────

function setStatus(msg, isError = false) {
  statusText.textContent = msg;
  statusBar.classList.toggle('error', isError);
}

// ── Init ──────────────────────────────────────

const initResult = parseCode(editor.value);
parsedTracks = initResult.tracks;
currentBpm = initResult.bpm;
bpmDisplay.textContent = `${currentBpm} bpm`;
bpmValue.textContent = currentBpm;

updateNoteInputVisibility();
rebuildViz();
setStatus('ready — press play or hit space');
