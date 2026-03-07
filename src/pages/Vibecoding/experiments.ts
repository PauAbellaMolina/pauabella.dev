export interface Experiment {
  id: string;
  title: string;
  description: string;
  path: string;
  thumbnail: string | null;
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
    id: 'code-synth',
    title: 'codesynth',
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
    id: 'keepers-isle',
    title: "Keeper's Isle",
    description: 'Explore a tiny island as its lighthouse keeper. An isometric world to wander.',
    path: '/experiments/keepers-isle/index.html',
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
