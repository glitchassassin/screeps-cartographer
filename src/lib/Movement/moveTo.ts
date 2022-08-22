import { MoveOpts, MoveTarget } from 'lib';
import {
  CachingStrategies,
  CachingStrategy,
  GenericCachingStrategy,
  MoveTargetListSerializer
} from 'lib/CachingStrategies';
import { PositionListSerializer } from 'lib/CachingStrategies/Serializers/RoomPosition';
import { mutateCostMatrix } from 'lib/CostMatrixes';
import { creepKey } from 'lib/Keys/Creep';
// import { logCpu, logCpuStart } from 'utils/logCpu';
import { config } from '../../config';

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

/**
 * Clears all data for a cached path (useful to force a repath)
 */
export function clearCachedPath(creep: Creep, cache: GenericCachingStrategy<any> = CachingStrategies.HeapCache) {
  cache.delete(creepKey(creep, keys.CACHED_PATH));
  cache.delete(creepKey(creep, keys.CACHED_PATH_TARGETS));
  cache.delete(creepKey(creep, keys.CACHED_PATH_OPTS));
}

const serializeOpts = (opts?: MoveOpts) =>
  `${opts?.flee ? 'y' : 'n'}${opts?.avoidCreeps ? 'y' : 'n'}${opts?.avoidObstacleStructures ? 'y' : 'n'}${
    opts?.plainCost ?? '0'
  }${opts?.swampCost ?? '0'}${opts?.roadCost ?? '0'}`;

/**
 * Replacement for the builtin moveTo, but passes through options to PathFinder. Supports
 * multiple targets, flee, etc. See `MoveOpts`.
 */
export const moveTo = (
  creep: Creep,
  targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[],
  opts?: MoveOpts
) => {
  // map defaults onto opts
  const actualOpts: MoveOpts = {
    ...config.DEFAULT_MOVE_OPTS,
    ...opts
  };
  if (opts?.visualizePathStyle) {
    actualOpts.visualizePathStyle = {
      ...config.DEFAULT_VISUALIZE_OPTS,
      ...opts.visualizePathStyle
    };
  }

  // select cache for path
  const cache = actualOpts.cache ?? CachingStrategies.HeapCache;

  // convert target from whatever format to MoveTarget[]
  const normalizedTargets: MoveTarget[] = [];
  if (Array.isArray(targets)) {
    if ('pos' in targets[0]) {
      normalizedTargets.push(...(targets as MoveTarget[]));
    } else {
      normalizedTargets.push(...(targets as RoomPosition[]).map(pos => ({ pos, range: 1 })));
    }
  } else if ('pos' in targets) {
    if ('range' in targets) {
      normalizedTargets.push(targets);
    } else {
      normalizedTargets.push({ pos: targets.pos, range: 1 });
    }
  } else {
    normalizedTargets.push({ pos: targets, range: 1 });
  }

  // if relevant opts have changed, clear cached path
  if (cache.get(creepKey(creep, keys.CACHED_PATH_OPTS)) !== serializeOpts(opts)) {
    clearCachedPath(creep, cache);
  }

  let needToFlee = false;
  let cachedTargets = cache.with(MoveTargetListSerializer).get(creepKey(creep, keys.CACHED_PATH_TARGETS));
  for (const { pos, range } of normalizedTargets) {
    // check if movement is complete
    if (!needToFlee && pos.inRangeTo(creep.pos, range)) {
      if (!opts?.flee) {
        clearCachedPath(creep, cache);
        return OK; // no need to move, path complete
      } else {
        needToFlee = true; // need to move, still in range of flee targets
      }
    }
    // check if cached targets are the same
    if (cachedTargets && !cachedTargets.some(t => t && pos.isEqualTo(t.pos) && range === t.range)) {
      // cached path had different targets
      clearCachedPath(creep, cache);
      cachedTargets = undefined;
      break;
    }
  }

  // Check if matching cached path exists
  let cachedPath = cache.with(PositionListSerializer).get(creepKey(creep, keys.CACHED_PATH));

  // if not, generate a new one
  if (!cachedPath) {
    cachedPath = generateAndCachePath(creep, normalizedTargets, actualOpts, cache);
    if (cachedPath && !(Array.isArray(targets) || 'range' in targets)) {
      // targets is a RoomPosition or _HasRoomPosition; add the last step back to the path
      const lastStep = 'pos' in targets ? targets.pos : targets;
      cachedPath.push(lastStep);
    }
  }

  if (!cachedPath) return ERR_NO_PATH;

  // remove steps up to the creep's current position and recache with same expiration
  const creepIndex = cachedPath.findIndex(pos => pos.isEqualTo(creep.pos));
  cachedPath.splice(0, creepIndex + 1);
  const key = creepKey(creep, keys.CACHED_PATH);
  cache.set(key, cache.get(key).slice(2 * (creepIndex + 1)), cache.expires(key));

  // visualize path
  if (actualOpts.visualizePathStyle) {
    creep.room.visual.poly(cachedPath, actualOpts.visualizePathStyle);
  }
  const result = creep.move(creep.pos.getDirectionTo(cachedPath![0]));

  return result;
};

function generateAndCachePath(
  creep: Creep,
  targets: MoveTarget[],
  opts: MoveOpts,
  cache: CachingStrategy
): RoomPosition[] | undefined {
  // generate path
  const result = PathFinder.search(creep.pos, targets, {
    ...opts,
    roomCallback(room) {
      let cm = opts.roomCallback?.(room);
      if (cm === false) return cm;
      cm = new PathFinder.CostMatrix();
      return mutateCostMatrix(cm.clone(), room, {
        avoidCreeps: opts.avoidCreeps,
        avoidObstacleStructures: opts.avoidObstacleStructures,
        roadCost: opts.roadCost
      });
    }
  });
  if (!result.path.length) return undefined;

  // path generation successful - cache results
  const expiration = opts.reusePath ? Game.time + opts.reusePath + 1 : undefined;
  cache.with(PositionListSerializer).set(creepKey(creep, keys.CACHED_PATH), result.path, expiration);
  cache.with(MoveTargetListSerializer).set(creepKey(creep, keys.CACHED_PATH_TARGETS), targets, expiration);
  cache.set(creepKey(creep, keys.CACHED_PATH_OPTS), serializeOpts(opts), expiration);

  return result.path;
}
