export interface Experiment {
  id: string;
  title: string;
  description: string;
  path: string;
  displayMode: 'modal' | 'fullscreen';
  thumbnail: string | null;
}

/**
 * Experiments Registry
 *
 * Each experiment defines:
 * - id: unique identifier (used in URL for fullscreen mode)
 * - title: display name
 * - description: short description
 * - path: path to the experiment's index.html (relative to public/)
 * - displayMode: 'modal' | 'fullscreen'
 * - thumbnail: optional thumbnail image path
 */

const experiments: Experiment[] = [
  {
    id: 'keepers-isle',
    title: "Keeper's Isle",
    description: 'Explore a tiny island as its lighthouse keeper. An isometric world to wander.',
    path: '/experiments/keepers-isle/index.html',
    displayMode: 'fullscreen',
    thumbnail: null,
  },
  {
    id: 'aviation-rabbit-hole',
    title: 'Aviation Rabbit Hole',
    description: 'Dive into aviation Wikipedia articles and follow the links that fascinate you.',
    path: '/experiments/aviation-rabbit-hole/index.html',
    displayMode: 'fullscreen',
    thumbnail: null,
  },
];

export default experiments;
