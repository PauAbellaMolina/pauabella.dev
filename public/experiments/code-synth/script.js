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
const LOOP_CYCLE = [1, 2, 4, 8]; // loop count options cycled on click
const SCENE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ── Shared pattern state ──────────────────────

let parsedTracks = [];
let currentBpm = 128;
let isUIMode = false;
let suppressEditorUpdate = false;

// ── Scene / song state ────────────────────────

const scenes      = [];  // { id, name, code }
const arrangement = [];  // { sceneId, loops }

let songMode          = false;
let arrPlayIdx        = 0;    // which arrangement block is playing
let loopsDoneInBlock  = -1;   // -1 = not started; increments at each step 0
let activeSceneId     = null; // currently loaded scene (null = unsaved)
let dragSrcIdx        = null; // for arrangement drag-and-drop

// ── Playback state ────────────────────────────

let audioCtx     = null;
let isPlaying    = false;
let timerID      = null;
let schedulerStep = 0;
let nextStepTime  = 0;

const stepQueue  = []; // { step, time } — for display sync
let lastVizStep  = -1;

// ── DOM refs ──────────────────────────────────

const app         = document.getElementById('app');
const editor      = document.getElementById('editor');
const playBtn     = document.getElementById('play-btn');
const bpmDisplay  = document.getElementById('bpm-display');
const viz         = document.getElementById('viz');
const seqTracks   = document.getElementById('seq-tracks');
const statusBar   = document.getElementById('status-bar');
const statusText  = document.getElementById('status-text');
const modeCode    = document.getElementById('mode-code');
const modeUI      = document.getElementById('mode-ui');
const bpmDown     = document.getElementById('bpm-down');
const bpmUp       = document.getElementById('bpm-up');
const bpmValue    = document.getElementById('bpm-value');
const instSelect  = document.getElementById('inst-select');
const noteInput   = document.getElementById('note-input');
const addTrackBtn = document.getElementById('add-track-btn');
// Song bar
const scenesList    = document.getElementById('scenes-list');
const newSceneBtn   = document.getElementById('new-scene-btn');
const playModeBtn   = document.getElementById('play-mode-btn');
const arrList       = document.getElementById('arr-list');
const arrEmptyHint  = document.getElementById('arr-empty-hint');

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
    const prefix = track.note ? `${track.instrument}  ${track.note}` : track.instrument;
    lines.push(prefix.padEnd(11) + '| ' + groups.join(' | ') + ' |');
  }
  return lines.join('\n');
}

function syncEditorFromState() {
  suppressEditorUpdate = true;
  editor.value = generateCode(parsedTracks, currentBpm);
  suppressEditorUpdate = false;
}

// Auto-update active scene when code changes
function persistToActiveScene() {
  if (!activeSceneId) return;
  const scene = scenes.find(s => s.id === activeSceneId);
  if (scene) scene.code = editor.value;
}

// ── Audio synthesis ───────────────────────────

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playKick(ac, t) {
  const osc = ac.createOscillator(), gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.frequency.setValueAtTime(130, t);
  osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.42);
  gain.gain.setValueAtTime(1.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
  osc.start(t); osc.stop(t + 0.42);
}

function playSnare(ac, t) {
  const bufLen = Math.ceil(ac.sampleRate * 0.18);
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const noise = ac.createBufferSource(); noise.buffer = buf;
  const hpf = ac.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 1200;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.65, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  noise.connect(hpf); hpf.connect(ng); ng.connect(ac.destination);
  noise.start(t); noise.stop(t + 0.18);

  const osc = ac.createOscillator(), og = ac.createGain();
  osc.frequency.value = 185;
  og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(og); og.connect(ac.destination);
  osc.start(t); osc.stop(t + 0.1);
}

function playClap(ac, t) {
  for (let layer = 0; layer < 3; layer++) {
    const delay = layer * 0.012;
    const bufLen = Math.ceil(ac.sampleRate * 0.1);
    const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ac.createBufferSource(); noise.buffer = buf;
    const bpf = ac.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 1200; bpf.Q.value = 0.7;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.5, t + delay); gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.1);
    noise.connect(bpf); bpf.connect(gain); gain.connect(ac.destination);
    noise.start(t + delay); noise.stop(t + delay + 0.1);
  }
}

function playHat(ac, t, open) {
  const dur = open ? 0.28 : 0.045;
  const bufLen = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource(); noise.buffer = buf;
  const bpf = ac.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 9500; bpf.Q.value = 0.3;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(open ? 0.3 : 0.38, t); gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.connect(bpf); bpf.connect(gain); gain.connect(ac.destination);
  noise.start(t); noise.stop(t + dur);
}

