import { config } from 'config';
import { HeapCache } from 'lib/CachingStrategies/Heap';
import { creepKey } from 'lib/Keys';
import { pathHasAvoidTargets } from 'lib/WorldMap/pathHasAvoidTargets';
import { slicedPath } from 'lib/WorldMap/selectors';
import { followPath, getCachedPath, MoveByCachedPathOpts } from './cachedPaths';
import { creepIsStuck } from './creepIsStuck';
import { moveTo } from './moveTo';
import { quickPathSearch } from '../Utils/quickPathSearch';

const keys = {
  MOVE_BY_PATH_INDEX: '_cpi',
  REROUTE_PATH_INDEX: '_rsi'
};

/**
 * Moves a creep along a cached path. If `opts.reverse`, moves it backwards.
 * If the creep isn't already on the path, it moves to the path first. Returns
 * ERR_NO_PATH if the cached path doesn't exist.
 */
export function moveByPath(creep: Creep | PowerCreep, key: string, opts?: MoveByCachedPathOpts) {
  const repath = opts?.repathIfStuck ?? config.DEFAULT_MOVE_OPTS.repathIfStuck;
  const avoidTargets = (opts?.avoidTargets ?? config.DEFAULT_MOVE_OPTS.avoidTargets)?.(creep.pos.roomName) ?? [];
  let rerouteIndex = HeapCache.get(creepKey(creep, keys.REROUTE_PATH_INDEX)) as number | undefined;
  const cachedPath = getCachedPath(key, opts);

  // check if creep has made it back to the path
  if ((repath || avoidTargets.length) && rerouteIndex !== undefined) {
    let currentIndex = cachedPath ? quickPathSearch(creep.pos, cachedPath) : undefined;
    if (currentIndex === -1) currentIndex = undefined;
    if (currentIndex !== undefined && (opts?.reverse ? currentIndex <= rerouteIndex : currentIndex >= rerouteIndex)) {
      // creep is no longer stuck
      HeapCache.delete(creepKey(creep, keys.REROUTE_PATH_INDEX));
      rerouteIndex = undefined;
    }
  }

  // Try to follow path, if not stuck
  let result: ReturnType<typeof followPath> = ERR_NOT_FOUND;
  if (rerouteIndex === undefined) {
    result = followPath(creep, key, opts);
  }

  if (result !== ERR_NOT_FOUND) {
    const creepIndex = HeapCache.get(creepKey(creep, keys.MOVE_BY_PATH_INDEX)) as number | undefined;
    // check if creep has gotten stuck or path ahead is dangerous
    if ((repath && creepIsStuck(creep, repath)) || cachedPath && pathHasAvoidTargets(slicedPath(cachedPath, creepIndex ?? 0, opts?.reverse), avoidTargets)) {
      // creep is stuck on the path
      if (creepIndex !== undefined) {
        if (opts?.reverse) {
          rerouteIndex = creepIndex - 1;
        } else {
          rerouteIndex = creepIndex + 2;
        }
        HeapCache.set(creepKey(creep, keys.REROUTE_PATH_INDEX), rerouteIndex);
      }
    } else {
      // on the path, not stuck: success!
      return result;
    }
  }

  // off the path or stuck - use moveTo instead
  let path = getCachedPath(key, opts);
  if (!path) return ERR_NO_PATH;
  if (rerouteIndex !== undefined) {
    // creep is stuck, so move to the next stretch of the path
    path = slicedPath(path, rerouteIndex, opts?.reverse);
  }
  if (path.length === 0) return ERR_NO_PATH;
  // need to move to the path
  return moveTo(creep, path, opts);
}
