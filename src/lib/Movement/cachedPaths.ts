import { config } from 'config';
import { MoveOpts, MoveTarget } from 'lib';
import { CachingStrategy, PositionListSerializer } from 'lib/CachingStrategies';
import { HeapCache } from 'lib/CachingStrategies/Heap';
import { MemoryCache } from 'lib/CachingStrategies/Memory';
import { creepKey } from 'lib/Keys/Creep';
import { generatePath } from './generatePath';
import { normalizeTargets } from './selectors';

const cachedPathKey = (key: string) => `_poi_${key}`;
const keys = {
  MOVE_BY_PATH_INDEX: '_cpi'
};

/**
 *
 * @param key A string to look up the cached path later (used by getCachedPath, moveByCachedPath, etc.)
 * @param origin The origin of the path
 * @param destination A
 * @param opts
 * @returns
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

export function getCachedPath(key: string, opts?: { cache?: CachingStrategy }) {
  const cache = opts?.cache ?? MemoryCache;
  return cache.with(PositionListSerializer).get(cachedPathKey(key));
}

export function resetCachedPath(key: string, opts?: { cache?: CachingStrategy }) {
  const cache = opts?.cache ?? MemoryCache;
  cache.delete(cachedPathKey(key));
}

export interface MoveByCachedPathOpts {
  reverse?: boolean;
  cache?: CachingStrategy;
  visualizePathStyle?: PolyStyle;
}
export function followPath(creep: Creep, key: string, opts?: MoveByCachedPathOpts) {
  const cache = opts?.cache ?? MemoryCache;
  const path = cache.with(PositionListSerializer).get(cachedPathKey(key));
  if (!path) return ERR_NOT_FOUND;

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
      HeapCache.set(creepKey(creep, keys.MOVE_BY_PATH_INDEX), currentIndex);
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
    return ERR_NO_PATH;
  }

  // creep is on the path and index is valid
  let nextIndex = Math.max(0, Math.min(path.length - 1, opts?.reverse ? currentIndex - 1 : currentIndex + 1));

  // visualize path
  if (opts?.visualizePathStyle) {
    const style = {
      ...config.DEFAULT_VISUALIZE_OPTS,
      ...opts.visualizePathStyle
    };
    const pathSegment = opts?.reverse ? path.slice(0, currentIndex) : path.slice(nextIndex);
    creep.room.visual.poly(pathSegment, style);
  }

  const result = creep.move(creep.pos.getDirectionTo(path[nextIndex]));

  return result;
}
