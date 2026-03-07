// ─────────────────────────────────────────────
//  codesynth — live music coding experiment
//
//  Pattern language:
//    bpm 128
//    kick   | x . . . | x . . . | x . . . | x . . . |
//    synth  c4 | x . . x | . . x . |
//    # comment
//
//  Song language (song code mode):
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

// ── View state ────────────────────────────────
// representationMode: 'code' | 'ui'
// primaryMode: 'pattern' | 'song'
// combined: 'pattern-code' | 'pattern-ui' | 'song-code' | 'song-ui'

let representationMode = 'code';
let primaryMode        = 'pattern';

function currentView() { return `${primaryMode}-${representationMode}`; }
function inPatternCode() { return primaryMode === 'pattern' && representationMode === 'code'; }
function inPatternUI()   { return primaryMode === 'pattern' && representationMode === 'ui'; }
function inSongCode()    { return primaryMode === 'song'    && representationMode === 'code'; }
function inSongUI()      { return primaryMode === 'song'    && representationMode === 'ui'; }
function inSong()        { return primaryMode === 'song'; }

// ── Shared pattern state ──────────────────────

let parsedTracks = [];
let currentBpm   = 128;
let suppressEditorUpdate     = false;
let suppressSongEditorUpdate = false;

// ── Scene / arrangement state ─────────────────

const scenes      = [];   // { id, name, code }
const arrangement = [];   // { sceneId, loops }

let activeSceneId    = null;  // currently loaded scene
let arrPlayIdx       = 0;     // which arrangement block is playing
let loopsDoneInBlock = -1;    // -1 = not started
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

const app          = document.getElementById('app');
const editor       = document.getElementById('editor');
const songEditor   = document.getElementById('song-editor');
const playBtn      = document.getElementById('play-btn');
const bpmDisplay   = document.getElementById('bpm-display');
const viz          = document.getElementById('viz');
const seqTracks    = document.getElementById('seq-tracks');
const statusBar    = document.getElementById('status-bar');
const statusText   = document.getElementById('status-text');
const modeCodeBtn  = document.getElementById('mode-code');
const modeUIBtn    = document.getElementById('mode-ui');
const viewPatBtn   = document.getElementById('view-pattern');
const viewSongBtn  = document.getElementById('view-song');
const bpmDown      = document.getElementById('bpm-down');
const bpmUp        = document.getElementById('bpm-up');
const bpmValue     = document.getElementById('bpm-value');
const instSelect   = document.getElementById('inst-select');
const noteInput    = document.getElementById('note-input');
const addTrackBtn  = document.getElementById('add-track-btn');
const scenesList   = document.getElementById('scenes-list');
const newSceneBtn  = document.getElementById('new-scene-btn');
const sceneCards   = document.getElementById('scene-cards');
const songArrList  = document.getElementById('song-arr-list');
const arrTotal     = document.getElementById('arr-total');
const sceneStrip   = document.getElementById('scene-strip');

editor.value = DEFAULT_PATTERN;

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

// ── Code generator (pattern state → text) ─────

function generatePatternCode() {
  const lines = [`bpm ${currentBpm}`, ''];
  for (const track of parsedTracks) {
    const groups = [];
    for (let g = 0; g < 4; g++)
      groups.push(track.steps.slice(g * 4, g * 4 + 4).map(s => s ? 'x' : '.').join(' '));
    const prefix = track.note ? `${track.instrument}  ${track.note}` : track.instrument;
    lines.push(prefix.padEnd(11) + '| ' + groups.join(' | ') + ' |');
  }
  return lines.join('\n');
}

function syncEditorFromState() {
  suppressEditorUpdate = true;
  editor.value = generatePatternCode();
  suppressEditorUpdate = false;
}

function syncSongEditorFromState() {
  suppressSongEditorUpdate = true;
  songEditor.value = generateSongCode();
  suppressSongEditorUpdate = false;
}

