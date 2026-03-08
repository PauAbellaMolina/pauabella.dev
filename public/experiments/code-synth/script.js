// ─────────────────────────────────────────────
//  codesynth — live music coding experiment
//
//  Pattern language:
//    bpm 128
//    kick   | x . . . | x . . . | x . . . | x . . . |
//    synth  c4 | x . . x | . . x . |
//    # comment
//
//  Song language (song code):
//    @scene A
//    bpm 128
//    kick | x . . . | ...
//
//    @scene B
//    bpm 140
//    hat  | x x x x | ...
//
//    @song A×2 B×4 A×1
// ─────────────────────────────────────────────

const DEFAULT_PATTERN =
`bpm 128

kick   | x . . . | x . . . | x . . . | x . . . |
snare  | . . . . | x . . . | . . . . | x . . . |
hat    | x . x . | x . x . | x . x . | x . x . |

synth  c4 | x . . x | . . x . | x . . x | . x . . |
synth  e4 | . . x . | x . . . | . . x . | . . . x |
bass   c2 | x . . . | . . . . | x . . . | . . . . |`;

const SONG_CODE_TEMPLATE =
`# codesynth song
# define scenes with @scene [letter], then write pattern code
# arrange with @song [letter]×[loops] — e.g. A×2 B×4 C A×2

@scene A
bpm 128
kick   | x . . . | x . . . | x . . . | x . . . |
snare  | . . . . | x . . . | . . . . | x . . . |
hat    | x . x . | x . x . | x . x . | x . x . |

@scene B
bpm 128
kick   | x . x . | x . x . | x . x . | x . x . |
hat    | x x x x | x x x x | x x x x | x x x x |
synth  c4 | x . . x | . . x . | x . . x | . x . . |

@song A×2 B×4 A×1`;

// ── Note frequencies ──────────────────────────

const NOTE_FREQ = {};
const NOTE_NAMES = ['c','c#','d','d#','e','f','f#','g','g#','a','a#','b'];
for (let oct = 0; oct <= 8; oct++)
  for (let i = 0; i < 12; i++)
    NOTE_FREQ[NOTE_NAMES[i] + oct] = 440 * Math.pow(2, (oct - 4) + (i - 9) / 12);

// ── Constants ─────────────────────────────────

