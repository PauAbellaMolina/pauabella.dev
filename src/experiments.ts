import type { Experiment } from './types';

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
    id: 'hello-world',
    title: 'Hello World',
    description: 'A simple sample experiment to test the system',
    path: '/experiments/hello-world/index.html',
    displayMode: 'modal',
    thumbnail: null,
  },
  {
    id: 'click-game',
    title: 'Click the Target',
    description: 'A fast-paced clicking game - hit as many targets as you can!',
    path: '/experiments/click-game/index.html',
    displayMode: 'fullscreen',
    thumbnail: null,
  },
  {
    id: 'color-match',
    title: "Don't Match!",
    description: 'A color name appears — tap any color except the one it says. How many rounds can you survive?',
    path: '/experiments/color-match/index.html',
    displayMode: 'fullscreen',
    thumbnail: null,
  },
];

export default experiments;
