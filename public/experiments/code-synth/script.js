// ─────────────────────────────────────────────
//  codesynth — a live music coding experiment
//
//  Language syntax:
//    bpm 128
//    kick   | x . . . | x . . . | x . . . | x . . . |
//    snare  | . . . . | x . . . | . . . . | x . . . |
//    synth  c4 | x . . x | . . x . |
//    bass   c2 | x . . . |
//    # this is a comment
// ─────────────────────────────────────────────

const DEFAULT_CODE =
`bpm 128

kick   | x . . . | x . . . | x . . . | x . . . |
snare  | . . . . | x . . . | . . . . | x . . . |
hat    | x . x . | x . x . | x . x . | x . x . |

synth  c4 | x . . x | . . x . | x . . x | . x . . |
synth  e4 | . . x . | x . . . | . . x . | . . . x |
bass   c2 | x . . . | . . . . | x . . . | . . . . |`;

// ── Note frequency table ──────────────────────

const NOTE_FREQ = {};
const NOTE_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
for (let oct = 0; oct <= 8; oct++) {
  for (let i = 0; i < 12; i++) {
    const name = NOTE_NAMES[i] + oct;
    NOTE_FREQ[name] = 440 * Math.pow(2, (oct - 4) + (i - 9) / 12);
  }
}

// ── State ─────────────────────────────────────

const STEPS = 16;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.12;

let audioCtx = null;
let isPlaying = false;
let timerID = null;
let schedulerStep = 0;
let nextStepTime = 0;

let parsedTracks = [];
let currentBpm = 128;

// Queue of {step, time} for syncing display to audio
const stepQueue = [];
let lastVizStep = -1;

// ── DOM refs ──────────────────────────────────

const editor = document.getElementById('editor');
const playBtn = document.getElementById('play-btn');
const bpmDisplay = document.getElementById('bpm-display');
const viz = document.getElementById('viz');
const statusBar = document.getElementById('status-bar');
const statusText = document.getElementById('status-text');

editor.value = DEFAULT_CODE;

// ── Parser ────────────────────────────────────

function parseCode(code) {
  const lines = code.split('\n');
  const tracks = [];
  let bpm = 120;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;

    // bpm directive
    const bpmMatch = line.match(/^bpm\s+(\d+)/i);
    if (bpmMatch) {
      bpm = Math.min(300, Math.max(20, parseInt(bpmMatch[1])));
      continue;
    }

    // Track line: instrument [note] | pattern |
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

    // Collect x / . from pattern (ignore |)
    const steps = [];
    for (const tok of patternTokens) {
      for (const ch of tok) {
        if (ch === 'x' || ch === 'X') steps.push(true);
        else if (ch === '.') steps.push(false);
      }
    }

    if (steps.length === 0) continue;

    // Tile pattern to STEPS length
    const tiled = Array.from({ length: STEPS }, (_, i) => steps[i % steps.length]);

    const label = note ? `${instrument} ${note}` : instrument;
    tracks.push({ instrument, note, steps: tiled, label });
  }

  return { bpm, tracks };
}

// ── Audio synthesis ───────────────────────────

function ctx() {
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
  // Noise body
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

  // Tonal body
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
    // synth — sawtooth with filter sweep
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
  const ac = ctx();
  switch (track.instrument) {
    case 'kick':                    playKick(ac, t); break;
    case 'snare':                   playSnare(ac, t); break;
    case 'clap':                    playClap(ac, t); break;
    case 'hat': case 'hihat':       playHat(ac, t, false); break;
    case 'openhat':                 playHat(ac, t, true); break;
    case 'rim':                     playRim(ac, t); break;
    case 'synth': case 'bass': case 'pad':
      playSynth(ac, t, track.note || 'c4', track.instrument); break;
  }
}

// ── Scheduler ─────────────────────────────────

function scheduleStep(step, time) {
  // At loop start, re-parse and update tracks/bpm
  if (step === 0) {
    const result = parseCode(editor.value);
    parsedTracks = result.tracks;
    if (result.bpm !== currentBpm) {
      currentBpm = result.bpm;
      bpmDisplay.textContent = `${currentBpm} bpm`;
    }
    rebuildViz();
  }

  // Push to display queue
  stepQueue.push({ step, time });

  // Schedule audio
  for (const track of parsedTracks) {
    if (track.steps[step]) triggerTrack(track, time);
  }
}

