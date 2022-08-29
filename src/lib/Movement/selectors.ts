import { MoveTarget } from 'lib';
import { Coord } from 'utils/packrat';

export const isExit = (pos: RoomPosition) => pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49;

export const normalizeTargets = (
  targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[],
  keepTargetInRoom = true
) => {
  let normalizedTargets: MoveTarget[] = [];
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
      normalizedTargets.push({ pos: targets.pos, range: 1 });
    }
  } else {
    normalizedTargets.push({ pos: targets, range: 1 });
  }
  if (keepTargetInRoom) normalizedTargets = normalizedTargets.flatMap(fixEdgePosition);
  return normalizedTargets;
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

export const calculateAdjacencyMatrix = (proximity = 1): { x: number; y: number }[] => {
  let adjacencies = new Array(proximity * 2 + 1).fill(0).map((v, i) => i - proximity);

  return adjacencies
    .flatMap(x => adjacencies.map(y => ({ x, y })))
    .filter((a: { x: number; y: number }) => !(a.x === 0 && a.y === 0));
};
export const calculateAdjacentPositions = (pos: RoomPosition) => {
  return calculateNearbyPositions(pos, 1);
};

export const calculateNearbyPositions = (pos: RoomPosition, proximity: number, includeCenter = false) => {
  let adjacent: RoomPosition[] = [];
  adjacent = calculateAdjacencyMatrix(proximity)
    .map(offset => {
      try {
        return new RoomPosition(pos.x + offset.x, pos.y + offset.y, pos.roomName);
      } catch {
        return null;
      }
    })
    .filter(roomPos => roomPos !== null) as RoomPosition[];
  if (includeCenter) adjacent.push(pos);
  return adjacent;
};

export const adjacentWalkablePositions = (pos: RoomPosition, ignoreCreeps = false) =>
  calculateAdjacentPositions(pos).filter(p => isPositionWalkable(p, ignoreCreeps));

export const isPositionWalkable = (
  pos: RoomPosition,
  ignoreCreeps: boolean = false,
  ignoreStructures: boolean = false
) => {
  let terrain;
  try {
    terrain = Game.map.getRoomTerrain(pos.roomName);
  } catch {
    // Invalid room
    return false;
  }
  if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
    return false;
  }
  if (
    Game.rooms[pos.roomName] &&
    pos.look().some(obj => {
      if (!ignoreCreeps && obj.type === LOOK_CREEPS) return true;
      if (
        !ignoreStructures &&
        obj.constructionSite &&
        (OBSTACLE_OBJECT_TYPES as string[]).includes(obj.constructionSite.structureType)
      )
        return true;
      if (
        !ignoreStructures &&
        obj.structure &&
        (OBSTACLE_OBJECT_TYPES as string[]).includes(obj.structure.structureType)
      )
        return true;
      return false;
    })
  ) {
    return false;
  }
  return true;
};
