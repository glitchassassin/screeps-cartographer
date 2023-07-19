import { Codec } from 'screeps-utf15';
import { Serializer } from '..';

const numberCodec = new Codec({ array: false });

export const NumberSerializer: Serializer<number> = {
  key: 'ns',
  serialize(target?: number) {
    if (target === undefined) return undefined;
    return numberCodec.encode(target);
  },
  deserialize(target?: string) {
    if (target === undefined) return undefined;
    return numberCodec.decode(target);
  }
};
