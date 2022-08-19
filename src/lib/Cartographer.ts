import { MoveOpts, MoveTarget } from 'lib';
import { CachingStrategy } from 'lib/CachingStrategies';
import { HeapCache } from 'lib/CachingStrategies/Heap';
import { MemoryCache } from 'lib/CachingStrategies/Memory';
import { MoveTargetListSerializer } from 'lib/CachingStrategies/Serializers/MoveTarget';
import { NumberSerializer } from 'lib/CachingStrategies/Serializers/Number';
import { PositionListSerializer } from 'lib/CachingStrategies/Serializers/RoomPosition';
import { withSerializer } from 'lib/CachingStrategies/withSerializer';
import { creepKey } from 'lib/Keys/Creep';
import { config } from '../config';

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
  cache.delete(creepKey(creep, keys.CACHED_PATH_EXPIRES));
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

  const cache = actualOpts.serializeMemory ? MemoryCache : HeapCache;

  const normalizedTargets = [];
  if (Array.isArray(targets)) {
    if ('pos' in targets[0]) {
      normalizedTargets.push(...(targets as MoveTarget[]));
    } else {
      normalizedTargets.push(...(targets as RoomPosition[]).map(pos => ({ pos, range: 0 })));
    }
  } else if ('pos' in targets) {
    if ('range' in targets) {
      normalizedTargets.push(targets);
    } else {
      normalizedTargets.push({ pos: targets.pos, range: 0 });
    }
  } else {
    normalizedTargets.push({ pos: targets, range: 0 });
  }

  // Check if creep is already at target
  if (normalizedTargets.some(({ pos, range }) => pos.inRangeTo(creep.pos, range))) {
    return OK;
  }

  // delete cached path if expired
  const expires = withSerializer(cache, NumberSerializer).get(creepKey(creep, keys.CACHED_PATH_EXPIRES));
  if (expires && expires <= Game.time) {
    clearCachedPath(creep, cache);
  }

  // delete cached path if targets don't match
  if (MoveTargetListSerializer.serialize(normalizedTargets) !== cache.get(creepKey(creep, keys.CACHED_PATH_TARGETS))) {
    clearCachedPath(creep, cache);
  }

  // Check if matching cached path exists
  let cachedPath = withSerializer(cache, PositionListSerializer).get(creepKey(creep, keys.CACHED_PATH));
  // if not, generate a new one
  cachedPath ??= generateAndCachePath(creep, normalizedTargets, actualOpts, cache);

  if (!cachedPath) return ERR_NO_PATH;

  // remove steps up to the creep's current position
  cachedPath.splice(
    0,
    cachedPath.findIndex(pos => pos.isEqualTo(creep.pos))
  );
  withSerializer(cache, PositionListSerializer).set(creepKey(creep, keys.CACHED_PATH), cachedPath);

  // visualize path
  if (actualOpts.visualizePathStyle) {
    creep.room.visual.poly(cachedPath, actualOpts.visualizePathStyle);
  }
  return creep.moveByPath(cachedPath);
};

function generateAndCachePath(
  creep: Creep,
  targets: MoveTarget[],
  opts: MoveOpts,
  cache: CachingStrategy
): RoomPosition[] | undefined {
  const result = PathFinder.search(creep.pos, targets, opts);

  if (!result.path.length) return undefined;

  withSerializer(cache, PositionListSerializer).set(creepKey(creep, keys.CACHED_PATH), result.path);
  withSerializer(cache, MoveTargetListSerializer).set(creepKey(creep, keys.CACHED_PATH_TARGETS), targets);
  if (opts.reusePath !== undefined)
    withSerializer(cache, NumberSerializer).set(creepKey(creep, keys.CACHED_PATH_EXPIRES), Game.time + opts.reusePath);

  return result.path;
}