function persistToActiveScene() {
  if (!activeSceneId) return;
  const sc = scenes.find(s => s.id === activeSceneId);
  if (sc) sc.code = editor.value;
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

function isSongPlayback() { return inSong() && arrangement.length > 0; }

function scheduleStep(step, time) {
  if (step === 0) {
    if (isSongPlayback()) {
      // Advance arrangement if current block's loops are done
      loopsDoneInBlock++;
      if (loopsDoneInBlock >= arrangement[arrPlayIdx].loops) {
        loopsDoneInBlock = 0;
        arrPlayIdx = (arrPlayIdx + 1) % arrangement.length;
        const next = scenes.find(s => s.id === arrangement[arrPlayIdx].sceneId);
        if (next) {
          activeSceneId = next.id;
          const result = parseCode(next.code || '');
          parsedTracks = result.tracks;
          currentBpm   = result.bpm;
          bpmDisplay.textContent = `${currentBpm} bpm`;
          // Mirror into pattern editor for context / live-edit affordance
          suppressEditorUpdate = true;
          editor.value = next.code || '';
          suppressEditorUpdate = false;
          updatePlayingHighlights();
        }
      }
    } else {
      // Loop mode: re-parse pattern editor for live edits
      const result = parseCode(editor.value);
      parsedTracks = result.tracks;
      if (result.bpm !== currentBpm) {
        currentBpm = result.bpm;
        bpmDisplay.textContent = `${currentBpm} bpm`;
        if (inPatternUI()) bpmValue.textContent = currentBpm;
      }
      if (inPatternCode()) rebuildViz();
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
      if (inPatternUI())   highlightSeqStep(curStep);
      else if (inPatternCode()) highlightVizStep(curStep);
    }
  }
  requestAnimationFrame(animateViz);
}

function highlightVizStep(step) {
  viz.querySelectorAll('.track-row').forEach(row =>
    row.querySelectorAll('.step').forEach((el, i) => el.classList.toggle('current', i === step)));
}

function highlightSeqStep(step) {
  seqTracks.querySelectorAll('.seq-row').forEach(row =>
    row.querySelectorAll('.seq-step').forEach((el, i) => el.classList.toggle('current', i === step)));
}

function clearStepHighlights() {
  viz.querySelectorAll('.step').forEach(el => el.classList.remove('current'));
  seqTracks.querySelectorAll('.seq-step').forEach(el => el.classList.remove('current'));
}

function updatePlayingHighlights() {
  // Update song-arr-list playing block
  songArrList.querySelectorAll('.song-arr-block').forEach(b => {
    b.classList.toggle('playing', isPlaying && parseInt(b.dataset.idx) === arrPlayIdx);
  });
  // Update scene-cards playing state
  sceneCards.querySelectorAll('.scene-card').forEach(c => {
    c.classList.toggle('playing', isPlaying && c.dataset.id === activeSceneId);
  });
  // Update scene strip
  scenesList.querySelectorAll('.scene-tile').forEach(t => {
    t.classList.toggle('active', t.dataset.id === activeSceneId);
  });
}

requestAnimationFrame(animateViz);

// ── Viz builder (pattern-code) ────────────────

function rebuildViz() {
  const cur = lastVizStep;
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
        el.className = `step ${track.steps[i] ? 'on' : 'off'}${i === cur ? ' current' : ''}`;
        group.appendChild(el);
      }
      stepsEl.appendChild(group);
    }
    row.appendChild(stepsEl);
    viz.appendChild(row);
  }
}

// ── Sequencer builder (pattern-ui) ───────────

function rebuildSequencer() {
  const cur = lastVizStep;
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
        btn.className = `seq-step ${track.steps[i] ? 'on' : 'off'}${i === cur ? ' current' : ''}`;
        btn.dataset.track = ti;
        btn.dataset.step  = i;
        btn.addEventListener('click', handleStepClick);
        group.appendChild(btn);
      }
      stepsEl.appendChild(group);
    }
    row.appendChild(stepsEl);

    const del = document.createElement('button');
    del.className = 'seq-delete';
    del.textContent = '×';
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
  syncSongEditorFromState();
}

function handleDeleteTrack(e) {
  const ti = parseInt(e.currentTarget.dataset.track);
  parsedTracks.splice(ti, 1);
  rebuildSequencer();
  syncEditorFromState();
  persistToActiveScene();
  syncSongEditorFromState();
}

