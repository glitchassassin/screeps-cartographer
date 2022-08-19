import { MoveTarget } from 'lib';
import { packPos, unpackPos } from 'utils/packrat';
import { Codec } from '../../../utils/screeps-utf15';

/**
 * Note: this binds range at 32768, which should be plenty for MoveTarget purposes
 */
const rangeCodec = new Codec({ array: false, depth: 15 });

export const MoveTargetSerializer = {
  serialize(target?: MoveTarget) {
    if (target === undefined) return undefined;
    return `${packPos(target.pos)}${rangeCodec.encode(target.range)}`;
  },
  deserialize(target?: string) {
    if (target === undefined) return undefined;
    return {
      pos: unpackPos(target.slice(0, 2)),
      range: rangeCodec.decode(target.slice(2))
    };
  }
};

/**
 * Move target serializes into three characters: two for position and one for range
 */
export const MoveTargetListSerializer = {
  serialize(target?: MoveTarget[]) {
    if (target === undefined) return undefined;
    return target.map(t => MoveTargetSerializer.serialize(t)).join('');
  },
  deserialize(target?: string) {
    if (target === undefined) return undefined;
    const targets = [];
    for (let i = 0; i < target.length; i += 3) {
      targets.push(MoveTargetSerializer.deserialize(target.slice(i, 3)));
    }
    return targets;
  }
};