const STEPS = 16;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.12;
const MELODIC = ['synth', 'bass', 'pad'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ── Song view state ───────────────────────────

let representationMode = 'ui'; // 'ui' | 'code'

// ── Pattern editor state ──────────────────────

let patternEditorOpen = false;
let editingSceneId    = null;
let peReprMode        = 'code'; // 'code' | 'ui'
let pePreviewActive   = false;
let peIsNewScene      = false;
let peTracks          = [];
let peBpm             = 128;
let suppressPeEditorUpdate = false;

// ── Shared playback state ─────────────────────

let parsedTracks = [];
let currentBpm   = 128;
let suppressSongEditorUpdate = false;

// ── Scene / arrangement state ─────────────────

const scenes      = [];   // { id, name, code }
const arrangement = [];   // { sceneId, loops }

let arrPlayIdx       = 0;
let loopsDoneInBlock = -1;
let dragSrcIdx       = null;

// ── Playback state ────────────────────────────

let audioCtx      = null;
let isPlaying     = false;
let timerID       = null;
let schedulerStep = 0;
let nextStepTime  = 0;
const stepQueue   = [];
let lastVizStep   = -1;

// ── DOM refs ──────────────────────────────────

const app            = document.getElementById('app');
const songEditor     = document.getElementById('song-editor');
const playBtn        = document.getElementById('play-btn');
const bpmDisplay     = document.getElementById('bpm-display');
const statusBar      = document.getElementById('status-bar');
const statusText     = document.getElementById('status-text');
const modeUIBtn      = document.getElementById('mode-ui');
const modeCodeBtn    = document.getElementById('mode-code');
const newSceneBtn    = document.getElementById('new-scene-btn');
const sceneCards     = document.getElementById('scene-cards');
const songArrList    = document.getElementById('song-arr-list');
const arrTotal       = document.getElementById('arr-total');

// Pattern editor DOM
const patternEditor  = document.getElementById('pattern-editor');
const peSceneName    = document.getElementById('pe-scene-name');
const peModeCodeBtn  = document.getElementById('pe-mode-code');
const peModeUIBtn    = document.getElementById('pe-mode-ui');
const pePreviewBtn   = document.getElementById('pe-preview-btn');
const peCancelBtn    = document.getElementById('pe-cancel-btn');
const peSaveBtn      = document.getElementById('pe-save-btn');
const peEditor       = document.getElementById('pe-editor');
const peViz          = document.getElementById('pe-viz');
const peSeqTracks    = document.getElementById('pe-seq-tracks');
const peBpmDown      = document.getElementById('pe-bpm-down');
const peBpmUp        = document.getElementById('pe-bpm-up');
const peBpmValue     = document.getElementById('pe-bpm-value');
const peInstSelect   = document.getElementById('pe-inst-select');
const peNoteInput    = document.getElementById('pe-note-input');
const peAddTrackBtn  = document.getElementById('pe-add-track-btn');

// ── Pattern parser ────────────────────────────

function parseCode(code) {
  const tracks = [];
  let bpm = 120;

  for (const rawLine of code.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line || line.startsWith('@')) continue;

    const bpmMatch = line.match(/^bpm\s+(\d+)/i);
    if (bpmMatch) { bpm = Math.min(300, Math.max(20, parseInt(bpmMatch[1]))); continue; }

    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;

    const instrument = tokens[0].toLowerCase();
    const NOTE_RE = /^[a-g]#?\d$/i;
    let note = null, patternTokens;

    if (NOTE_RE.test(tokens[1])) { note = tokens[1].toLowerCase(); patternTokens = tokens.slice(2); }
    else { patternTokens = tokens.slice(1); }

    const steps = [];
    for (const tok of patternTokens)
      for (const ch of tok)
        if (ch === 'x' || ch === 'X') steps.push(true);
        else if (ch === '.') steps.push(false);

    if (!steps.length) continue;

    const tiled = Array.from({ length: STEPS }, (_, i) => steps[i % steps.length]);
    const label = note ? `${instrument} ${note}` : instrument;
    tracks.push({ instrument, note, steps: tiled, label });
  }

  return { bpm, tracks };
}

// ── Song code parser ──────────────────────────

function parseSongCode(code) {
  const parsedScenes = [];
  const parsedArrangement = [];
  let currentName  = null;
  let currentLines = [];

  function flushScene() {
    if (currentName !== null) {
      parsedScenes.push({ name: currentName, code: currentLines.join('\n').trim() });
      currentName  = null;
      currentLines = [];
    }
  }

  for (const rawLine of code.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim();

    const sceneMatch = line.match(/^@scene\s+([A-Z]+)/i);
    if (sceneMatch) { flushScene(); currentName = sceneMatch[1].toUpperCase(); continue; }

    const songMatch = line.match(/^@song\s*(.*)/i);
    if (songMatch) {
      flushScene();
      for (const tok of songMatch[1].trim().split(/\s+/).filter(Boolean)) {
        const m = tok.match(/^([A-Z]+)(?:[×x*](\d+))?$/i);
        if (m) parsedArrangement.push({ sceneName: m[1].toUpperCase(), loops: m[2] ? Math.min(64, Math.max(1, parseInt(m[2]))) : 1 });
      }
      continue;
    }

    if (currentName !== null) currentLines.push(rawLine);
  }
  flushScene();

  return { parsedScenes, parsedArrangement };
}

// ── Song code generator ───────────────────────

function generateSongCode() {
  const lines = [];

  for (const scene of scenes) {
    lines.push(`@scene ${scene.name}`);
    lines.push(scene.code || '');
    lines.push('');
  }

  if (arrangement.length > 0) {
    const arrStr = arrangement.map(b => {
      const sc = scenes.find(s => s.id === b.sceneId);
      return sc ? (b.loops === 1 ? sc.name : `${sc.name}×${b.loops}`) : null;
    }).filter(Boolean).join(' ');
    if (arrStr) lines.push(`@song ${arrStr}`);
  }

  return lines.join('\n').trimEnd();
}