function handleAddTrack() {
  const instrument = instSelect.value;
  let note = null;
  if (MELODIC.includes(instrument)) {
    const raw = noteInput.value.trim().toLowerCase();
    note = NOTE_FREQ[raw] ? raw : 'c4';
  }
  const label = note ? `${instrument} ${note}` : instrument;
  parsedTracks.push({ instrument, note, steps: Array(STEPS).fill(false), label });
  rebuildSequencer();
  syncEditorFromState();
  persistToActiveScene();
  syncSongEditorFromState();
  seqTracks.lastElementChild?.scrollIntoView({ block: 'nearest' });
}

function updateNoteInputVisibility() {
  noteInput.style.display = MELODIC.includes(instSelect.value) ? '' : 'none';
}

instSelect.addEventListener('change', updateNoteInputVisibility);
addTrackBtn.addEventListener('click', handleAddTrack);

bpmDown.addEventListener('click', () => {
  currentBpm = Math.max(20, currentBpm - 5);
  bpmValue.textContent = currentBpm;
  bpmDisplay.textContent = `${currentBpm} bpm`;
  syncEditorFromState(); persistToActiveScene(); syncSongEditorFromState();
});

bpmUp.addEventListener('click', () => {
  currentBpm = Math.min(300, currentBpm + 5);
  bpmValue.textContent = currentBpm;
  bpmDisplay.textContent = `${currentBpm} bpm`;
  syncEditorFromState(); persistToActiveScene(); syncSongEditorFromState();
});

// ── Scene strip (pattern modes) ───────────────

function rebuildSceneStrip() {
  scenesList.innerHTML = '';
  for (const scene of scenes) {
    const tile = document.createElement('div');
    tile.className = 'scene-tile' + (scene.id === activeSceneId ? ' active' : '');
    tile.dataset.id = scene.id;

    const loadBtn = document.createElement('button');
    loadBtn.className = 'scene-load-btn';
    loadBtn.textContent = scene.name;
    loadBtn.title = `Load scene ${scene.name}`;
    loadBtn.addEventListener('click', () => loadScene(scene.id));

    const queueBtn = document.createElement('button');
    queueBtn.className = 'scene-queue-btn';
    queueBtn.textContent = '›';
    queueBtn.title = `Add scene ${scene.name} to song`;
    queueBtn.addEventListener('click', e => { e.stopPropagation(); addToArrangement(scene.id); });

    tile.appendChild(loadBtn);
    tile.appendChild(queueBtn);
    scenesList.appendChild(tile);
  }
}

// ── Song UI: scene cards ──────────────────────

function rebuildSceneCards() {
  sceneCards.innerHTML = '';

  if (!scenes.length) {
    const hint = document.createElement('p');
    hint.className = 'song-empty-hint';
    hint.textContent = 'Design patterns in pattern mode, save them as scenes with [+], then arrange them here.';
    sceneCards.appendChild(hint);
    return;
  }

  for (const scene of scenes) {
    const info = getSceneInfo(scene);
    const card = document.createElement('div');
    card.className = 'scene-card';
    card.dataset.id = scene.id;
    if (scene.id === activeSceneId) card.classList.add('active');
    if (isPlaying && arrangement[arrPlayIdx]?.sceneId === scene.id) card.classList.add('playing');

    card.innerHTML = `
      <div class="scene-card-letter">${scene.name}</div>
      <div class="scene-card-info">
        <span class="scene-card-bpm">${info.bpm} bpm</span>
        <span class="scene-card-tracks">${info.tracks}</span>
      </div>
      <div class="scene-card-actions">
        <button class="card-btn" data-action="load" data-id="${scene.id}">load</button>
        <button class="card-btn primary" data-action="queue" data-id="${scene.id}">+ song</button>
      </div>`;

    sceneCards.appendChild(card);
  }

  sceneCards.querySelectorAll('[data-action="load"]').forEach(btn =>
    btn.addEventListener('click', () => {
      loadScene(btn.dataset.id);
      // Switch to pattern to edit
      setPrimaryMode('pattern');
    }));

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
      <div class="arr-block-letter" data-id="${scene.id}" title="Load scene ${scene.name}">${scene.name}</div>
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

  // Click letter to load scene and switch to pattern
  songArrList.querySelectorAll('.arr-block-letter').forEach(el =>
    el.addEventListener('click', () => {
      loadScene(el.dataset.id);
      setPrimaryMode('pattern');
    }));

  // Total bars
  const total = arrangement.reduce((s, b) => s + b.loops, 0);
  arrTotal.textContent = `${total} bar${total !== 1 ? 's' : ''} total`;
}

