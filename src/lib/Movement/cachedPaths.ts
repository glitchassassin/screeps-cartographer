import { MoveOpts, MoveTarget } from '../';
import { config } from '../../config';
import { CachingStrategy, PositionListSerializer } from '../CachingStrategies';
import { HeapCache } from '../CachingStrategies/Heap';
import { MemoryCache } from '../CachingStrategies/Memory';
import { creepKey } from '../Keys/Creep';
import { generatePath } from './generatePath';
import { move } from './move';
import { normalizeTargets } from './selectors';

const cachedPathKey = (key: string) => `_poi_${key}`;
const keys = {
  MOVE_BY_PATH_INDEX: '_cpi'
};

/**
 * Generate a path from `origin` to `destination`, based on the passed `opts`. Caches
 * the path in the configured cache (or MemoryCache by default) with the provided key.
 * Returns the generated path (or the cached version, if it exists).
 */
export function cachePath(
  key: string,
  origin: RoomPosition,
  targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[],
  opts?: MoveOpts
) {
  const actualOpts = {
    ...config.DEFAULT_MOVE_OPTS,
    ...opts
  };

  const cache = actualOpts.cache ?? MemoryCache;

  const normalizedTargets = normalizeTargets(targets, opts?.keepTargetInRoom);

  if (opts?.visualizePathStyle) {
    const style = {
      ...config.DEFAULT_VISUALIZE_OPTS,
      ...opts.visualizePathStyle
    };
    for (const t of normalizedTargets) {
      new RoomVisual(t.pos.roomName).rect(
        t.pos.x - t.range - 0.5,
        t.pos.y - t.range - 0.5,
        t.range * 2 + 1,
        t.range * 2 + 1,
        style
      );
    }
  }

  // check if cached POI already exists
  const cached = cache.with(PositionListSerializer).get(cachedPathKey(key));
  if (cached) {
    return cached;
  }

  // create paths
  const path = generatePath(origin, normalizedTargets, {
    ...actualOpts
  });
  if (path) {
    const expiration = actualOpts.reusePath ? Game.time + actualOpts.reusePath + 1 : undefined;
    cache.with(PositionListSerializer).set(cachedPathKey(key), path, expiration);
  }
  return path;
}

/**
 * Gets a cached path for a given key
 */
export function getCachedPath(key: string, opts?: { cache?: CachingStrategy }) {
  const cache = opts?.cache ?? MemoryCache;
  return cache.with(PositionListSerializer).get(cachedPathKey(key));
}

/**
 * Clears a cached path for a given key
 */
export function resetCachedPath(key: string, opts?: { cache?: CachingStrategy }) {
  const cache = opts?.cache ?? MemoryCache;
  cache.delete(cachedPathKey(key));
}

export interface MoveByCachedPathOpts extends MoveOpts {
  reverse?: boolean;
}

/**
 * Moves a creep along a cached path. If `opts.reverse`, moves it backwards.
 * Returns ERR_NO_PATH if the cached path doesn't exist, and ERR_NOT_FOUND if
 * the creep is not on the path. In most cases, you'll want to use `moveByPath`
 * instead; this is used internally by `moveTo`.
 */
export function followPath(creep: Creep | PowerCreep, key: string, opts?: MoveByCachedPathOpts) {
  const cache = opts?.cache ?? MemoryCache;
  const path = cache.with(PositionListSerializer).get(cachedPathKey(key));

  // unspawned power creeps have undefined pos
  if (!creep.pos) return ERR_INVALID_ARGS;
  if (!path) return ERR_NO_PATH;

  // check if move is done
  if (
    (opts?.reverse && creep.pos.isEqualTo(path[0])) ||
    (!opts?.reverse && creep.pos.isEqualTo(path[path.length - 1]))
  ) {
    return OK;
  }

  // check if creep's position is up to date
  let currentIndex = HeapCache.get(creepKey(creep, keys.MOVE_BY_PATH_INDEX));
  if (currentIndex !== undefined) {
    let nextIndex = Math.max(0, Math.min(path.length - 1, opts?.reverse ? currentIndex - 1 : currentIndex + 1));
    if (path[nextIndex]?.isEqualTo(creep.pos)) {
      currentIndex = nextIndex;
    } else if (!path[currentIndex]?.isEqualTo(creep.pos)) {
      currentIndex = undefined; // not at the next position, not at the cached position - reorient
    }
  }
  if (currentIndex === undefined) {
    // don't know where creep is; check if it's on the path
    const index = path.findIndex(p => p.isEqualTo(creep.pos));
    if (index !== -1) {
      currentIndex = index;
    }
  }
  // otherwise, check if it's adjacent to one end of the path
  if (currentIndex === undefined && !opts?.reverse && path[0].inRangeTo(creep, 1)) {
    currentIndex = -1;
  }
  if (currentIndex === undefined && opts?.reverse && path[path.length - 1].inRangeTo(creep, 1)) {
    currentIndex = path.length;
  }
  if (currentIndex === undefined) {
    // Unable to find our location relative to the path
    return ERR_NOT_FOUND;
  }
  HeapCache.set(creepKey(creep, keys.MOVE_BY_PATH_INDEX), currentIndex);

  // creep is on the path and index is valid
  let nextIndex = Math.max(0, Math.min(path.length - 1, opts?.reverse ? currentIndex - 1 : currentIndex + 1));

  // visualize path
  if (opts?.visualizePathStyle) {
    const style = {
      ...config.DEFAULT_VISUALIZE_OPTS,
      ...opts.visualizePathStyle
    };
    const pathSegment = opts?.reverse ? path.slice(0, currentIndex) : path.slice(nextIndex);
    // TODO - Should power creep's room prop be optional?
    creep.room?.visual.poly(
      pathSegment.filter(pos => pos.roomName === creep.room?.name),
      style
    );
  }

  const result = move(creep, [path[nextIndex]], opts?.priority);

  return result;
}