// Apply parsed song code to scenes/arrangement state
function applySongCode(code) {
  const { parsedScenes, parsedArrangement } = parseSongCode(code);

  for (const ps of parsedScenes) {
    let existing = scenes.find(s => s.name === ps.name);
    if (existing) { existing.code = ps.code; }
    else { scenes.push({ id: String(Date.now() + Math.random()), name: ps.name, code: ps.code }); }
  }

  arrangement.length = 0;
  for (const pa of parsedArrangement) {
    const sc = scenes.find(s => s.name === pa.sceneName);
    if (sc) arrangement.push({ sceneId: sc.id, loops: pa.loops });
  }
}

// ── Pattern code generator ────────────────────

function generatePatternCode(bpm, tracks) {
  const lines = [`bpm ${bpm}`, ''];
  for (const track of tracks) {
    const groups = [];
    for (let g = 0; g < 4; g++)
      groups.push(track.steps.slice(g * 4, g * 4 + 4).map(s => s ? 'x' : '.').join(' '));
    const prefix = track.note ? `${track.instrument}  ${track.note}` : track.instrument;
    lines.push(prefix.padEnd(11) + '| ' + groups.join(' | ') + ' |');
  }
  return lines.join('\n');
}

function syncSongEditorFromState() {
  suppressSongEditorUpdate = true;
  songEditor.value = generateSongCode();
  suppressSongEditorUpdate = false;
}

// ── Scene info helper ─────────────────────────

function getSceneInfo(scene) {
  const result = parseCode(scene.code || '');
  return {
    bpm: result.bpm,
    tracks: result.tracks.map(t => t.label).join(' · ') || '—'
  };
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
  gain.gain.setValueAtTime(1.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
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
  osc.connect(og); og.connect(ac.destination); osc.start(t); osc.stop(t + 0.1);
}

function playClap(ac, t) {
  for (let layer = 0; layer < 3; layer++) {
    const d = layer * 0.012;
    const bufLen = Math.ceil(ac.sampleRate * 0.1);
    const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ac.createBufferSource(); noise.buffer = buf;
    const bpf = ac.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 1200; bpf.Q.value = 0.7;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.5, t + d); gain.gain.exponentialRampToValueAtTime(0.001, t + d + 0.1);
    noise.connect(bpf); bpf.connect(gain); gain.connect(ac.destination);
    noise.start(t + d); noise.stop(t + d + 0.1);
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
  osc.connect(gain); gain.connect(ac.destination); osc.start(t); osc.stop(t + 0.055);
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

function isSongPlayback() {
  // PE preview mode: always loop the single scene
  if (patternEditorOpen && pePreviewActive) return false;
  return arrangement.length > 0;
}

function scheduleStep(step, time) {
  if (step === 0) {
    if (patternEditorOpen && pePreviewActive) {
      // Re-parse PE editor for live edits during preview
      const result = parseCode(peEditor.value);
      parsedTracks = result.tracks;
      if (result.bpm !== currentBpm) {
        currentBpm = result.bpm;
        bpmDisplay.textContent = `${currentBpm} bpm`;
      }
    } else if (isSongPlayback()) {
      // Advance arrangement
      loopsDoneInBlock++;
      if (loopsDoneInBlock >= arrangement[arrPlayIdx].loops) {
        loopsDoneInBlock = 0;
        arrPlayIdx = (arrPlayIdx + 1) % arrangement.length;
        const next = scenes.find(s => s.id === arrangement[arrPlayIdx].sceneId);
        if (next) {
          const result = parseCode(next.code || '');
          parsedTracks = result.tracks;
          currentBpm   = result.bpm;
          bpmDisplay.textContent = `${currentBpm} bpm`;
          updatePlayingHighlights();
        }
      }
    } else if (scenes.length > 0) {
      // Fallback: loop first scene
      const first = scenes[0];
      const result = parseCode(first.code || '');
      parsedTracks = result.tracks;
      if (result.bpm !== currentBpm) {
        currentBpm = result.bpm;
        bpmDisplay.textContent = `${currentBpm} bpm`;
      }
    }
  }

  stepQueue.push({ step, time });
  for (const track of parsedTracks)
    if (track.steps[step]) triggerTrack(track, time);
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
    while (stepQueue.length > 0 && stepQueue[0].time <= now) curStep = stepQueue.shift().step;

    if (curStep !== lastVizStep) {
      lastVizStep = curStep;
      if (patternEditorOpen) {
        if (peReprMode === 'ui') highlightPeSeqStep(curStep);
        else highlightPeVizStep(curStep);
      }
      updatePlayingHighlights();
    }
  }
  requestAnimationFrame(animateViz);
}

function updatePlayingHighlights() {
  // Update song-arr-list playing block
  songArrList.querySelectorAll('.song-arr-block').forEach(b => {
    b.classList.toggle('playing', isPlaying && !patternEditorOpen && isSongPlayback() && parseInt(b.dataset.idx) === arrPlayIdx);
  });
  // Update scene cards playing state
  sceneCards.querySelectorAll('.scene-card').forEach(c => {
    const isCurrentScene = isPlaying && isSongPlayback() && arrangement[arrPlayIdx]?.sceneId === c.dataset.id;
    c.classList.toggle('playing', isCurrentScene);
  });
}

requestAnimationFrame(animateViz);

// ── PE viz builder ────────────────────────────

function rebuildPeViz() {
  const cur = lastVizStep;
  peViz.innerHTML = '';
  for (const track of peTracks) {
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
        el.className = `step ${track.steps[i] ? 'on' : 'off'}${i === cur ? ' current' : ''}`;
        group.appendChild(el);
      }
      stepsEl.appendChild(group);
    }
    row.appendChild(stepsEl);
    peViz.appendChild(row);
  }
}

