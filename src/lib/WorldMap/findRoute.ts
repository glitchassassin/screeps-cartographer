import { config } from '../../config';
import { isHighway, isSourceKeeperRoom } from './selectors';

export interface FindRouteOpts extends Partial<RouteOptions> {
  /**
   * Enhance route with additional rooms up to the max.
   * Max (and default) is 64)
   */
  maxRooms?: number;
  /**
   * Default cost for a room in findRoute callback
   */
  defaultRoomCost?: number;
  /**
   * Cost for a Source Keeper room in findRoute callback
   */
  sourceKeeperRoomCost?: number;
  /**
   * Cost for a highway room in findRoute callback
   */
  highwayRoomCost?: number;
}

/**
 * Uses findRoute to create a base route, then enhances
 * it by adding rooms (up to maxRooms) to improve pathfinding
 */
export function findRoute(room1: string, room2: string, opts?: FindRouteOpts) {
  const actualOpts = {
    ...config.DEFAULT_FIND_ROUTE_OPTS,
    ...opts
  };
  // Generate base route
  let generatedRoute = Game.map.findRoute(room1, room2, {
    routeCallback: (roomName: string, fromRoomName: string) => {
      const result = actualOpts.routeCallback?.(roomName, fromRoomName);
      if (result !== undefined) return result;
      if (isHighway(roomName)) return actualOpts.highwayRoomCost;
      if (isSourceKeeperRoom(roomName)) return actualOpts.sourceKeeperRoomCost;
      return actualOpts.defaultRoomCost;
    }
  });
  if (generatedRoute === ERR_NO_PATH) return undefined;
  // map from "take this exit to this room" to "in this room, take this exit"
  const route: { exit?: ExitConstant; room: string }[] = [];
  for (let i = 0; i < generatedRoute.length + 1; i++) {
    route.push({
      room: generatedRoute[i - 1]?.room ?? room1,
      exit: generatedRoute[i]?.exit
    });
  }

  // Enhance route
  let rooms = [...route.map(({ room }) => room)];
  for (let i = 0; i < route.length - 1; i++) {
    // check if we've met our limit
    if (rooms.length >= actualOpts.maxRooms) break;
    if (!route[i].exit) break;

    // check for areas PathFinder might be able to optimize

    // Route turns a corner: add the room inside the corner
    if (route[i].exit !== route[i + 1].exit) {
      const detour = Game.map.describeExits(route[i].room)[route[i + 1].exit!];
      if (detour && Game.map.findExit(detour, route[i + 1].room) > 0) {
        // detour room is connected
        rooms.push(detour);
      }
    }

    // Route is straight, but exit tiles are all to one side of the border
    // Might be faster to detour through neighboring rooms
    if (
      (route[i].exit === route[i + 1].exit || !route[i + 1].exit) &&
      (!route[i + 2]?.exit || route[i].exit === route[i + 2].exit)
    ) {
      if (rooms.length >= actualOpts.maxRooms - 1) continue; // detour will take two rooms, ignore
      // Straight line for the next three rooms (or until route ends)
      // Check if there are exit tiles on both halves of the border
      const regions = exitTileRegions(route[i].room, route[i].exit!);
      if (regions.every(r => r)) {
        continue;
      }
      // one half does not have an exit tile.
      let detour: ExitConstant | undefined = undefined;
      if (!regions[0] && (route[i].exit === FIND_EXIT_TOP || route[i].exit === FIND_EXIT_BOTTOM)) {
        detour = FIND_EXIT_LEFT;
      } else if (!regions[1] && (route[i].exit === FIND_EXIT_TOP || route[i].exit === FIND_EXIT_BOTTOM)) {
        detour = FIND_EXIT_RIGHT;
      } else if (!regions[0] && (route[i].exit === FIND_EXIT_LEFT || route[i].exit === FIND_EXIT_RIGHT)) {
        detour = FIND_EXIT_TOP;
      } else if (!regions[1] && (route[i].exit === FIND_EXIT_LEFT || route[i].exit === FIND_EXIT_RIGHT)) {
        detour = FIND_EXIT_BOTTOM;
      }
      if (!detour) throw new Error('Invalid exit tile state: ' + route[i].exit + JSON.stringify(regions));

      // check detour rooms for continuity
      const detour1 = Game.map.describeExits(route[i].room)[detour];
      const detour2 = Game.map.describeExits(route[i + 1].room)[detour];
      if (detour1 && detour2 && Game.map.findExit(detour1, detour2) > 0) {
        // detour rooms are connected
        rooms.push(detour1, detour2);
      }
    }
  }
  return [...new Set(rooms)];
}

function exitTileRegions(room: string, exit: ExitConstant): [boolean, boolean] {
  const terrain = Game.map.getRoomTerrain(room);
  let region1 = false;
  for (let i = 0; i < 25; i++) {
    const { x, y } = exitTileByIndex(exit, i);
    if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
      region1 = true;
      break;
    }
  }
  let region2 = false;
  for (let i = 25; i < 49; i++) {
    const { x, y } = exitTileByIndex(exit, i);
    if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
      region2 = true;
      break;
    }
  }
  return [region1, region2];
}

function exitTileByIndex(exit: ExitConstant, index: number) {
  if (exit === FIND_EXIT_TOP) return { x: index, y: 0 };
  if (exit === FIND_EXIT_BOTTOM) return { x: index, y: 49 };
  if (exit === FIND_EXIT_LEFT) return { x: 0, y: index };
  return { x: 49, y: index }; // FIND_EXIT_RIGHT
}
