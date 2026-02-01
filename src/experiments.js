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

const experiments = [
  {
    id: 'hello-world',
    title: 'Hello World',
    description: 'A simple sample experiment to test the system',
    path: '/experiments/hello-world/index.html',
    displayMode: 'modal',
    thumbnail: null,
  },
];

export default experiments;