// ── PE sequencer builder ──────────────────────

function rebuildPeSequencer() {
  const cur = lastVizStep;
  peSeqTracks.innerHTML = '';

  for (let ti = 0; ti < peTracks.length; ti++) {
    const track = peTracks[ti];
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
        btn.className = `seq-step ${track.steps[i] ? 'on' : 'off'}${i === cur ? ' current' : ''}`;
        btn.dataset.track = ti;
        btn.dataset.step  = i;
        btn.addEventListener('click', handlePeStepClick);
        group.appendChild(btn);
      }
      stepsEl.appendChild(group);
    }
    row.appendChild(stepsEl);

    const del = document.createElement('button');
    del.className = 'seq-delete';
    del.textContent = '×';
    del.dataset.track = ti;
    del.addEventListener('click', handlePeDeleteTrack);
    row.appendChild(del);

    peSeqTracks.appendChild(row);
  }
}

// ── PE sequencer interactions ─────────────────

function handlePeStepClick(e) {
  const ti = parseInt(e.currentTarget.dataset.track);
  const si = parseInt(e.currentTarget.dataset.step);
  peTracks[ti].steps[si] = !peTracks[ti].steps[si];
  e.currentTarget.classList.toggle('on',  peTracks[ti].steps[si]);
  e.currentTarget.classList.toggle('off', !peTracks[ti].steps[si]);
  syncPeCodeFromState();
}

function handlePeDeleteTrack(e) {
  const ti = parseInt(e.currentTarget.dataset.track);
  peTracks.splice(ti, 1);
  rebuildPeSequencer();
  syncPeCodeFromState();
}

function handlePeAddTrack() {
  const instrument = peInstSelect.value;
  let note = null;
  if (MELODIC.includes(instrument)) {
    const raw = peNoteInput.value.trim().toLowerCase();
    note = NOTE_FREQ[raw] ? raw : 'c4';
  }
  const label = note ? `${instrument} ${note}` : instrument;
  peTracks.push({ instrument, note, steps: Array(STEPS).fill(false), label });
  rebuildPeSequencer();
  syncPeCodeFromState();
  peSeqTracks.lastElementChild?.scrollIntoView({ block: 'nearest' });
}

