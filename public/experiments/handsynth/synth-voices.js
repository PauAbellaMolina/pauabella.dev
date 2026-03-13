/**
 * SynthVoice + VoicePool — Persistent oscillator voices for the harmonizer.
 *
 * Oscillators are created once and never stopped. Volume is entirely
 * gain-controlled to avoid click/pop artifacts. Frequency changes
 * use exponential ramps for musical glide between notes.
 */

// ---------------------------------------------------------------------------
// Note frequency lookup (12-TET, A4 = 440 Hz)
// ---------------------------------------------------------------------------

const NOTE_FREQ = {};
const NOTE_NAMES_12 = ['c','c#','d','d#','e','f','f#','g','g#','a','a#','b'];
for (let oct = 0; oct <= 8; oct++) {
  for (let i = 0; i < 12; i++) {
    NOTE_FREQ[NOTE_NAMES_12[i] + oct] = 440 * Math.pow(2, (oct - 4) + (i - 9) / 12);
  }
}

// ---------------------------------------------------------------------------
// SynthVoice — a single persistent oscillator voice
// ---------------------------------------------------------------------------

class SynthVoice {
  /**
   * @param {AudioContext} ac
   * @param {AudioNode} destination — where to connect the output
   * @param {Object} options
   * @param {'triangle'|'sawtooth'|'sine'} options.waveform
   * @param {number} options.filterFreq — initial lowpass cutoff in Hz
   * @param {number} options.maxGain — peak gain when fully active
   */
  constructor(ac, destination, { waveform = 'triangle', filterFreq = 800, maxGain = 0.12 } = {}) {
    this.ac = ac;
    this.maxGain = maxGain;
    this.isActive = false;

    // Oscillator (runs continuously at gain 0)
    this.osc = ac.createOscillator();
    this.osc.type = waveform;
    this.osc.frequency.value = 261.63; // C4 default

    // Lowpass filter
    this.filter = ac.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = filterFreq;
    this.filter.Q.value = 0.7;

    // Gain (starts at 0 — silent until activated)
    this.gain = ac.createGain();
    this.gain.gain.value = 0;

    // Chain: osc → filter → gain → destination
    this.osc.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(destination);

    this.osc.start();
  }

  /** Smoothly ramp to a new frequency (60ms glide). */
  setFrequency(freq) {
    if (freq <= 0) return;
    const now = this.ac.currentTime;
    this.osc.frequency.cancelScheduledValues(now);
    this.osc.frequency.setValueAtTime(this.osc.frequency.value, now);
    this.osc.frequency.exponentialRampToValueAtTime(freq, now + 0.06);
  }

  /** Smoothly ramp the filter cutoff (60ms). */
  setFilterCutoff(freq) {
    if (freq <= 0) return;
    const now = this.ac.currentTime;
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(this.filter.frequency.value, now);
    this.filter.frequency.exponentialRampToValueAtTime(freq, now + 0.06);
  }

  /** Fade in to maxGain over durationMs. */
  fadeIn(durationMs = 80) {
    const now = this.ac.currentTime;
    const dur = durationMs / 1000;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(this.maxGain, now + dur);
    this.isActive = true;
  }

  /** Fade out to silence over durationMs. */
  fadeOut(durationMs = 200) {
    const now = this.ac.currentTime;
    const dur = durationMs / 1000;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0.0001, now + dur);
    this.gain.gain.setValueAtTime(0, now + dur + 0.001);
    this.isActive = false;
  }

  /** Stop oscillator and disconnect all nodes. */
  destroy() {
    try { this.osc.stop(); } catch (e) {}
    this.osc.disconnect();
    this.filter.disconnect();
    this.gain.disconnect();
  }
}

// ---------------------------------------------------------------------------
// VoicePool — manages chord (3 voices) + melody (1 voice) + held drones
// ---------------------------------------------------------------------------

const MAX_HELD_CHORDS = 4;
const MAX_HELD_MELODIES = 4;

class VoicePool {
  constructor(ac) {
    this.ac = ac;
    this.masterGain = null;
    this.chordVoices = [];
    this.melodyVoice = null;
    this.heldChords = [];   // { voices: [SynthVoice x3] }
    this.heldMelodies = []; // { voice: SynthVoice }
  }

  /** Create all voices and connect to master output. */
  init() {
    this.masterGain = this.ac.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.ac.destination);

    // 3 chord voices — soft triangle pad
    for (let i = 0; i < 3; i++) {
      this.chordVoices.push(
        new SynthVoice(this.ac, this.masterGain, {
          waveform: 'triangle',
          filterFreq: 800,
          maxGain: 0.12,
        })
      );
    }