// ── Scene management ──────────────────────────

function getSceneLetter() {
  return scenes.length < 26 ? LETTERS[scenes.length] : LETTERS[Math.floor(scenes.length / 26) - 1] + LETTERS[scenes.length % 26];
}

function saveCurrentAsScene() {
  if (inPatternUI()) syncEditorFromState();
  const code = editor.value;
  const name = getSceneLetter();
  const id   = String(Date.now() + Math.random());
  scenes.push({ id, name, code });
  activeSceneId = id;
  rebuildSceneStrip();
  rebuildSceneCards();
  syncSongEditorFromState();
  setStatus(`scene ${name} saved — [›] to add to song`);
}

function loadScene(id) {
  const scene = scenes.find(s => s.id === id);
  if (!scene) return;
  activeSceneId = id;

  suppressEditorUpdate = true;
  editor.value = scene.code || '';
  suppressEditorUpdate = false;

  const result = parseCode(scene.code || '');
  parsedTracks = result.tracks;
  currentBpm   = result.bpm;
  bpmDisplay.textContent = `${currentBpm} bpm`;

  if (inPatternUI()) { bpmValue.textContent = currentBpm; rebuildSequencer(); }
  else { rebuildViz(); }

  rebuildSceneStrip();
  rebuildSceneCards();
  setStatus(`scene ${scene.name} loaded`);
}

function addToArrangement(sceneId) {
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) return;
  arrangement.push({ sceneId, loops: 1 });
  rebuildSongArrList();
  syncSongEditorFromState();
  setStatus(`scene ${scene.name} added to song`);
}

newSceneBtn.addEventListener('click', saveCurrentAsScene);

// ── View switching ────────────────────────────

function setRepresentation(mode) {
  // Sync outgoing view
  if (inPatternUI()) { syncEditorFromState(); persistToActiveScene(); }
  if (inSongCode())  { applySongCode(songEditor.value); }

  representationMode = mode;
  applyViewClasses();
  initCurrentView();
  updateToggleStates();
}

function setPrimaryMode(mode) {
  // Sync outgoing view
  if (inPatternUI()) { syncEditorFromState(); persistToActiveScene(); }
  if (inSongCode())  { applySongCode(songEditor.value); }

  primaryMode = mode;
  applyViewClasses();
  initCurrentView();
  updateToggleStates();
}

function applyViewClasses() {
  app.className = 'app';
  const v = currentView();
  if (v !== 'pattern-code') app.classList.add(v); // e.g. 'pattern-ui', 'song-code', 'song-ui'
}

function initCurrentView() {
  const v = currentView();

  if (v === 'pattern-code') {
    rebuildViz();
  } else if (v === 'pattern-ui') {
    const result = parseCode(editor.value);
    parsedTracks = result.tracks; currentBpm = result.bpm;
    bpmValue.textContent = currentBpm;
    rebuildSequencer();
  } else if (v === 'song-code') {
    suppressSongEditorUpdate = true;
    songEditor.value = scenes.length ? generateSongCode() : SONG_CODE_TEMPLATE;
    suppressSongEditorUpdate = false;
  } else if (v === 'song-ui') {
    rebuildSceneCards();
    rebuildSongArrList();
  }

  rebuildSceneStrip();
}

function updateToggleStates() {
  modeCodeBtn.classList.toggle('active', representationMode === 'code');
  modeUIBtn.classList.toggle('active',   representationMode === 'ui');
  viewPatBtn.classList.toggle('active',  primaryMode === 'pattern');
  viewSongBtn.classList.toggle('active', primaryMode === 'song');
}

