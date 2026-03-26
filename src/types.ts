export interface Point {
  x: number;
  y: number;
}

export interface Boundary {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TextBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
  rotation: number;
  width: number;
  lineHeight?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  opacity?: number;
  align?: 'left' | 'center' | 'right';
}

export const HANDWRITING_FONTS = [
  { name: 'Caveat', value: 'Caveat' },
  { name: 'Dancing Script', value: 'Dancing Script' },
  { name: 'Indie Flower', value: 'Indie Flower' },
  { name: 'Patrick Hand', value: 'Patrick Hand' },
  { name: 'Shadows Into Light', value: 'Shadows Into Light' },
  { name: 'Cursive 2', value: 'Cursive 2' },
  { name: 'Cursive 3', value: 'Cursive 3' },
  { name: 'Cursive Real', value: 'Cursive Real' },
  { name: 'GH Hughes', value: 'GH Hughes' },
  { name: 'Hindi Type', value: 'Hindi Type' },
];

export const INK_COLORS = [
  { name: 'Blue Ink', value: '#0033cc' },
  { name: 'Deep Blue', value: '#000066' },
  { name: 'Black Ink', value: '#1a1a1a' },
  { name: 'Red Ink', value: '#cc0000' },
  { name: 'Pencil Gray', value: '#4d4d4d' },
];