    // 1 melody voice — brighter sawtooth lead
    this.melodyVoice = new SynthVoice(this.ac, this.masterGain, {
      waveform: 'sawtooth',
      filterFreq: 1400,
      maxGain: 0.18,
    });
  }

  /** Set frequencies for all 3 chord voices. */
  setChord(rootHz, thirdHz, fifthHz) {
    this.chordVoices[0].setFrequency(rootHz);
    this.chordVoices[1].setFrequency(thirdHz);
    this.chordVoices[2].setFrequency(fifthHz);
  }

  /** Set frequency for the melody voice. */
  setMelody(freqHz) {
    this.melodyVoice.setFrequency(freqHz);
  }

  /** Set filter cutoff on all chord voices. */
  setChordFilter(cutoff) {
    for (const v of this.chordVoices) {
      v.setFilterCutoff(cutoff);
    }
  }

  /** Set filter cutoff on the melody voice. */
  setMelodyFilter(cutoff) {
    this.melodyVoice.setFilterCutoff(cutoff);
  }

  /** Fade in all chord voices. */
  fadeInChord() {
    for (const v of this.chordVoices) {
      v.fadeIn(80);
    }
  }

  /** Fade out all chord voices. */
  fadeOutChord() {
    for (const v of this.chordVoices) {
      v.fadeOut(200);
    }
  }

  /** Fade in melody voice. */
  fadeInMelody() {
    this.melodyVoice.fadeIn(80);
  }

  /** Fade out melody voice. */
  fadeOutMelody() {
    this.melodyVoice.fadeOut(200);
  }

  // ---- Held voices (persistent drones from fist-stamp) ----

  /** Spawn 3 held chord voices that drone at the given frequencies. */
  spawnHeldChord(rootHz, thirdHz, fifthHz, filterCutoff) {
    // Evict oldest if at cap
    if (this.heldChords.length >= MAX_HELD_CHORDS) {
      const oldest = this.heldChords.shift();
      for (const v of oldest.voices) {
        v.fadeOut(200);
        setTimeout(() => v.destroy(), 300);
      }
    }

    const freqs = [rootHz, thirdHz, fifthHz];
    const voices = freqs.map((freq) => {
      const v = new SynthVoice(this.ac, this.masterGain, {
        waveform: 'triangle',
        filterFreq: filterCutoff,
        maxGain: 0.08,
      });
      v.setFrequency(freq);
      v.fadeIn(80);
      return v;
    });

    this.heldChords.push({ voices });
  }

  /** Spawn 1 held melody voice that drones at the given frequency. */
  spawnHeldMelody(freqHz, filterCutoff) {
    if (this.heldMelodies.length >= MAX_HELD_MELODIES) {
      const oldest = this.heldMelodies.shift();
      oldest.voice.fadeOut(200);
      setTimeout(() => oldest.voice.destroy(), 300);
    }

    const voice = new SynthVoice(this.ac, this.masterGain, {
      waveform: 'sawtooth',
      filterFreq: filterCutoff,
      maxGain: 0.12,
    });
    voice.setFrequency(freqHz);
    voice.fadeIn(80);

    this.heldMelodies.push({ voice });
  }

  /** Remove a single held chord by index. */
  removeHeldChord(index) {
    if (index < 0 || index >= this.heldChords.length) return;
    const entry = this.heldChords.splice(index, 1)[0];
    for (const v of entry.voices) {
      v.fadeOut(200);
      setTimeout(() => v.destroy(), 300);
    }
  }

  /** Remove a single held melody by index. */
  removeHeldMelody(index) {
    if (index < 0 || index >= this.heldMelodies.length) return;
    const entry = this.heldMelodies.splice(index, 1)[0];
    entry.voice.fadeOut(200);
    setTimeout(() => entry.voice.destroy(), 300);
  }

  /** Fade out and destroy all held voices. */
  clearHeldNotes() {
    for (const entry of this.heldChords) {
      for (const v of entry.voices) {
        v.fadeOut(200);
        setTimeout(() => v.destroy(), 300);
      }
    }
    for (const entry of this.heldMelodies) {
      entry.voice.fadeOut(200);
      setTimeout(() => entry.voice.destroy(), 300);
    }
    this.heldChords = [];
    this.heldMelodies = [];
  }

  /** Destroy all voices and disconnect master gain. */
  destroy() {
    for (const v of this.chordVoices) v.destroy();
    if (this.melodyVoice) this.melodyVoice.destroy();
    // Destroy held voices immediately (no fade — we're shutting down)
    for (const entry of this.heldChords) {
      for (const v of entry.voices) v.destroy();
    }
    for (const entry of this.heldMelodies) {
      entry.voice.destroy();
    }
    if (this.masterGain) this.masterGain.disconnect();
    this.chordVoices = [];
    this.melodyVoice = null;
    this.heldChords = [];
    this.heldMelodies = [];
    this.masterGain = null;
  }
}

// ---------------------------------------------------------------------------
// Expose globally
// ---------------------------------------------------------------------------

window.SynthVoice = SynthVoice;
window.VoicePool = VoicePool;
window.NOTE_FREQ = NOTE_FREQ;
