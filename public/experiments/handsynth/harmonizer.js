/**
 * Harmonizer — Maps hand positions to continuous chord and melody.
 *
 * Left hand → triad (root + major 3rd + perfect 5th), continuous pitch
 * Right hand → single melody note, continuous pitch
 *
 * Pitch is mapped continuously (no quantization) for smooth theremin-like
 * glide. Y position controls filter brightness on each layer.
 */

// ---------------------------------------------------------------------------
// Frequency mapping
// ---------------------------------------------------------------------------

/** Logarithmic interpolation from minFreq to maxFreq based on x (0–1). */
function screenXToFreq(x, minFreq, maxFreq) {
  const clamped = Math.max(0, Math.min(1, x));
  return minFreq * Math.pow(maxFreq / minFreq, clamped);
}

// Frequency ranges (2 octaves each)
const CHORD_MIN_HZ = 130.81;  // C3
const CHORD_MAX_HZ = 523.25;  // C5
const MELODY_MIN_HZ = 261.63; // C4
const MELODY_MAX_HZ = 1046.50; // C6

// For building triads from the root — equal-temperament ratios
const MAJOR_THIRD = Math.pow(2, 4 / 12);   // ~1.2599
const PERFECT_FIFTH = Math.pow(2, 7 / 12); // ~1.4983

// ---------------------------------------------------------------------------
// Nearest-note name lookup (for display only)
// ---------------------------------------------------------------------------

const ALL_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Convert a frequency to the nearest note name (e.g. "C4", "F#5"). */
function freqToNoteName(freq) {
  const midi = 12 * Math.log2(freq / 440) + 69;
  const rounded = Math.round(midi);
  const name = ALL_NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return name + octave;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

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
   * Update from left hand position. Plays/updates chord continuously.
   *
   * @param {number} screenX — 0–1, mirrored for user's perspective
   * @param {number} screenY — 0–1, 0=top 1=bottom
   * @returns {{ chordName: string, screenX: number }}
   */
  updateLeftHand(screenX, screenY) {
    const rootFreq = screenXToFreq(screenX, CHORD_MIN_HZ, CHORD_MAX_HZ);
    const thirdFreq = rootFreq * MAJOR_THIRD;
    const fifthFreq = rootFreq * PERFECT_FIFTH;
    const cutoff = yToFilterCutoff(screenY, 200, 2000);

    this.voicePool.setChord(rootFreq, thirdFreq, fifthFreq);
    this.voicePool.setChordFilter(cutoff);

    if (!this.chordHandPresent) {
      this.voicePool.fadeInChord();
      this.chordHandPresent = true;
    }

    return { chordName: freqToNoteName(rootFreq), screenX };
  }

  /**
   * Update from right hand position. Plays/updates melody continuously.
   *
   * @param {number} screenX — 0–1, mirrored
   * @param {number} screenY — 0–1
   * @returns {{ noteName: string, screenX: number }}
   */
  updateRightHand(screenX, screenY) {
    const freq = screenXToFreq(screenX, MELODY_MIN_HZ, MELODY_MAX_HZ);
    const cutoff = yToFilterCutoff(screenY, 300, 3000);

    this.voicePool.setMelody(freq);
    this.voicePool.setMelodyFilter(cutoff);

    if (!this.melodyHandPresent) {
      this.voicePool.fadeInMelody();
      this.melodyHandPresent = true;
    }

    return { noteName: freqToNoteName(freq), screenX };
  }

  /** Left hand removed — fade out live chord. */
  releaseLeftHand() {
    if (!this.chordHandPresent) return;
    this.voicePool.fadeOutChord();
    this.chordHandPresent = false;
  }

  /** Right hand removed — fade out live melody. */
  releaseRightHand() {
    if (!this.melodyHandPresent) return;
    this.voicePool.fadeOutMelody();
    this.melodyHandPresent = false;
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
  }
}

// ---------------------------------------------------------------------------
// Expose globally
// ---------------------------------------------------------------------------

window.Harmonizer = Harmonizer;
