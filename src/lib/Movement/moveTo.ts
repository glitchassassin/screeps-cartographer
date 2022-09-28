import { MoveOpts, MoveTarget } from '..';
import { logCpu, logCpuStart } from '../../utils/logCpu';
import { CachingStrategies, GenericCachingStrategy, MoveTargetListSerializer } from '../CachingStrategies';
import { JsonSerializer } from '../CachingStrategies/Serializers/Json';
import { creepKey } from '../Keys/Creep';
// import { logCpu, logCpuStart } from '../../utils/logCpu';
import { config } from '../../config';
import { cachePath, followPath, getCachedPath, resetCachedPath } from './cachedPaths';
import { creepIsStuck } from './creepIsStuck';
import { move } from './move';
import { adjacentWalkablePositions, normalizeTargets } from './selectors';

const DEBUG = false;

declare global {
  interface CreepMemory {
    _cmvp?: string;
    _cmvt?: string;
  }
}

const keys = {
  CACHED_PATH: '_cp',
  CACHED_PATH_EXPIRES: '_ce',
  CACHED_PATH_TARGETS: '_ct',
  CACHED_PATH_OPTS: '_co'
};

const optCacheFields: (keyof MoveOpts)[] = [
  'avoidCreeps',
  'avoidObstacleStructures',
  'flee',
  'plainCost',
  'swampCost',
  'roadCost'
];

/**
 * Clears all data for a cached path (useful to force a repath)
 */
export function clearCachedPath(creep: Creep, cache: GenericCachingStrategy<any> = CachingStrategies.HeapCache) {
  resetCachedPath(creepKey(creep, keys.CACHED_PATH), { cache });
  cache.delete(creepKey(creep, keys.CACHED_PATH_TARGETS));
  cache.delete(creepKey(creep, keys.CACHED_PATH_OPTS));
}

/**
 * Replacement for the builtin moveTo, but passes through options to PathFinder. Supports
 * multiple targets, flee, etc. See `MoveOpts`.
 *
 * If fallbackOpts is specified, the options will override `opts` *only* if `repathIfStuck`
 * triggers a repath. This lets you ignore creeps until a creep gets stuck, then repath around
 * them, for example.
 */
export const moveTo = (
  creep: Creep,
  targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[],
  opts?: MoveOpts,
  fallbackOpts: MoveOpts = { avoidCreeps: true }
) => {
  if (DEBUG) logCpuStart();
  // map defaults onto opts
  let actualOpts: MoveOpts = {
    ...config.DEFAULT_MOVE_OPTS,
    ...opts
  };

  if (DEBUG) logCpu('mapping opts');

  // select cache for path
  const cache = opts?.cache ?? CachingStrategies.HeapCache;

  // convert target from whatever format to MoveTarget[]
  let normalizedTargets: MoveTarget[] = normalizeTargets(targets, actualOpts.keepTargetInRoom);

  if (DEBUG) logCpu('normalizing targets');

  // if relevant opts have changed, clear cached path
  const cachedOpts = cache.with(JsonSerializer).get(creepKey(creep, keys.CACHED_PATH_OPTS));
  if (!cachedOpts || optCacheFields.some(f => actualOpts[f as keyof MoveOpts] !== cachedOpts[f])) {
    clearCachedPath(creep, cache);
  }

  if (DEBUG) logCpu('checking opts');

  let needToFlee = false;
  let cachedTargets = cache.with(MoveTargetListSerializer).get(creepKey(creep, keys.CACHED_PATH_TARGETS));
  for (const { pos, range } of normalizedTargets) {
    // check if movement is complete
    if (!needToFlee && pos.inRangeTo(creep.pos, range) && creep.pos.roomName === pos.roomName) {
      if (!opts?.flee) {
        // no need to move, path complete
        clearCachedPath(creep, cache);
        // register move intent to stay here or in an adjacent viable position
        move(
          creep,
          [
            creep.pos,
            ...adjacentWalkablePositions(creep.pos, true).filter(p =>
              normalizedTargets.some(t => t.pos.inRangeTo(p, t.range))
            )
          ],
          actualOpts.priority
        );
        return OK;
      } else {
        needToFlee = true; // need to move, still in range of flee targets
      }
    }
    // check if cached targets are the same
    if (cachedTargets && !cachedTargets.some(t => t && pos.isEqualTo(t.pos) && range === t.range)) {
      // cached path had different targets
      clearCachedPath(creep, cache);
      cachedTargets = undefined;
    }
  }

  if (DEBUG) logCpu('checking targets');

  // cache opts
  const expiration = actualOpts.reusePath ? Game.time + actualOpts.reusePath + 1 : undefined;
  cache.with(MoveTargetListSerializer).set(creepKey(creep, keys.CACHED_PATH_TARGETS), normalizedTargets, expiration);
  cache.with(JsonSerializer).set(
    creepKey(creep, keys.CACHED_PATH_OPTS),
    optCacheFields.reduce((sum, f) => {
      sum[f] = actualOpts[f] as any;
      return sum;
    }, {} as MoveOpts),
    expiration
  );

  // If creep is stuck, we need to repath
  let repathed = false;
  if (
    actualOpts.repathIfStuck &&
    getCachedPath(creepKey(creep, keys.CACHED_PATH), { cache }) &&
    creepIsStuck(creep, actualOpts.repathIfStuck)
  ) {
    resetCachedPath(creepKey(creep, keys.CACHED_PATH), { cache });
    actualOpts = {
      ...actualOpts,
      ...fallbackOpts
    };
    if (creep.name.startsWith('TestStuck')) repathed = true;
  }

  if (DEBUG) logCpu('checking if creep is stuck');

  // generate cached path, if needed
  const path = cachePath(creepKey(creep, keys.CACHED_PATH), creep.pos, normalizedTargets, { ...actualOpts, cache });

  if (DEBUG) logCpu('generating cached path');

  // move to any viable target square, if path is nearly done
  if (path && path[path.length - 2]?.isEqualTo(creep.pos)) {
    // Nearly at end of path
    move(
      creep,
      adjacentWalkablePositions(creep.pos, true).filter(p => normalizedTargets.some(t => t.pos.inRangeTo(p, t.range))),
      actualOpts.priority
    );
    return OK;
  }

  // move by path
  let result = followPath(creep, creepKey(creep, keys.CACHED_PATH), {
    ...actualOpts,
    reverse: false,
    cache
  });
  if (result === ERR_NOT_FOUND) {
    // creep has fallen off path: repath and try again
    clearCachedPath(creep, cache);
    cachePath(creepKey(creep, keys.CACHED_PATH), creep.pos, normalizedTargets, { ...actualOpts, cache });
    result = followPath(creep, creepKey(creep, keys.CACHED_PATH), {
      ...actualOpts,
      reverse: false,
      cache
    });
  }

  if (DEBUG) logCpu('moving by path');

  return result;
};
