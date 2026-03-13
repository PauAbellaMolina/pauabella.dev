/**
 * Harmonizer — Maps hand positions to chords and melody.
 *
 * Left hand → diatonic triad (3 voices: root + 3rd + 5th)
 * Right hand → single melody note (1 voice)
 *
 * Both quantized to C major diatonic scale across 2 octaves.
 * Y position controls filter brightness on each layer.
 *
 * Gestures:
 *   Open hand — play live note following hand position
 *   Pinch (thumb + index) — stamp current note as a held drone
 *   Fist — remove nearby held note
 */

// ---------------------------------------------------------------------------
// Scale & chord definitions
// ---------------------------------------------------------------------------

const SCALE_NOTES = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
const CHORD_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'];

// Number of positions across 2 octaves (7 notes x 2)
const NUM_POSITIONS = 14;

/**
 * Build a diatonic triad from a scale index.
 *
 * @param {number} scaleIndex — 0–13 (2 octaves of 7 notes)
 * @param {number} baseOctave — octave of the lowest root (e.g. 3)
 * @returns {{ root: number, third: number, fifth: number, name: string }}
 */
function getTriad(scaleIndex, baseOctave) {
  const rootDeg  = scaleIndex;
  const thirdDeg = scaleIndex + 2;
  const fifthDeg = scaleIndex + 4;

  const rootNote  = SCALE_NOTES[rootDeg % 7];
  const thirdNote = SCALE_NOTES[thirdDeg % 7];
  const fifthNote = SCALE_NOTES[fifthDeg % 7];

  const rootOct  = baseOctave + Math.floor(rootDeg / 7);
  const thirdOct = baseOctave + Math.floor(thirdDeg / 7);
  const fifthOct = baseOctave + Math.floor(fifthDeg / 7);

  const { NOTE_FREQ } = window;

  return {
    root:  NOTE_FREQ[rootNote + rootOct],
    third: NOTE_FREQ[thirdNote + thirdOct],
    fifth: NOTE_FREQ[fifthNote + fifthOct],
    name:  rootNote.toUpperCase() + CHORD_QUALITIES[rootDeg % 7],
  };
}

/**
 * Get a single melody note from a scale index.
 *
 * @param {number} scaleIndex — 0–13
 * @param {number} baseOctave — octave of the lowest note (e.g. 4)
 * @returns {{ freq: number, name: string }}
 */
