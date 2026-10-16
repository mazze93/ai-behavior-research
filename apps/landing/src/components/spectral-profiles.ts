export type StudyId = 'overview' | 'identity-dissolution' | 'persona-integrity';
export type Point = readonly [number, number];
export type Contours = readonly (readonly Point[])[];

export interface SpectralProfile {
  label: string;
  title: string;
  caption: string;
  description: string;
  colors: readonly string[];
}

const cyan = 'var(--chromatic-cyan)', blue = 'var(--chromatic-blue)';
const pink = 'var(--chromatic-pink)', coral = 'var(--chromatic-coral)';
const yellow = 'var(--chromatic-yellow)';

export const profiles: Record<StudyId, SpectralProfile> = {
  overview: {
    label: 'Index / Chromatic fold',
    title: 'A folded field of spectral contours',
    caption: 'A little interference.',
    description: 'An original folded optical form in a full spectrum of color.',
    colors: [cyan, blue, pink, coral, yellow, cyan],
  },
  'identity-dissolution': {
    label: '01 / Identity Dissolution',
    title: 'Identity Dissolution — a dispersing ribbon',
    caption: 'A pattern comes apart.',
    description: 'Cool spectral strands stretch, ripple and separate into an open-looking ribbon.',
    colors: [cyan, blue, cyan, yellow, cyan, blue],
  },
  'persona-integrity': {
    label: '02 / Persona Integrity',
    title: 'Persona Integrity — paired contours',
    caption: 'Two readings. One record.',
    description: 'Warm spectral contours form two interwoven lobes with a shared boundary.',
    colors: [coral, pink, blue, pink, coral, yellow],
  },
};

function geometry(profile: StudyId): Contours {
  return Array.from({ length: 48 }, (_, band) => {
    const depth = band / 47;
    return Array.from({ length: 112 }, (_, point): Point => {
      const angle = point / 111 * Math.PI * 2;
      const radius = 84 + depth * 132;
      if (profile === 'identity-dissolution') return [
        radius * .91 * Math.cos(angle) * (1 + .24 * Math.sin(3 * angle + depth * 2)) + depth * 16 * Math.sin(3 * angle),
        radius * .57 * Math.sin(angle) + depth * 34 * Math.sin(2 * angle + depth * 4),
      ];
      if (profile === 'persona-integrity') return [
        radius * .86 * Math.sin(angle),
        radius * .63 * Math.sin(2 * angle),
      ];
      return [
        radius * Math.cos(angle) * (1 + .15 * Math.sin(3 * angle)),
        radius * Math.sin(angle) * .76 + 40 * Math.cos(2 * angle) * depth,
      ];
    });
  });
}

export const shapes: Record<StudyId, Contours> = {
  overview: geometry('overview'),
  'identity-dissolution': geometry('identity-dissolution'),
  'persona-integrity': geometry('persona-integrity'),
};

export function blend(from: Contours, to: Contours, progress: number): Contours {
  return from.map((band, i) => band.map((point, j): Point => {
    const target = to[i]![j]!;
    return [point[0] + (target[0] - point[0]) * progress,
      point[1] + (target[1] - point[1]) * progress];
  }));
}

export function paths(contours: Contours): string[] {
  return contours.map(band => band.map(([x, y], point) =>
    `${point ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ') + ' Z');
}
