export interface Experiment {
  id: string;
  title: string;
  description: string;
  path: string;
  displayMode: 'modal' | 'fullscreen';
  thumbnail: string | null;
}

export interface ColorPalette {
  text: string;
  background: string;
}
