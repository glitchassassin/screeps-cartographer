import { config } from 'config';
import { HeapCache } from 'lib/CachingStrategies/Heap';
import { creepKey } from 'lib/Keys';
import { followPath, getCachedPath, MoveByCachedPathOpts } from './cachedPaths';
import { creepIsStuck } from './creepIsStuck';
import { moveTo } from './moveTo';

const keys = {
  MOVE_BY_PATH_INDEX: '_cpi',
  REROUTE_STUCK_PATH_INDEX: '_rsi'
};

/**
 * Moves a creep along a cached path. If `opts.reverse`, moves it backwards.
 * If the creep isn't already on the path, it moves to the path first. Returns
 * ERR_NO_PATH if the cached path doesn't exist.
 */
export function moveByPath(creep: Creep | PowerCreep, key: string, opts?: MoveByCachedPathOpts) {
  const repath = opts?.repathIfStuck ?? config.DEFAULT_MOVE_OPTS.repathIfStuck;
  let stuckIndex = HeapCache.get(creepKey(creep, keys.REROUTE_STUCK_PATH_INDEX)) as number | undefined;

  // check if creep is still stuck
  if (repath && stuckIndex !== undefined) {
    let currentIndex = getCachedPath(key, opts)?.findIndex(p => p.isEqualTo(creep.pos));
    if (currentIndex === -1) currentIndex = undefined;
    if (currentIndex !== undefined && (opts?.reverse ? currentIndex <= stuckIndex : currentIndex >= stuckIndex)) {
      // creep is no longer stuck
      HeapCache.delete(creepKey(creep, keys.REROUTE_STUCK_PATH_INDEX));
      stuckIndex = undefined;
    }
  }

  // Try to follow path, if not stuck
  let result: ReturnType<typeof followPath> = ERR_NOT_FOUND;
  if (stuckIndex === undefined) {
    result = followPath(creep, key, opts);
  }

  if (result !== ERR_NOT_FOUND) {
    // check if creep has gotten stuck
    if (repath && creepIsStuck(creep, repath)) {
      const creepIndex = HeapCache.get(creepKey(creep, keys.MOVE_BY_PATH_INDEX)) as number | undefined;
      // creep is stuck on the path
      if (creepIndex !== undefined) {
        if (opts?.reverse) {
          stuckIndex = creepIndex - 1;
        } else {
          stuckIndex = creepIndex + 2;
        }
        HeapCache.set(creepKey(creep, keys.REROUTE_STUCK_PATH_INDEX), stuckIndex);
      }
    } else {
      // on the path, not stuck: success!
      return result;
    }
  }

  // off the path or stuck - use moveTo instead
  let path = getCachedPath(key, opts);
  if (!path) return ERR_NO_PATH;
  if (stuckIndex !== undefined) {
    // creep is stuck, so move to the next stretch of the path
    if (opts?.reverse) {
      path = path.slice(0, stuckIndex);
    } else {
      path = path.slice(stuckIndex);
    }
  }
  if (path.length === 0) return ERR_NO_PATH;
  // need to move to the path
  return moveTo(creep, path, opts);
}
