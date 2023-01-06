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
  interface PowerCreepMemory {
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
export function clearCachedPath(
  creep: Creep | PowerCreep,
  cache: GenericCachingStrategy<any> = CachingStrategies.HeapCache
) {
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
  creep: Creep | PowerCreep,
  targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[],
  opts?: MoveOpts,
  fallbackOpts: MoveOpts = { avoidCreeps: true }
) => {
  if (DEBUG) logCpuStart();

  // unspawned power creeps have undefined pos
  if (!creep.pos) return ERR_INVALID_ARGS;

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

  // Dynamic choose weight for roads, plains and swamps depending on body.
  // Skip if power creep or any costs has been manually set.
  if (DEBUG) logCpu('getting default plain and swamp costs');
  const manuallyDefinedCosts = opts?.roadCost || opts?.plainCost || opts?.swampCost;
  if ('body' in creep && !manuallyDefinedCosts) {
    const moveParts = creep.body.filter(b => b.type === MOVE).length;
    // If no move parts it can't move, skip and apply defaults to speed this up.
    if (moveParts > 0) {
      const carryParts = creep.body.filter(b => b.type === CARRY).length;
      const otherBodyParts = creep.body.length - moveParts - carryParts;
      const usedCarryParts = carryParts - Math.floor(creep.store.getFreeCapacity() / 50);

      const fatigueFactor = usedCarryParts + otherBodyParts;
      const recoverFactor = moveParts * 2;

      const cost = Math.max(fatigueFactor / recoverFactor, 1);

      // Number of ticks that it takes move over each terrain.
      const roadCost = Math.ceil(cost);
      const plainCost = Math.ceil(cost * 2);
      const swampCost = Math.ceil(cost * 10);

      // Greatest common divisor.
      // https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/gcd.md
      const gcd = (...arr: number[]) => {
        const _gcd = (x: number, y: number): number => (!y ? x : gcd(y, x % y));
        return [...arr].reduce((a, b) => _gcd(a, b));
      };

      // Calculate the greatest common divisor so we can reduce the costs to the smallest numbers possible.
      const norm = gcd(roadCost, plainCost, swampCost);

      // Normalize and set the default costs. This costs are going to be always under the 255 limit.
      // Worst scenario is with 49 not move body parts and only 1 move part. This means a cost of 24.5,
      // implying 25 / 49 / 245 costs for each terrain.
      actualOpts.roadCost ??= roadCost / norm;
      actualOpts.plainCost ??= plainCost / norm;
      actualOpts.swampCost ??= plainCost / norm;
    }
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

  if (!path) return ERR_NO_PATH;

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
