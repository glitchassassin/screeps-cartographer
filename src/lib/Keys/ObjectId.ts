import { Codec } from '../../utils/screeps-utf15';

/**
 * 15 bits will be enough for three hex characters
 */
const codec = new Codec({ array: false, depth: 15 });

/**
 * Derives a cache key namespaced to a particular object. `id` should be a hex string
 */
export const objectIdKey = (id: string, key?: string) => {
  if (!id || !id.length) throw new Error('Empty id');
  let paddedId = id;
  // pad id if needed
  if (paddedId.length % 3 !== 0) {
    paddedId = paddedId.padStart(Math.ceil(paddedId.length / 3) * 3, '0');
  }
  // split and compress id
  let compressed = '';
  for (let i = 0; i < paddedId.length; i += 3) {
    compressed += codec.encode(parseInt(paddedId.slice(i, i + 3), 16));
  }
  return compressed + key ?? '';
};