function updatePeNoteInputVisibility() {
  peNoteInput.style.display = MELODIC.includes(peInstSelect.value) ? '' : 'none';
}

peInstSelect.addEventListener('change', updatePeNoteInputVisibility);
peAddTrackBtn.addEventListener('click', handlePeAddTrack);

peBpmDown.addEventListener('click', () => {
  peBpm = Math.max(20, peBpm - 5);
  peBpmValue.textContent = peBpm;
  if (pePreviewActive && isPlaying) {
    currentBpm = peBpm;
    bpmDisplay.textContent = `${currentBpm} bpm`;
  }
  syncPeCodeFromState();
});

peBpmUp.addEventListener('click', () => {
  peBpm = Math.min(300, peBpm + 5);
  peBpmValue.textContent = peBpm;
  if (pePreviewActive && isPlaying) {
    currentBpm = peBpm;
    bpmDisplay.textContent = `${currentBpm} bpm`;
  }
  syncPeCodeFromState();
});

// ── PE code sync ──────────────────────────────

function syncPeCodeFromState() {
  suppressPeEditorUpdate = true;
  peEditor.value = generatePatternCode(peBpm, peTracks);
  suppressPeEditorUpdate = false;
}

// ── PE step highlights ────────────────────────

function highlightPeVizStep(step) {
  peViz.querySelectorAll('.track-row').forEach(row =>
    row.querySelectorAll('.step').forEach((el, i) => el.classList.toggle('current', i === step)));
}

function highlightPeSeqStep(step) {
  peSeqTracks.querySelectorAll('.seq-row').forEach(row =>
    row.querySelectorAll('.seq-step').forEach((el, i) => el.classList.toggle('current', i === step)));
}

function clearPeStepHighlights() {
  peViz.querySelectorAll('.step').forEach(el => el.classList.remove('current'));
  peSeqTracks.querySelectorAll('.seq-step').forEach(el => el.classList.remove('current'));
}

// ── PE layout ─────────────────────────────────

function applyPeLayout() {
  patternEditor.classList.toggle('pe-ui', peReprMode === 'ui');
}

function updatePePreviewBtn() {
  pePreviewBtn.textContent = `preview: ${pePreviewActive ? 'on' : 'off'}`;
  pePreviewBtn.classList.toggle('active', pePreviewActive);
}

// ── PE mode switch ────────────────────────────

function setPeReprMode(mode) {
  if (peReprMode === 'ui') syncPeCodeFromState();
  peReprMode = mode;
  applyPeLayout();
  peModeCodeBtn.classList.toggle('active', mode === 'code');
  peModeUIBtn.classList.toggle('active',   mode === 'ui');
  if (mode === 'code') {
    rebuildPeViz();
  } else {
    const result = parseCode(peEditor.value);
    peTracks = result.tracks;
    peBpm    = result.bpm;
    peBpmValue.textContent = peBpm;
    rebuildPeSequencer();
  }
}

// ── Open / close pattern editor ───────────────

function openPatternEditor(sceneId) {
  let scene;
  if (sceneId) {
    scene = scenes.find(s => s.id === sceneId);
    peIsNewScene = false;
  } else {
    // New scene
    const name = getSceneLetter();
    const id   = String(Date.now() + Math.random());
    scene = { id, name, code: DEFAULT_PATTERN };
    scenes.push(scene);
    peIsNewScene = true;
    rebuildSceneCards();
    syncSongEditorFromState();
  }

  editingSceneId = scene.id;
  peSceneName.textContent = scene.name;

  suppressPeEditorUpdate = true;
  peEditor.value = scene.code || DEFAULT_PATTERN;
  suppressPeEditorUpdate = false;

  const result = parseCode(peEditor.value);
  peTracks = result.tracks;
  peBpm    = result.bpm;
  peBpmValue.textContent = peBpm;

  pePreviewActive = false;
  updatePePreviewBtn();

  // Reset to code mode
  peReprMode = 'code';
  peModeCodeBtn.classList.add('active');
  peModeUIBtn.classList.remove('active');
  applyPeLayout();

  patternEditorOpen = true;
  patternEditor.classList.add('open');
  rebuildPeViz();
  setStatus(`editing scene ${scene.name}`);
}

