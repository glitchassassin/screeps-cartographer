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
