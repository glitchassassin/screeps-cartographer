import { config } from 'config';
import { MoveTarget } from '../';
import { mutateCostMatrix } from '../CostMatrixes';
import { findRoute } from '../WorldMap/findRoute';

/**
 * Generates a path with PathFinder
 */
export function generatePath(
  origin: RoomPosition,
  targets: MoveTarget[],
  opts: MoveToOpts
): RoomPosition[] | undefined {
  // Generate full opts object
  const actualOpts = {
    ...config.DEFAULT_MOVE_OPTS,
    ...opts
  };
  // check if we need a route to limit search space
  const exits = Object.values(Game.map.describeExits(origin.roomName));
  let rooms: string[] | undefined = undefined;
  if (!targets.some(({ pos }) => pos.roomName === origin.roomName || exits.includes(pos.roomName))) {
    // if there are multiple rooms in `targets`, pick the cheapest route
    const targetRooms = targets.reduce(
      (rooms, { pos }) => (rooms.includes(pos.roomName) ? rooms : [pos.roomName, ...rooms]),
      [] as string[]
    );
    for (const room of targetRooms) {
      const route = findRoute(origin.roomName, room, actualOpts);
      if (route && (!rooms || route.length < rooms.length)) {
        rooms = route;
      }
    }
    // console.log('generated path from', origin.roomName, 'to', targetRooms, ':', rooms);
  }
  // generate path
  const result = PathFinder.search(origin, targets, {
    ...actualOpts,
    maxOps: Math.min(actualOpts.maxOps ?? 100000, (actualOpts.maxOpsPerRoom ?? 2000) * (rooms?.length ?? 1)),
    roomCallback(room) {
      if (rooms && !rooms.includes(room)) return false; // outside route search space
      let cm = actualOpts.roomCallback?.(room);
      if (cm === false) return cm;
      const cloned = cm instanceof PathFinder.CostMatrix ? cm.clone() : new PathFinder.CostMatrix();
      return mutateCostMatrix(cloned, room, actualOpts);
    }
  });
  if (!result.path.length || result.incomplete) return undefined;

  return result.path;
}