function closePatternEditor(save) {
  if (save) {
    const scene = scenes.find(s => s.id === editingSceneId);
    if (scene) {
      if (peReprMode === 'ui') syncPeCodeFromState();
      scene.code = peEditor.value;
    }
  } else if (peIsNewScene) {
    // Discard the newly-created scene
    const idx = scenes.findIndex(s => s.id === editingSceneId);
    if (idx >= 0) scenes.splice(idx, 1);
  }

  if (pePreviewActive && isPlaying) {
    stopPlaying();
  }

  pePreviewActive = false;
  patternEditorOpen = false;
  editingSceneId = null;
  patternEditor.classList.remove('open');

  rebuildSceneCards();
  syncSongEditorFromState();
  rebuildSongArrList();
  setStatus(save ? 'scene saved' : 'edit cancelled');
}

// ── Pattern editor event listeners ───────────

peModeCodeBtn.addEventListener('click', () => { if (peReprMode !== 'code') setPeReprMode('code'); });
peModeUIBtn.addEventListener('click',   () => { if (peReprMode !== 'ui')   setPeReprMode('ui'); });

peCancelBtn.addEventListener('click', () => closePatternEditor(false));
peSaveBtn.addEventListener('click',   () => closePatternEditor(true));

pePreviewBtn.addEventListener('click', () => {
  pePreviewActive = !pePreviewActive;
  updatePePreviewBtn();

  if (pePreviewActive) {
    // Load PE tracks for playback
    const result = parseCode(peEditor.value);
    parsedTracks = result.tracks;
    currentBpm   = result.bpm;
    bpmDisplay.textContent = `${currentBpm} bpm`;
    if (!isPlaying) startPlaying();
    setStatus(`preview: scene ${peSceneName.textContent} — loops until preview off`);
  } else {
    if (isPlaying) stopPlaying();
  }
});

let peDebounce = null;
peEditor.addEventListener('input', () => {
  if (suppressPeEditorUpdate) return;
  clearTimeout(peDebounce);
  peDebounce = setTimeout(() => {
    try {
      const result = parseCode(peEditor.value);
      peTracks = result.tracks;
      peBpm    = result.bpm;
      peBpmValue.textContent = peBpm;
      if (peReprMode === 'code') rebuildPeViz();
      else rebuildPeSequencer();
      statusBar.classList.remove('error');
    } catch (err) { setStatus('parse error: ' + err.message, true); }
  }, 200);
});

// ── Song view switching ───────────────────────

function setSongRepr(mode) {
  // Parse outgoing code mode before switching
  if (representationMode === 'code') applySongCode(songEditor.value);

  representationMode = mode;
  app.classList.toggle('song-code', mode === 'code');

  if (mode === 'code') {
    syncSongEditorFromState();
  } else {
    rebuildSceneCards();
    rebuildSongArrList();
    syncSongEditorFromState();
  }

  modeUIBtn.classList.toggle('active',   mode === 'ui');
  modeCodeBtn.classList.toggle('active', mode === 'code');
}

modeUIBtn.addEventListener('click',   () => { if (representationMode !== 'ui')   setSongRepr('ui'); });
modeCodeBtn.addEventListener('click', () => { if (representationMode !== 'code') setSongRepr('code'); });

// ── Song code editor live input ───────────────

let songDebounce = null;
songEditor.addEventListener('input', () => {
  if (suppressSongEditorUpdate) return;
  clearTimeout(songDebounce);
  songDebounce = setTimeout(() => {
    applySongCode(songEditor.value);
    rebuildSceneCards();
    rebuildSongArrList();
  }, 300);
});

// ── Song UI: scene cards ──────────────────────

