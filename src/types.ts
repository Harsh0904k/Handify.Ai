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
  secondaryFontFamily?: string;
  isCombinedFont?: boolean;
  isRealistic?: boolean;
  isCharVariance?: boolean;
}

export const HANDWRITING_FONTS = [
  { name: 'Cursive 2', value: 'cursive_2' },
  { name: 'Cursive 3', value: 'cursive_3' },
  { name: 'Cursive Real', value: 'cursive_real' },
  { name: 'GH Hughes', value: 'gh_hughes' },
  { name: 'Handwritten', value: 'handwritten' },
  { name: 'JER', value: 'jer' },
  { name: 'Kevin Knowles', value: 'kevin_knowles' },
  { name: 'Philip Bean', value: 'philip_bean' },
  { name: 'Royston Such CAP', value: 'royston_such_cap' },
  { name: 'cursive real 2', value: 'cursive_real_2' },
  { name: 'cursive real 3', value: 'cursive_real_3' },
];

export const INK_COLORS = [
  { name: 'Blue Ink', value: '#0033cc' },
  { name: 'Deep Blue', value: '#000066' },
  { name: 'Black Ink', value: '#1a1a1a' },
  { name: 'Red Ink', value: '#cc0000' },
  { name: 'Pencil Gray', value: '#4d4d4d' },
];

export const PAGE_BACKGROUNDS = [
  { name: 'Natural Paper', value: '/20260328_235536.jpg' },
  { name: 'Classic White', value: '/20260329_012336.jpg' },
];