function playRim(ac, t) {
  const osc = ac.createOscillator(), gain = ac.createGain();
  osc.type = 'triangle'; osc.frequency.value = 480;
  gain.gain.setValueAtTime(0.45, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
  osc.connect(gain); gain.connect(ac.destination);
  osc.start(t); osc.stop(t + 0.055);
}

function playSynth(ac, t, note, instrument) {
  const freq = NOTE_FREQ[note] || NOTE_FREQ['c4'];
  const osc = ac.createOscillator(), filt = ac.createBiquadFilter(), gain = ac.createGain();

  if (instrument === 'bass') {
    osc.type = 'sine'; filt.type = 'lowpass'; filt.frequency.value = 350;
    gain.gain.setValueAtTime(0.7, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
  } else if (instrument === 'pad') {
    osc.type = 'triangle'; filt.type = 'lowpass';
    filt.frequency.setValueAtTime(1600, t); filt.frequency.exponentialRampToValueAtTime(700, t + 0.5);
    gain.gain.setValueAtTime(0.22, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  } else {
    osc.type = 'sawtooth'; filt.type = 'lowpass';
    filt.frequency.setValueAtTime(2800, t); filt.frequency.exponentialRampToValueAtTime(700, t + 0.22);
    gain.gain.setValueAtTime(0.28, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  }

  osc.frequency.value = freq;
  osc.connect(filt); filt.connect(gain); gain.connect(ac.destination);
  osc.start(t); osc.stop(t + 0.6);
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
  if (step === 0) {
    // ── Song mode: advance to next scene if needed ──
    if (songMode && arrangement.length > 0) {
      loopsDoneInBlock++;
      const block = arrangement[arrPlayIdx];

      if (loopsDoneInBlock >= block.loops) {
        loopsDoneInBlock = 0;
        arrPlayIdx = (arrPlayIdx + 1) % arrangement.length;

        // Load next scene into editor
        const nextScene = scenes.find(s => s.id === arrangement[arrPlayIdx].sceneId);
        if (nextScene) {
          suppressEditorUpdate = true;
          editor.value = nextScene.code;
          suppressEditorUpdate = false;
          activeSceneId = nextScene.id;
        }

        updateArrHighlight();
        rebuildScenesPalette(); // update active indicator
      }
    }

    // ── Always re-parse editor (picks up live edits) ──
    const result = parseCode(editor.value);
    parsedTracks = result.tracks;
    if (result.bpm !== currentBpm) {
      currentBpm = result.bpm;
      bpmDisplay.textContent = `${currentBpm} bpm`;
      if (isUIMode) bpmValue.textContent = currentBpm;
    }
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
  e.currentTarget.classList.toggle('on',  parsedTracks[ti].steps[si]);
  e.currentTarget.classList.toggle('off', !parsedTracks[ti].steps[si]);
  syncEditorFromState();
  persistToActiveScene();
}

function handleDeleteTrack(e) {
  const ti = parseInt(e.currentTarget.dataset.track);
  parsedTracks.splice(ti, 1);
  rebuildSequencer();
  syncEditorFromState();
  persistToActiveScene();
}

function handleAddTrack() {
  const instrument = instSelect.value;
  let note = null;
  if (MELODIC_INSTRUMENTS.includes(instrument)) {
    const raw = noteInput.value.trim().toLowerCase();
    note = NOTE_FREQ[raw] ? raw : 'c4';
  }
  const label = note ? `${instrument} ${note}` : instrument;
  parsedTracks.push({ instrument, note, steps: Array(STEPS).fill(false), label });
  rebuildSequencer();
  syncEditorFromState();
  persistToActiveScene();
  seqTracks.lastElementChild?.scrollIntoView({ block: 'nearest' });
}

function updateNoteInputVisibility() {
  noteInput.style.display = MELODIC_INSTRUMENTS.includes(instSelect.value) ? '' : 'none';
}

instSelect.addEventListener('change', updateNoteInputVisibility);
addTrackBtn.addEventListener('click', handleAddTrack);

bpmDown.addEventListener('click', () => {
  currentBpm = Math.max(20, currentBpm - 5);
  bpmValue.textContent = currentBpm;
  bpmDisplay.textContent = `${currentBpm} bpm`;
  syncEditorFromState();
  persistToActiveScene();
});

bpmUp.addEventListener('click', () => {
  currentBpm = Math.min(300, currentBpm + 5);
  bpmValue.textContent = currentBpm;
  bpmDisplay.textContent = `${currentBpm} bpm`;
  syncEditorFromState();
  persistToActiveScene();
});

// ── Mode switching ────────────────────────────

function switchToUIMode() {
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
  syncEditorFromState();
  persistToActiveScene();

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

  // In song mode with a valid arrangement, load the first scene
  if (songMode && arrangement.length > 0) {
    arrPlayIdx = 0;
    loopsDoneInBlock = -1;
    const firstScene = scenes.find(s => s.id === arrangement[0].sceneId);
    if (firstScene) {
      suppressEditorUpdate = true;
      editor.value = firstScene.code;
      suppressEditorUpdate = false;
      activeSceneId = firstScene.id;
    }
    updateArrHighlight();
    rebuildScenesPalette();
  }

  const result = parseCode(editor.value);
  parsedTracks = result.tracks;
  currentBpm = result.bpm;
  bpmDisplay.textContent = `${currentBpm} bpm`;

  if (isUIMode) { bpmValue.textContent = currentBpm; rebuildSequencer(); }
  else          { rebuildViz(); }

  schedulerStep = 0;
  nextStepTime = ac.currentTime + 0.05;
  stepQueue.length = 0;
  lastVizStep = -1;

  isPlaying = true;
  scheduler();

  playBtn.textContent = 'stop';
  playBtn.classList.add('playing');

  const modeHint = songMode && arrangement.length > 0 ? 'song mode' : 'loop mode';
  setStatus(`playing (${modeHint}) — edit code or click steps, changes apply on next loop`);
}

function stopPlaying() {
  clearTimeout(timerID);
  isPlaying = false;
  stepQueue.length = 0;
  lastVizStep = -1;
  clearStepHighlights();
  updateArrHighlight();

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

      if (isUIMode) { bpmValue.textContent = currentBpm; rebuildSequencer(); }
      else          { rebuildViz(); }

      persistToActiveScene();
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

// ═══════════════════════════════════════════════
//  SCENE MANAGEMENT
// ═══════════════════════════════════════════════

function getSceneName(idx) {
  if (idx < 26) return SCENE_LETTERS[idx];
  return SCENE_LETTERS[Math.floor(idx / 26) - 1] + SCENE_LETTERS[idx % 26];
}

function saveCurrentAsScene() {
  // In UI mode, make sure editor reflects the current sequencer state
  if (isUIMode) syncEditorFromState();

  const code = editor.value;
  const result = parseCode(code);
  const name = getSceneName(scenes.length);
  const id = Date.now() + Math.random(); // unique id

  scenes.push({ id, name, code });
  activeSceneId = id;

  rebuildScenesPalette();
  setStatus(`scene ${name} saved — click [${name}] to load, [›] to add to song`);
}

function loadScene(id) {
  if (songMode && isPlaying) return; // don't hijack editor during song playback

  const scene = scenes.find(s => s.id === id);
  if (!scene) return;

  activeSceneId = id;

  suppressEditorUpdate = true;
  editor.value = scene.code;
  suppressEditorUpdate = false;

  const result = parseCode(scene.code);
  parsedTracks = result.tracks;
  currentBpm = result.bpm;
  bpmDisplay.textContent = `${currentBpm} bpm`;

  if (isUIMode) { bpmValue.textContent = currentBpm; rebuildSequencer(); }
  else          { rebuildViz(); }

  rebuildScenesPalette();
  setStatus(`scene ${scene.name} loaded`);
}

function addToArrangement(sceneId) {
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) return;

  arrangement.push({ sceneId, loops: 1 });
  rebuildArrangement();
  setStatus(`scene ${scene.name} added to song`);
}

// ── Scenes palette ────────────────────────────

function rebuildScenesPalette() {
  scenesList.innerHTML = '';

  for (const scene of scenes) {
    const block = document.createElement('div');
    block.className = 'scene-block';
    if (scene.id === activeSceneId) block.classList.add('active');
    if (songMode && isPlaying && arrangement[arrPlayIdx]?.sceneId === scene.id) {
      block.classList.add('playing');
    }
    if (songMode && isPlaying) block.classList.add('song-disabled');

    const loadBtn = document.createElement('button');
    loadBtn.className = 'scene-load';
    loadBtn.textContent = scene.name;
    loadBtn.title = `Load scene ${scene.name}`;
    loadBtn.addEventListener('click', () => loadScene(scene.id));

    const queueBtn = document.createElement('button');
    queueBtn.className = 'scene-queue';
    queueBtn.textContent = '›';
    queueBtn.title = `Add scene ${scene.name} to song`;
    queueBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToArrangement(scene.id);
    });

    block.appendChild(loadBtn);
    block.appendChild(queueBtn);
    scenesList.appendChild(block);
  }
}

newSceneBtn.addEventListener('click', saveCurrentAsScene);

// ═══════════════════════════════════════════════
//  ARRANGEMENT
// ═══════════════════════════════════════════════

function cycleLoops(idx) {
  const current = arrangement[idx].loops;
  const pos = LOOP_CYCLE.indexOf(current);
  arrangement[idx].loops = LOOP_CYCLE[(pos + 1) % LOOP_CYCLE.length];
  rebuildArrangement();
}

function removeFromArrangement(idx) {
  arrangement.splice(idx, 1);
  // Clamp arrPlayIdx in case we removed the playing block
  if (arrPlayIdx >= arrangement.length) arrPlayIdx = Math.max(0, arrangement.length - 1);
  rebuildArrangement();
}

function rebuildArrangement() {
  arrList.innerHTML = '';

  if (arrangement.length === 0) {
    arrList.appendChild(arrEmptyHint);
    return;
  }

  for (let i = 0; i < arrangement.length; i++) {
    const { sceneId, loops } = arrangement[i];
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) continue;

    const block = document.createElement('div');
    block.className = 'arr-block';
    block.dataset.idx = i;
    block.draggable = true;
    if (songMode && isPlaying && i === arrPlayIdx) block.classList.add('playing');

    // Letter
    const letterEl = document.createElement('span');
    letterEl.className = 'arr-letter';
    letterEl.textContent = scene.name;

    // Loop count (clickable to cycle)
    const loopsBtn = document.createElement('button');
    loopsBtn.className = 'arr-loops';
    loopsBtn.textContent = `${loops}×`;
    loopsBtn.title = 'Click to change loop count (1, 2, 4, 8)';
    loopsBtn.addEventListener('click', (e) => { e.stopPropagation(); cycleLoops(i); });

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'arr-remove';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove from song';
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeFromArrangement(i); });

    block.appendChild(letterEl);
    block.appendChild(loopsBtn);
    block.appendChild(removeBtn);

    // Drag-and-drop
    block.addEventListener('dragstart', e => {
      dragSrcIdx = i;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => block.classList.add('dragging'), 0);
    });
    block.addEventListener('dragend', () => {
      block.classList.remove('dragging');
      arrList.querySelectorAll('.arr-block').forEach(b => b.classList.remove('drag-over'));
    });
    block.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      arrList.querySelectorAll('.arr-block').forEach(b => b.classList.remove('drag-over'));
      block.classList.add('drag-over');
    });
    block.addEventListener('drop', e => {
      e.preventDefault();
      const dropIdx = parseInt(block.dataset.idx);
      if (dragSrcIdx !== null && dragSrcIdx !== dropIdx) {
        const [moved] = arrangement.splice(dragSrcIdx, 1);
        arrangement.splice(dropIdx, 0, moved);
        rebuildArrangement();
      }
      dragSrcIdx = null;
    });

    arrList.appendChild(block);
  }
}