modeCodeBtn.addEventListener('click', () => { if (representationMode !== 'code') setRepresentation('code'); });
modeUIBtn.addEventListener('click',   () => { if (representationMode !== 'ui')   setRepresentation('ui'); });
viewPatBtn.addEventListener('click',  () => { if (primaryMode !== 'pattern') setPrimaryMode('pattern'); });
viewSongBtn.addEventListener('click', () => { if (primaryMode !== 'song')    setPrimaryMode('song'); });

// ── Playback ──────────────────────────────────

function startPlaying() {
  const ac = getCtx();
  if (ac.state === 'suspended') ac.resume();

  // In song mode with arrangement: start from first block
  if (isSongPlayback()) {
    arrPlayIdx = 0; loopsDoneInBlock = -1;
    const first = scenes.find(s => s.id === arrangement[0].sceneId);
    if (first) {
      activeSceneId = first.id;
      const result = parseCode(first.code || '');
      parsedTracks = result.tracks; currentBpm = result.bpm;
      suppressEditorUpdate = true; editor.value = first.code || ''; suppressEditorUpdate = false;
    }
    updatePlayingHighlights();
  } else {
    const result = parseCode(editor.value);
    parsedTracks = result.tracks; currentBpm = result.bpm;
  }

  bpmDisplay.textContent = `${currentBpm} bpm`;
  if (inPatternUI()) { bpmValue.textContent = currentBpm; rebuildSequencer(); }
  else if (inPatternCode()) rebuildViz();

  schedulerStep = 0; nextStepTime = ac.currentTime + 0.05;
  stepQueue.length = 0; lastVizStep = -1;
  isPlaying = true;
  scheduler();

  playBtn.textContent = 'stop';
  playBtn.classList.add('playing');
  setStatus(isSongPlayback() ? 'playing song — arrangement runs left to right' : 'playing — edits apply on next loop');
}

function stopPlaying() {
  clearTimeout(timerID);
  isPlaying = false; stepQueue.length = 0; lastVizStep = -1;
  clearStepHighlights();
  updatePlayingHighlights();
  playBtn.textContent = 'play'; playBtn.classList.remove('playing');
  setStatus('stopped');
}

function togglePlay() { if (isPlaying) stopPlaying(); else startPlaying(); }

playBtn.addEventListener('click', togglePlay);
document.addEventListener('keydown', e => {
  if (e.target === editor || e.target === songEditor) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
});

// ── Live editing ──────────────────────────────

let patDebounce = null;
editor.addEventListener('input', () => {
  if (suppressEditorUpdate) return;
  clearTimeout(patDebounce);
  patDebounce = setTimeout(() => {
    try {
      const result = parseCode(editor.value);
      parsedTracks = result.tracks; currentBpm = result.bpm;
      bpmDisplay.textContent = `${currentBpm} bpm`;
      if (inPatternUI()) { bpmValue.textContent = currentBpm; rebuildSequencer(); }
      else rebuildViz();
      persistToActiveScene();
      syncSongEditorFromState();
      statusBar.classList.remove('error');
    } catch (err) { setStatus('parse error: ' + err.message, true); }
  }, 200);
});

let songDebounce = null;
songEditor.addEventListener('input', () => {
  if (suppressSongEditorUpdate) return;
  clearTimeout(songDebounce);
  songDebounce = setTimeout(() => {
    applySongCode(songEditor.value);
    rebuildSceneStrip();
    if (inSongUI()) { rebuildSceneCards(); rebuildSongArrList(); }
  }, 300);
});

// ── Status ────────────────────────────────────

function setStatus(msg, isError = false) {
  statusText.textContent = msg;
  statusBar.classList.toggle('error', isError);
}

// ── Init ──────────────────────────────────────

const init = parseCode(editor.value);
parsedTracks = init.tracks; currentBpm = init.bpm;
bpmDisplay.textContent = `${currentBpm} bpm`;
bpmValue.textContent = currentBpm;

updateNoteInputVisibility();
rebuildViz();
rebuildSceneStrip();
rebuildSceneCards();
rebuildSongArrList();
setStatus('ready — press play or hit space');