function scheduler() {
  const ac = ctx();
  const stepDur = 60 / currentBpm / 4; // 16th note duration

  while (nextStepTime < ac.currentTime + SCHEDULE_AHEAD_S) {
    scheduleStep(schedulerStep, nextStepTime);
    schedulerStep = (schedulerStep + 1) % STEPS;
    nextStepTime += stepDur;
  }

  timerID = setTimeout(scheduler, LOOKAHEAD_MS);
}

// ── Visual sync ───────────────────────────────

function animateViz() {
  if (isPlaying && audioCtx) {
    const now = audioCtx.currentTime;

    // Drain queue up to current time
    let curStep = lastVizStep;
    while (stepQueue.length > 0 && stepQueue[0].time <= now) {
      curStep = stepQueue.shift().step;
    }

    if (curStep !== lastVizStep) {
      lastVizStep = curStep;
      highlightStep(curStep);
    }
  }
  requestAnimationFrame(animateViz);
}

function highlightStep(step) {
  const rows = viz.querySelectorAll('.track-row');
  rows.forEach(row => {
    const steps = row.querySelectorAll('.step');
    steps.forEach((el, i) => el.classList.toggle('current', i === step));
  });
}

requestAnimationFrame(animateViz);

// ── Viz builder ───────────────────────────────

function rebuildViz() {
  const currentHighlight = lastVizStep;
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

    // Render steps in groups of 4
    for (let g = 0; g < 4; g++) {
      const group = document.createElement('div');
      group.className = 'step-group';
      for (let s = 0; s < 4; s++) {
        const i = g * 4 + s;
        const el = document.createElement('div');
        el.className = `step ${track.steps[i] ? 'on' : 'off'}${i === currentHighlight ? ' current' : ''}`;
        group.appendChild(el);
      }
      stepsEl.appendChild(group);
    }

    row.appendChild(stepsEl);
    viz.appendChild(row);
  }
}

// ── Playback control ──────────────────────────

function startPlaying() {
  const ac = ctx();
  if (ac.state === 'suspended') ac.resume();

  const result = parseCode(editor.value);
  parsedTracks = result.tracks;
  currentBpm = result.bpm;
  bpmDisplay.textContent = `${currentBpm} bpm`;
  rebuildViz();

  schedulerStep = 0;
  nextStepTime = ac.currentTime + 0.05;
  stepQueue.length = 0;
  lastVizStep = -1;

  isPlaying = true;
  scheduler();

  playBtn.textContent = 'stop';
  playBtn.classList.add('playing');
  setStatus('playing — edit code and hear changes on next loop');
}

function stopPlaying() {
  clearTimeout(timerID);
  isPlaying = false;
  stepQueue.length = 0;
  lastVizStep = -1;

  // Clear highlights
  viz.querySelectorAll('.step').forEach(el => el.classList.remove('current'));

  playBtn.textContent = 'play';
  playBtn.classList.remove('playing');
  setStatus('stopped — press play or space to start');
}

function togglePlay() {
  if (isPlaying) stopPlaying();
  else startPlaying();
}

// ── Status ────────────────────────────────────

function setStatus(msg, isError = false) {
  statusText.textContent = msg;
  statusBar.classList.toggle('error', isError);
}

// ── Events ────────────────────────────────────

playBtn.addEventListener('click', togglePlay);

// Space = play/stop (when not focused in editor)
document.addEventListener('keydown', e => {
  if (e.target === editor) return;
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  }
});

// Live preview: update viz while typing (debounced)
let debounceTimer = null;
editor.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    try {
      const result = parseCode(editor.value);
      if (!isPlaying) {
        parsedTracks = result.tracks;
        currentBpm = result.bpm;
        bpmDisplay.textContent = `${currentBpm} bpm`;
        rebuildViz();
      }
      // When playing, tracks + bpm update on next loop's step 0
      statusBar.classList.remove('error');
    } catch (e) {
      setStatus('parse error: ' + e.message, true);
    }
  }, 200);
});

// ── Init ──────────────────────────────────────

const result = parseCode(editor.value);
parsedTracks = result.tracks;
currentBpm = result.bpm;
bpmDisplay.textContent = `${currentBpm} bpm`;
rebuildViz();
setStatus('ready — press play or hit space');
