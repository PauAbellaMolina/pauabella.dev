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
// VoicePool — manages chord (3 voices) + melody (1 voice)
// ---------------------------------------------------------------------------

class VoicePool {
  constructor(ac) {
    this.ac = ac;
    this.masterGain = null;
    this.chordVoices = [];
    this.melodyVoice = null;
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

  /** Destroy all voices and disconnect master gain. */
  destroy() {
    for (const v of this.chordVoices) v.destroy();
    if (this.melodyVoice) this.melodyVoice.destroy();
    if (this.masterGain) this.masterGain.disconnect();
    this.chordVoices = [];
    this.melodyVoice = null;
    this.masterGain = null;
  }
}

// ---------------------------------------------------------------------------
// Expose globally
// ---------------------------------------------------------------------------

window.SynthVoice = SynthVoice;
window.VoicePool = VoicePool;
window.NOTE_FREQ = NOTE_FREQ;
