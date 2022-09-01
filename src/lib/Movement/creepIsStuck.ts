import { HeapCache } from 'lib/CachingStrategies/Heap';
import { creepKey } from 'lib/Keys/Creep';

const keys = {
  LAST_POSITION: '_csp',
  LAST_POSITION_TIME: '_cst'
};

/**
 * Tracks a creep's position and returns true if it has no fatigue
 * but has not moved in `stuckLimit` ticks
 */
export const creepIsStuck = (creep: Creep, stuckLimit: number) => {
  if (creep.fatigue > 0) return false;

  // get last position
  const lastPos = HeapCache.get(creepKey(creep, keys.LAST_POSITION));
  const lastTime = HeapCache.get(creepKey(creep, keys.LAST_POSITION_TIME));

  // go ahead and update pos in the cache
  HeapCache.set(creepKey(creep, keys.LAST_POSITION), creep.pos);

  if (!lastPos || !lastTime || !creep.pos.isEqualTo(lastPos)) {
    // start counting
    HeapCache.set(creepKey(creep, keys.LAST_POSITION_TIME), Game.time);
    return false;
  }

  // true if creep has been here (with no fatigue) for longer than Game.time
  return lastTime + stuckLimit > Game.time;
};
