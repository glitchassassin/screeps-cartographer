import { MoveOpts, MoveTarget } from 'lib';
import {
  CachingStrategies,
  CachingStrategy,
  GenericCachingStrategy,
  MoveTargetListSerializer
} from 'lib/CachingStrategies';
import { JsonSerializer } from 'lib/CachingStrategies/Serializers/Json';
import { PositionListSerializer } from 'lib/CachingStrategies/Serializers/RoomPosition';
import { mutateCostMatrix } from 'lib/CostMatrixes';
import { creepKey } from 'lib/Keys/Creep';
import { logCpu, logCpuStart } from 'utils/logCpu';
import { Coord } from 'utils/packrat';
// import { logCpu, logCpuStart } from 'utils/logCpu';
import { config } from '../../config';
import { creepIsStuck } from './creepIsStuck';

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
  cache.delete(creepKey(creep, keys.CACHED_PATH));
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
  let normalizedTargets: MoveTarget[] = [];
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
  if (actualOpts.keepTargetInRoom) normalizedTargets = normalizedTargets.flatMap(fixEdgePosition);

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
    }
  }

  if (DEBUG) logCpu('checking targets');

  // If creep is stuck, we need to repath
  if (
    actualOpts.repathIfStuck &&
    cache.get(creepKey(creep, keys.CACHED_PATH)) &&
    creepIsStuck(creep, actualOpts.repathIfStuck)
  ) {
    clearCachedPath(creep, cache);
    actualOpts = {
      ...actualOpts,
      ...fallbackOpts
    };
  }

  if (DEBUG) logCpu('checking if creep is stuck');

  // Check if matching cached path exists
  let cachedPath = cache.with(PositionListSerializer).get(creepKey(creep, keys.CACHED_PATH));

  if (DEBUG) logCpu('fetching cached path');

  // if not, generate a new one
  if (!cachedPath) {
    cachedPath = generateAndCachePath(creep, normalizedTargets, actualOpts, cache);
    if (cachedPath && !(Array.isArray(targets) || 'range' in targets)) {
      // targets is a RoomPosition or _HasRoomPosition; add the last step back to the path
      const lastStep = 'pos' in targets ? targets.pos : targets;
      cachedPath.push(lastStep);
    }
    if (DEBUG) logCpu('generating path');
  }

  if (!cachedPath) return ERR_NO_PATH;

  // remove steps up to the creep's current position and recache with same expiration
  const creepIndex = cachedPath.findIndex(pos => pos.isEqualTo(creep.pos));
  cachedPath.splice(0, creepIndex + 1);
  const key = creepKey(creep, keys.CACHED_PATH);
  cache.set(key, cache.get(key).slice(2 * (creepIndex + 1)), cache.expires(key));
  if (DEBUG) logCpu('truncating path');

  // visualize path
  if (actualOpts.visualizePathStyle) {
    const style = {
      ...config.DEFAULT_VISUALIZE_OPTS,
      ...actualOpts.visualizePathStyle
    };
    creep.room.visual.poly(cachedPath, style);
    if (DEBUG) logCpu('visualizing path');
  }

  const result = creep.move(creep.pos.getDirectionTo(cachedPath![0]));
  if (DEBUG) logCpu('moving along path');

  return result;
};

function fixEdgePosition({ pos, range }: MoveTarget): MoveTarget[] {
  if (pos.x > range && 49 - pos.x > range && pos.y > range && 49 - pos.y > range) {
    return [{ pos, range }]; // no action needed
  }
  // generate quadrants
  const rect = {
    x1: Math.max(1, pos.x - range),
    x2: Math.min(48, pos.x + range),
    y1: Math.max(1, pos.y - range),
    y2: Math.min(48, pos.y + range)
  };
  const quadrantRange = Math.ceil((Math.min(rect.x2 - rect.x1, rect.y2 - rect.y1) - 1) / 2);
  const quadrants = [
    { x: rect.x1 + quadrantRange, y: rect.y1 + quadrantRange },
    { x: rect.x1 + quadrantRange, y: rect.y2 - quadrantRange },
    { x: rect.x2 - quadrantRange, y: rect.y2 - quadrantRange },
    { x: rect.x2 - quadrantRange, y: rect.y1 + quadrantRange }
  ]
    .reduce((set, coord) => {
      if (!set.some(c => c.x === coord.x && c.y === coord.y)) set.push(coord);
      return set;
    }, [] as Coord[])
    .map(coord => ({ pos: new RoomPosition(coord.x, coord.y, pos.roomName), range: quadrantRange }));

  return quadrants;
}

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
  cache.with(JsonSerializer).set(
    creepKey(creep, keys.CACHED_PATH_OPTS),
    optCacheFields.reduce((sum, f) => {
      sum[f] = opts[f] as any;
      return sum;
    }, {} as MoveOpts),
    expiration
  );

  return result.path;
}