function updateArrHighlight() {
  arrList.querySelectorAll('.arr-block').forEach(block => {
    const idx = parseInt(block.dataset.idx);
    block.classList.toggle('playing', songMode && isPlaying && idx === arrPlayIdx);
  });
}

// ── Play mode toggle ──────────────────────────

function togglePlayMode() {
  if (!songMode && arrangement.length === 0) {
    setStatus('add scenes to the song first — save a pattern with [+] and add it with [›]');
    return;
  }

  songMode = !songMode;
  playModeBtn.textContent = songMode ? '→\u2009song' : '⟳\u2009loop';
  playModeBtn.classList.toggle('song-mode', songMode);

  // Disable scene loading while song is playing
  rebuildScenesPalette();
  rebuildArrangement();

  if (songMode) {
    setStatus('song mode — play to run through the arrangement');
  } else {
    setStatus('loop mode — plays the current pattern in a loop');
  }
}

playModeBtn.addEventListener('click', togglePlayMode);

// ── Init ──────────────────────────────────────

const initResult = parseCode(editor.value);
parsedTracks = initResult.tracks;
currentBpm = initResult.bpm;
bpmDisplay.textContent = `${currentBpm} bpm`;
bpmValue.textContent = currentBpm;

updateNoteInputVisibility();
rebuildViz();
rebuildScenesPalette();
rebuildArrangement();
setStatus('ready — press play or hit space');
