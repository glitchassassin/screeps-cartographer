import { MoveOpts, MoveTarget } from 'lib';
import { CachingStrategy } from 'lib/CachingStrategies';
import { HeapCache } from 'lib/CachingStrategies/Heap';
import { MemoryCache } from 'lib/CachingStrategies/Memory';
import { MoveTargetListSerializer } from 'lib/CachingStrategies/Serializers/MoveTarget';
import { PositionListSerializer } from 'lib/CachingStrategies/Serializers/RoomPosition';
import { mutateCostMatrix } from 'lib/CostMatrixes';
import { creepKey } from 'lib/Keys/Creep';
import { profile } from 'utils/profiler';
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
  CACHED_PATH_TARGETS: '_ct'
};

function clearCachedPath(creep: Creep, cache: CachingStrategy) {
  cache.delete(creepKey(creep, keys.CACHED_PATH));
  cache.delete(creepKey(creep, keys.CACHED_PATH_TARGETS));
}

/**
 *
 * @param creep
 * @param targets
 * @param opts
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

  // select cache for path
  const cache = actualOpts.serializeMemory ? MemoryCache : HeapCache;

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

  const complete = normalizedTargets.some(({ pos, range }) => pos.inRangeTo(creep.pos, range));
  // Check if creep is already at target
  if (complete) {
    return OK;
  }

  // delete cached path if targets don't match
  const targetsDontMatch =
    MoveTargetListSerializer.serialize(normalizedTargets) !== cache.get(creepKey(creep, keys.CACHED_PATH_TARGETS));
  if (targetsDontMatch) {
    clearCachedPath(creep, cache);
  }

  // Check if matching cached path exists
  let cachedPath = profile('deserializing path', () =>
    cache.with(PositionListSerializer).get(creepKey(creep, keys.CACHED_PATH))
  );
  // if not, generate a new one
  if (!cachedPath) {
    cachedPath = profile('generating path', () => generateAndCachePath(creep, normalizedTargets, actualOpts, cache));
    if (cachedPath && !(Array.isArray(targets) || 'range' in targets)) {
      // targets is a RoomPosition or _HasRoomPosition; add the last step back to the path
      const lastStep = 'pos' in targets ? targets.pos : targets;
      cachedPath.push(lastStep);
    }
  }

  if (!cachedPath) return ERR_NO_PATH;

  // remove steps up to the creep's current position and recache with same expiration
  cachedPath.splice(0, cachedPath.findIndex(pos => pos.isEqualTo(creep.pos)) + 1);
  cache
    .with(PositionListSerializer)
    .set(creepKey(creep, keys.CACHED_PATH), cachedPath, cache.expires(creepKey(creep, keys.CACHED_PATH)));

  // visualize path
  if (actualOpts.visualizePathStyle) {
    creep.room.visual.poly(cachedPath, actualOpts.visualizePathStyle);
  }
  return profile('moving by path', () => creep.move(creep.pos.getDirectionTo(cachedPath![0])));
};

function generateAndCachePath(
  creep: Creep,
  targets: MoveTarget[],
  opts: MoveOpts,
  cache: CachingStrategy
): RoomPosition[] | undefined {
  // key to confirm if current path is the same as saved path
  const targetKey = MoveTargetListSerializer.serialize(targets);
  if (!targetKey) return undefined;

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
  cache.set(creepKey(creep, keys.CACHED_PATH_TARGETS), targetKey, expiration);

  return result.path;
}
