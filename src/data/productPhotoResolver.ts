import photoData from './productPhotos.json' with { type: 'json' };
import type { ProductPhoto } from '../types';

const normalize = (name: string) =>
  name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const mapping = new Map<string, ProductPhoto[]>(
  Object.entries(photoData).map(([name, photos]) => [normalize(name), photos]),
);

// Only exact reviewed product names; never drop strengths or dosage forms to guess a match.
export function findLocalProductPhotos(name: string): ProductPhoto[] | undefined {
  return mapping.get(normalize(name))?.map((photo) => ({ ...photo }));
}
