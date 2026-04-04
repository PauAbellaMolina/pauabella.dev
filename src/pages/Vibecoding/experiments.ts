export interface Experiment {
  id: string;
  title: string;
  description: string;
  path: string;
  thumbnail: string | null;
  externalUrl?: string;
}

/**
 * Experiments Registry
 *
 * Each experiment defines:
 * - id: unique identifier (used in URL)
 * - title: display name
 * - description: short description
 * - path: path to the experiment's index.html (relative to public/)
 * - thumbnail: optional thumbnail image path
 */

const experiments: Experiment[] = [
  {
    id: 'ttsanything',
    title: 'TTSAnything',
    description: 'Text to speech for any selected text on macOS. Built with Swift.',
    path: '',
    thumbnail: null,
    externalUrl: 'https://github.com/PauAbellaMolina/ttsanything',
  },
  {
    id: 'stampit',
    title: 'StampIt',
    description: 'macOS menu bar screenshot stamper app.',
    path: '',
    thumbnail: null,
    externalUrl: 'https://github.com/PauAbellaMolina/StampIt',
  },
  {
    id: 'outloud',
    title: 'Outloud',
    description: 'Voice summaries for Claude Code responses. Using Haiku + macOS text to speech.',
    path: '',
    thumbnail: null,
    externalUrl: 'https://github.com/PauAbellaMolina/Outloud',
  },
  {
    id: 'handsynth',
    title: 'Handsynth',
    description: 'A hand-driven synthesizer experiment.',
    path: '/experiments/handsynth/index.html',
    thumbnail: null,
  },
  {
    id: 'clawd-hop',
    title: 'Clawd',
    description: 'A color-switching platformer. Only platforms matching your color hold you up.',
    path: '/experiments/clawd-hop/index.html',
    thumbnail: null,
  },
  {
    id: 'code-synth',
    title: 'Codesynth',
    description: 'A live music coding environment. Write patterns in a simple language and hear them play in a loop.',
    path: '/experiments/code-synth/index.html',
    thumbnail: null,
  },
  {
    id: 'photobooth',
    title: 'Photobooth',
    description: 'Strike a pose. Four frames, one strip — printed right in your browser.',
    path: '/experiments/photobooth/index.html',
    thumbnail: null,
  },
  {
    id: 'aviation-rabbit-hole',
    title: 'Aviation Rabbit Hole',
    description: 'Dive into aviation Wikipedia articles and follow the links that fascinate you.',
    path: '/experiments/aviation-rabbit-hole/index.html',
    thumbnail: null,
  },
];

export default experiments;