function rebuildSceneCards() {
  sceneCards.innerHTML = '';

  if (!scenes.length) {
    const hint = document.createElement('p');
    hint.className = 'song-empty-hint';
    hint.textContent = 'Press [+ new] to create your first scene.';
    sceneCards.appendChild(hint);
    return;
  }

  for (const scene of scenes) {
    const info = getSceneInfo(scene);
    const card = document.createElement('div');
    card.className = 'scene-card';
    card.dataset.id = scene.id;
    if (isPlaying && isSongPlayback() && arrangement[arrPlayIdx]?.sceneId === scene.id) {
      card.classList.add('playing');
    }

    card.innerHTML = `
      <div class="scene-card-letter">${scene.name}</div>
      <div class="scene-card-info">
        <span class="scene-card-bpm">${info.bpm} bpm</span>
        <span class="scene-card-tracks">${info.tracks}</span>
      </div>
      <div class="scene-card-actions">
        <button class="card-btn" data-action="edit" data-id="${scene.id}">edit</button>
        <button class="card-btn primary" data-action="queue" data-id="${scene.id}">+ song</button>
      </div>`;

    sceneCards.appendChild(card);
  }

  sceneCards.querySelectorAll('[data-action="edit"]').forEach(btn =>
    btn.addEventListener('click', () => openPatternEditor(btn.dataset.id)));

  sceneCards.querySelectorAll('[data-action="queue"]').forEach(btn =>
    btn.addEventListener('click', () => addToArrangement(btn.dataset.id)));
}

// ── Song UI: arrangement list ─────────────────

function rebuildSongArrList() {
  songArrList.innerHTML = '';

  if (!arrangement.length) {
    const hint = document.createElement('p');
    hint.className = 'song-empty-hint';
    hint.textContent = 'Add scenes using the [+ song] button on each scene card.';
    songArrList.appendChild(hint);
    arrTotal.textContent = '';
    return;
  }

  for (let i = 0; i < arrangement.length; i++) {
    const { sceneId, loops } = arrangement[i];
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) continue;

    const info = getSceneInfo(scene);
    const block = document.createElement('div');
    block.className = 'song-arr-block';
    block.dataset.idx = i;
    block.draggable = true;
    if (isPlaying && isSongPlayback() && i === arrPlayIdx) block.classList.add('playing');

    block.innerHTML = `
      <div class="arr-drag-handle">⠿</div>
      <div class="arr-block-letter">${scene.name}</div>
      <div class="arr-block-info">
        <span class="arr-block-bpm">${info.bpm} bpm</span>
        <span class="arr-block-tracks">${info.tracks}</span>
      </div>
      <div class="arr-loops-ctrl">
        <button class="loop-btn" data-action="dec" data-idx="${i}">−</button>
        <span class="loop-count">${loops} loop${loops !== 1 ? 's' : ''}</span>
        <button class="loop-btn" data-action="inc" data-idx="${i}">+</button>
      </div>
      <button class="arr-remove" data-idx="${i}" title="Remove from song">×</button>`;

    // Drag handlers
    block.addEventListener('dragstart', e => {
      dragSrcIdx = i;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => block.classList.add('dragging'), 0);
    });
    block.addEventListener('dragend', () => {
      block.classList.remove('dragging');
      songArrList.querySelectorAll('.drag-over').forEach(b => b.classList.remove('drag-over'));
    });
    block.addEventListener('dragover', e => {
      e.preventDefault();
      songArrList.querySelectorAll('.drag-over').forEach(b => b.classList.remove('drag-over'));
      block.classList.add('drag-over');
    });
    block.addEventListener('drop', e => {
      e.preventDefault();
      const dropIdx = parseInt(block.dataset.idx);
      if (dragSrcIdx !== null && dragSrcIdx !== dropIdx) {
        const [moved] = arrangement.splice(dragSrcIdx, 1);
        arrangement.splice(dropIdx, 0, moved);
        rebuildSongArrList();
        syncSongEditorFromState();
      }
      dragSrcIdx = null;
    });

    songArrList.appendChild(block);
  }

  // Event delegation
  songArrList.querySelectorAll('[data-action="dec"]').forEach(btn =>
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      arrangement[idx].loops = Math.max(1, arrangement[idx].loops - 1);
      rebuildSongArrList(); syncSongEditorFromState();
    }));

  songArrList.querySelectorAll('[data-action="inc"]').forEach(btn =>
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      arrangement[idx].loops = Math.min(64, arrangement[idx].loops + 1);
      rebuildSongArrList(); syncSongEditorFromState();
    }));

  songArrList.querySelectorAll('.arr-remove').forEach(btn =>
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      arrangement.splice(idx, 1);
      if (arrPlayIdx >= arrangement.length) arrPlayIdx = Math.max(0, arrangement.length - 1);
      rebuildSongArrList(); syncSongEditorFromState();
    }));

  // Total bars
  const total = arrangement.reduce((s, b) => s + b.loops, 0);
  arrTotal.textContent = `${total} bar${total !== 1 ? 's' : ''} total`;
}

