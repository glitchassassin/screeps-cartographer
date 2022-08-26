import { config } from 'config';
import { MoveTarget } from 'lib';
import { CachingStrategy, PositionListSerializer } from 'lib/CachingStrategies';
import { HeapCache } from 'lib/CachingStrategies/Heap';
import { MemoryCache } from 'lib/CachingStrategies/Memory';
import { creepKey } from 'lib/Keys/Creep';
import { generatePath, GeneratePathOpts } from './generatePath';
import { moveTo } from './moveTo';
import { normalizeTargets } from './selectors';

export interface CachePOIOpts extends GeneratePathOpts {
  extraRoutes?: number;
  cache?: CachingStrategy;
}

const poiKey = (key: string, index: number) => `_poi${index}_${key}`;
const keys = {
  MOVE_BY_PATH_INDEX: '_cpi'
};

/**
 *
 * @param key A string to look up the cached path(s) later (used by getCachedPaths, moveByCachedPath, etc.)
 * @param origin The origin of the path
 * @param destination A
 * @param opts
 * @returns
 */
export function cachePaths(
  key: string,
  origin: RoomPosition,
  targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[],
  opts?: CachePOIOpts
) {
  const actualOpts = {
    ...config.DEFAULT_POI_OPTS,
    ...opts
  };

  const cache = actualOpts.cache ?? MemoryCache;

  const normalizedTargets = normalizeTargets(targets);

  // check if cached POI already exists
  if (cache.get(poiKey(key, 0))) {
    return OK;
  }

  // create paths
  let paths = 0;
  const blocked = new Map<string, RoomPosition[]>();
  const routeCount = 1 + (opts?.extraRoutes ?? config.DEFAULT_POI_OPTS.extraRoutes);
  for (let i = 0; i < routeCount; i++) {
    const path = generatePath(origin, normalizedTargets, {
      ...actualOpts,
      roomCallback(room) {
        let cm = opts?.roomCallback?.(room);
        if (cm === false) return cm;
        const cloned = cm instanceof PathFinder.CostMatrix ? cm.clone() : new PathFinder.CostMatrix();
        blocked.get(room)?.forEach(p => cloned.set(p.x, p.y, 0xff));
        return cloned;
      }
    });
    path?.forEach(pos => {
      const map = blocked.get(pos.roomName) ?? [];
      blocked.set(pos.roomName, map);
      map.push(pos);
    });
    if (path) {
      paths += 1;
      cache.with(PositionListSerializer).set(poiKey(key, i), path);
    } else {
      break;
    }
  }

  if (paths < routeCount)
    console.log(`[Cartographer] ${key} POI pathing failed, generated ${paths}/${routeCount} paths`);
}

export function getCachedPaths(key: string, opts?: { cache?: CachingStrategy }) {
  const cache = opts?.cache ?? MemoryCache;
  let i = 0;
  let path;
  const paths = [];
  do {
    path = cache.with(PositionListSerializer).get(poiKey(key, i));
    if (path) paths.push(path);
    i += 1;
  } while (path);
  return paths;
}

export function resetCachedPaths(key: string, opts?: { cache?: CachingStrategy }) {
  const cache = opts?.cache ?? MemoryCache;
  let i = 0;
  while (cache.get(poiKey(key, i))) {
    cache.delete(poiKey(key, i));
    i += 1;
  }
}

export interface MoveByCachedPathOpts {
  reverse?: boolean;
  index?: number;
  cache?: CachingStrategy;
}
export function moveByCachedPath(creep: Creep, key: string, opts?: MoveByCachedPathOpts) {
  const cache = opts?.cache ?? MemoryCache;
  const cachedPath = cache.with(PositionListSerializer).get(poiKey(key, opts?.index ?? 0));
  if (!cachedPath) return ERR_NOT_FOUND;

  return moveByPath(creep, cachedPath, opts?.reverse);
}

export function moveByPath(creep: Creep, path: RoomPosition[], reverse = false) {
  // check if move is done
  if ((reverse && creep.pos.isEqualTo(path[0])) || (!reverse && creep.pos.isEqualTo(path[path.length - 1]))) {
    return OK;
  }

  // check if creep's position is up to date
  let currentIndex = HeapCache.get(creepKey(creep, keys.MOVE_BY_PATH_INDEX));
  if (currentIndex !== undefined) {
    let nextIndex = Math.max(0, Math.min(path.length - 1, reverse ? currentIndex - 1 : currentIndex + 1));
    if (path[nextIndex]?.isEqualTo(creep.pos)) {
      currentIndex = nextIndex;
    } else if (!path[currentIndex]?.isEqualTo(creep.pos)) {
      currentIndex = undefined; // not at the next position, not at the cached position - reorient
    }
  }
  if (currentIndex === undefined) {
    // don't know where creep is; check if it's on the path
    currentIndex = path.findIndex(p => p.isEqualTo(creep.pos));
    if (currentIndex !== -1) {
      HeapCache.set(creepKey(creep, keys.MOVE_BY_PATH_INDEX), currentIndex);
    } else {
      // not on the path, so go there first
      return moveTo(creep, path);
    }
  }

  // creep is on the path and index is valid
  let nextIndex = Math.max(0, Math.min(path.length - 1, reverse ? currentIndex - 1 : currentIndex + 1));

  const result = creep.move(creep.pos.getDirectionTo(path[nextIndex]));

  return result;
}
