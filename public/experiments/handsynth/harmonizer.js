/**
 * Harmonizer — Maps hand positions to chords and melody.
 *
 * Left hand → diatonic triad (3 voices: root + 3rd + 5th)
 * Right hand → single melody note (1 voice)
 *
 * Both quantized to C major diatonic scale across 2 octaves.
 * Y position controls filter brightness on each layer.
 */

// ---------------------------------------------------------------------------
// Scale & chord definitions
// ---------------------------------------------------------------------------

const SCALE_NOTES = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
const CHORD_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'];

// Number of positions across 2 octaves (7 notes × 2)
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

    // Fist-lock state
    this.chordLocked = false;
    this.melodyLocked = false;
    this.lockedChordName = null;
    this.lockedMelodyName = null;

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
   * @param {boolean} fist — true if hand is making a fist (lock gesture)
   * @returns {{ chordName: string, locked: boolean }}
   */
  updateLeftHand(screenX, screenY, fist) {
    // Handle lock transitions
    if (fist && !this.chordLocked) {
      // Just closed fist — lock current chord
      const idx = quantize(screenX, NUM_POSITIONS);
      const triad = getTriad(idx, this.chordOctave);
      this.voicePool.setChord(triad.root, triad.third, triad.fifth);
      this.chordLocked = true;
      this.lockedChordName = triad.name;
      this.currentChordIndex = idx;
    } else if (!fist && this.chordLocked) {
      // Just opened hand — unlock
      this.chordLocked = false;
      this.lockedChordName = null;
    }

    if (!this.chordLocked) {
      // Normal tracking — update chord from X position
      const idx = quantize(screenX, NUM_POSITIONS);
      const triad = getTriad(idx, this.chordOctave);
      this.voicePool.setChord(triad.root, triad.third, triad.fifth);
      this.currentChordIndex = idx;
      this.lockedChordName = null;
    }

    // Filter cutoff from Y — always responds, even when locked
    const cutoff = yToFilterCutoff(screenY, 200, 2000);
    this.voicePool.setChordFilter(cutoff);

    // Fade in if hand just appeared
    if (!this.chordHandPresent) {
      this.voicePool.fadeInChord();
      this.chordHandPresent = true;
    }

    const chordName = this.chordLocked
      ? this.lockedChordName
      : getTriad(this.currentChordIndex, this.chordOctave).name;

    return { chordName, locked: this.chordLocked };
  }

  /**
   * Update from right hand position. Plays/updates melody.
   *
   * @param {number} screenX — 0–1, mirrored
   * @param {number} screenY — 0–1
   * @param {boolean} fist — true if hand is making a fist (lock gesture)
   * @returns {{ noteName: string, locked: boolean }}
   */
  updateRightHand(screenX, screenY, fist) {
    // Handle lock transitions
    if (fist && !this.melodyLocked) {
      const idx = quantize(screenX, NUM_POSITIONS);
      const note = getMelodyNote(idx, this.melodyOctave);
      this.voicePool.setMelody(note.freq);
      this.melodyLocked = true;
      this.lockedMelodyName = note.name;
      this.currentMelodyIndex = idx;
    } else if (!fist && this.melodyLocked) {
      this.melodyLocked = false;
      this.lockedMelodyName = null;
    }

    if (!this.melodyLocked) {
      const idx = quantize(screenX, NUM_POSITIONS);
      const note = getMelodyNote(idx, this.melodyOctave);
      this.voicePool.setMelody(note.freq);
      this.currentMelodyIndex = idx;
      this.lockedMelodyName = null;
    }

    // Filter cutoff from Y — always responds, even when locked
    const cutoff = yToFilterCutoff(screenY, 300, 3000);
    this.voicePool.setMelodyFilter(cutoff);

    if (!this.melodyHandPresent) {
      this.voicePool.fadeInMelody();
      this.melodyHandPresent = true;
    }

    const noteName = this.melodyLocked
      ? this.lockedMelodyName
      : getMelodyNote(this.currentMelodyIndex, this.melodyOctave).name;

    return { noteName, locked: this.melodyLocked };
  }

  /** Left hand removed — fade out chord and clear lock. */
  releaseLeftHand() {
    if (!this.chordHandPresent) return;
    this.voicePool.fadeOutChord();
    this.chordHandPresent = false;
    this.currentChordIndex = null;
    this.chordLocked = false;
    this.lockedChordName = null;
  }

  /** Right hand removed — fade out melody and clear lock. */
  releaseRightHand() {
    if (!this.melodyHandPresent) return;
    this.voicePool.fadeOutMelody();
    this.melodyHandPresent = false;
    this.currentMelodyIndex = null;
    this.melodyLocked = false;
    this.lockedMelodyName = null;
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
    this.chordLocked = false;
    this.melodyLocked = false;
    this.lockedChordName = null;
    this.lockedMelodyName = null;
  }
}

// ---------------------------------------------------------------------------
// Expose globally
// ---------------------------------------------------------------------------

window.Harmonizer = Harmonizer;
window.isFist = isFist;