function getMelodyNote(scaleIndex, baseOctave) {
  const noteName = SCALE_NOTES[scaleIndex % 7];
  const octave = baseOctave + Math.floor(scaleIndex / 7);
  const noteKey = noteName + octave;
  const { NOTE_FREQ } = window;

  return {
    freq: NOTE_FREQ[noteKey],
    name: noteKey.toUpperCase(),
  };
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/** 3D distance between two landmark points. */
function dist3D(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/**
 * Detect a closed fist from hand landmarks.
 *
 * Compares each fingertip-to-wrist distance vs its PIP-joint-to-wrist distance.
 * When the tip is closer to the wrist than the PIP, the finger is curled.
 * 3 out of 4 fingers curled = fist (thumb excluded — less reliable).
 *
 * @param {Array} landmarks — 21 {x,y,z} points from MediaPipe
 * @returns {boolean}
 */
function isFist(landmarks) {
  const wrist = landmarks[0];
  const fingers = [
    { tip: 8,  pip: 6 },   // index
    { tip: 12, pip: 10 },  // middle
    { tip: 16, pip: 14 },  // ring
    { tip: 20, pip: 18 },  // pinky
  ];
  let curled = 0;
  for (const { tip, pip } of fingers) {
    if (dist3D(landmarks[tip], wrist) < dist3D(landmarks[pip], wrist)) curled++;
  }
  return curled >= 3;
}

/**
 * Detect a place-pinch (thumb tip touching index finger tip).
 * Used to persist/stamp the current note as a held drone.
 *
 * @param {Array} landmarks — 21 {x,y,z} points from MediaPipe
 * @returns {boolean}
 */
function isPlacePinch(landmarks) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  return dist3D(thumbTip, indexTip) < 0.07;
}

/**
 * Detect a remove-pinch (thumb tip touching pinky finger tip).
 * Used to remove a nearby held note.
 *
 * @param {Array} landmarks — 21 {x,y,z} points from MediaPipe
 * @returns {boolean}
 */
function isRemovePinch(landmarks) {
  const thumbTip = landmarks[4];
  const pinkyTip = landmarks[20];
  return dist3D(thumbTip, pinkyTip) < 0.07;
}

/**
 * Determine the current gesture from landmarks.
 * Priority: place-pinch > remove-pinch > open
 *
 * @param {Array} landmarks — 21 {x,y,z} points
 * @returns {'place'|'remove'|'open'}
 */
function getGesture(landmarks) {
  if (isPlacePinch(landmarks)) return 'place';
  if (isRemovePinch(landmarks)) return 'remove';
  return 'open';
}

/** Quantize a 0–1 value to an integer index. */
function quantize(x, numPositions) {
  const clamped = Math.max(0, Math.min(0.999, x));
  return Math.floor(clamped * numPositions);
}

/** Map Y position (0=top, 1=bottom) to filter cutoff. Inverted: hand high = bright. */
function yToFilterCutoff(y, minHz, maxHz) {
  const inverted = 1 - Math.max(0, Math.min(1, y));
  return minHz * Math.pow(maxHz / minHz, inverted);
}

// ---------------------------------------------------------------------------
// Harmonizer class
// ---------------------------------------------------------------------------

class Harmonizer {
  constructor() {
    this.ac = null;
    this.voicePool = null;

    this.chordHandPresent = false;
    this.melodyHandPresent = false;
    this.currentChordIndex = null;
    this.currentMelodyIndex = null;

    // Place-pinch edge detection (stamp only on pinch-start, not every frame)
    this.chordPlacing = false;
    this.melodyPlacing = false;

    // Remove-pinch edge detection (remove only on pinch-start)
    this.chordRemoving = false;
    this.melodyRemoving = false;

    // Held notes — objects with { name, screenX }
    this.heldChords = [];
    this.heldMelodies = [];

    // Configurable — change these to switch keys/octaves later
    this.chordOctave = 3;   // chord roots span C3–B4
    this.melodyOctave = 4;  // melody spans C4–B5
  }

  /** Create AudioContext and voice pool. Must be called from a user gesture. */
  init() {
    if (this.ac) return;
    this.ac = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ac.state === 'suspended') this.ac.resume();

    this.voicePool = new window.VoicePool(this.ac);
    this.voicePool.init();
  }

  /**
   * Update from left hand position. Plays/updates chord.
   *
   * @param {number} screenX — 0–1, mirrored for user's perspective
   * @param {number} screenY — 0–1, 0=top 1=bottom
   * @param {'open'|'pinch'|'fist'} gesture
   * @returns {{ chordName: string, screenX: number }}
   */
  updateLeftHand(screenX, screenY, gesture) {
    const cutoff = yToFilterCutoff(screenY, 200, 2000);
    const PROXIMITY = 0.07;

    // Always update live chord to follow hand
    const idx = quantize(screenX, NUM_POSITIONS);
    const triad = getTriad(idx, this.chordOctave);
    this.voicePool.setChord(triad.root, triad.third, triad.fifth);
    this.voicePool.setChordFilter(cutoff);
    this.currentChordIndex = idx;

    if (!this.chordHandPresent) {
      this.voicePool.fadeInChord();
      this.chordHandPresent = true;
    }

    // Place-pinch (thumb+index) → stamp held chord (edge: only on start)
    if (gesture === 'place' && !this.chordPlacing) {
      this.chordPlacing = true;
      this.voicePool.spawnHeldChord(triad.root, triad.third, triad.fifth, cutoff);
      this.heldChords.push({ name: triad.name, screenX });
      if (this.heldChords.length > 4) {
        this.voicePool.removeHeldChord(0);
        this.heldChords.shift();
      }
    } else if (gesture !== 'place') {
      this.chordPlacing = false;
    }

    // Remove-pinch (thumb+pinky) → remove nearby held chord (edge: only on start)
    if (gesture === 'remove' && !this.chordRemoving) {
      this.chordRemoving = true;
      const nearIdx = this.heldChords.findIndex(
        (h) => Math.abs(h.screenX - screenX) < PROXIMITY
      );
      if (nearIdx !== -1) {
        this.voicePool.removeHeldChord(nearIdx);
        this.heldChords.splice(nearIdx, 1);
      }
    } else if (gesture !== 'remove') {
      this.chordRemoving = false;
    }

    return { chordName: triad.name, screenX };
  }

  /**
   * Update from right hand position. Plays/updates melody.
   *
   * @param {number} screenX — 0–1, mirrored
   * @param {number} screenY — 0–1
   * @param {'open'|'pinch'|'fist'} gesture
   * @returns {{ noteName: string, screenX: number }}
   */
  updateRightHand(screenX, screenY, gesture) {
    const cutoff = yToFilterCutoff(screenY, 300, 3000);
    const PROXIMITY = 0.07;

    // Always update live melody to follow hand
    const idx = quantize(screenX, NUM_POSITIONS);
    const note = getMelodyNote(idx, this.melodyOctave);
    this.voicePool.setMelody(note.freq);
    this.voicePool.setMelodyFilter(cutoff);
    this.currentMelodyIndex = idx;

    if (!this.melodyHandPresent) {
      this.voicePool.fadeInMelody();
      this.melodyHandPresent = true;
    }

    // Place-pinch (thumb+index) → stamp held melody (edge: only on start)
    if (gesture === 'place' && !this.melodyPlacing) {
      this.melodyPlacing = true;
      this.voicePool.spawnHeldMelody(note.freq, cutoff);
      this.heldMelodies.push({ name: note.name, screenX });
      if (this.heldMelodies.length > 4) {
        this.voicePool.removeHeldMelody(0);
        this.heldMelodies.shift();
      }
    } else if (gesture !== 'place') {
      this.melodyPlacing = false;
    }

    // Remove-pinch (thumb+pinky) → remove nearby held melody (edge: only on start)
    if (gesture === 'remove' && !this.melodyRemoving) {
      this.melodyRemoving = true;
      const nearIdx = this.heldMelodies.findIndex(
        (h) => Math.abs(h.screenX - screenX) < PROXIMITY
      );
      if (nearIdx !== -1) {
        this.voicePool.removeHeldMelody(nearIdx);
        this.heldMelodies.splice(nearIdx, 1);
      }
    } else if (gesture !== 'remove') {
      this.melodyRemoving = false;
    }

    return { noteName: note.name, screenX };
  }

  /** Left hand removed — fade out live chord. Held notes persist. */
  releaseLeftHand() {
    if (!this.chordHandPresent) return;
    this.voicePool.fadeOutChord();
    this.chordHandPresent = false;
    this.currentChordIndex = null;
    this.chordPlacing = false;
    this.chordRemoving = false;
  }

  /** Right hand removed — fade out live melody. Held notes persist. */
  releaseRightHand() {
    if (!this.melodyHandPresent) return;
    this.voicePool.fadeOutMelody();
    this.melodyHandPresent = false;
    this.currentMelodyIndex = null;
    this.melodyPlacing = false;
    this.melodyRemoving = false;
  }

  /** Clear all held notes. */
  clearHeld() {
    this.voicePool.clearHeldNotes();
    this.heldChords = [];
    this.heldMelodies = [];
  }

  /** Tear down everything. */
  destroy() {
    if (this.voicePool) {
      this.voicePool.destroy();
      this.voicePool = null;
    }
    if (this.ac) {
      try { this.ac.close(); } catch (e) {}
      this.ac = null;
    }
    this.chordHandPresent = false;
    this.melodyHandPresent = false;
    this.currentChordIndex = null;
    this.currentMelodyIndex = null;
    this.chordPlacing = false;
    this.melodyPlacing = false;
    this.chordRemoving = false;
    this.melodyRemoving = false;
    this.heldChords = [];
    this.heldMelodies = [];
  }
}

// ---------------------------------------------------------------------------
// Expose globally
// ---------------------------------------------------------------------------

window.Harmonizer = Harmonizer;
window.isFist = isFist;
window.isPlacePinch = isPlacePinch;
window.isRemovePinch = isRemovePinch;
window.getGesture = getGesture;