// ── Scene management ──────────────────────────

function getSceneLetter() {
  return scenes.length < 26
    ? LETTERS[scenes.length]
    : LETTERS[Math.floor(scenes.length / 26) - 1] + LETTERS[scenes.length % 26];
}

function addToArrangement(sceneId) {
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) return;
  arrangement.push({ sceneId, loops: 1 });
  rebuildSongArrList();
  syncSongEditorFromState();
  setStatus(`scene ${scene.name} added to song`);
}

newSceneBtn.addEventListener('click', () => openPatternEditor(null));

// ── Playback ──────────────────────────────────

function startPlaying() {
  const ac = getCtx();
  if (ac.state === 'suspended') ac.resume();

  if (patternEditorOpen && pePreviewActive) {
    // Preview: play the PE pattern
    const result = parseCode(peEditor.value);
    parsedTracks = result.tracks;
    currentBpm   = result.bpm;
  } else if (isSongPlayback()) {
    // Song playback
    arrPlayIdx = 0; loopsDoneInBlock = -1;
    const first = scenes.find(s => s.id === arrangement[0].sceneId);
    if (first) {
      const result = parseCode(first.code || '');
      parsedTracks = result.tracks;
      currentBpm   = result.bpm;
    }
    updatePlayingHighlights();
  } else if (scenes.length > 0) {
    // Loop first scene
    const first = scenes[0];
    const result = parseCode(first.code || '');
    parsedTracks = result.tracks;
    currentBpm   = result.bpm;
  } else {
    // Nothing to play
    setStatus('no scenes — create a scene first');
    return;
  }

  bpmDisplay.textContent = `${currentBpm} bpm`;

  schedulerStep = 0;
  nextStepTime  = ac.currentTime + 0.05;
  stepQueue.length = 0;
  lastVizStep   = -1;
  isPlaying     = true;
  scheduler();

  playBtn.textContent = 'stop';
  playBtn.classList.add('playing');

  if (patternEditorOpen && pePreviewActive) {
    setStatus(`preview: scene ${peSceneName.textContent} — loops until preview off`);
  } else if (isSongPlayback()) {
    setStatus('playing song — arrangement runs left to right');
  } else {
    setStatus('playing — first scene loops');
  }
}

function stopPlaying() {
  clearTimeout(timerID);
  isPlaying = false;
  stepQueue.length = 0;
  lastVizStep = -1;
  clearPeStepHighlights();
  updatePlayingHighlights();
  playBtn.textContent = 'play';
  playBtn.classList.remove('playing');
  setStatus('stopped');
}

function togglePlay() { if (isPlaying) stopPlaying(); else startPlaying(); }

playBtn.addEventListener('click', togglePlay);
document.addEventListener('keydown', e => {
  if (e.target === songEditor || e.target === peEditor) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
});

// ── Status ────────────────────────────────────

function setStatus(msg, isError = false) {
  statusText.textContent = msg;
  statusBar.classList.toggle('error', isError);
}

// ── Init ──────────────────────────────────────

updatePeNoteInputVisibility();
applySongCode(SONG_CODE_TEMPLATE);
syncSongEditorFromState();
rebuildSceneCards();
rebuildSongArrList();

// Set initial currentBpm from first scene
if (scenes.length > 0) {
  const result = parseCode(scenes[0].code || '');
  currentBpm = result.bpm;
  bpmDisplay.textContent = `${currentBpm} bpm`;
}

setStatus('ready — press play or hit space');
