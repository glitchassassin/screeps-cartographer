import { config } from 'config';
import { MoveOpts, MoveTarget } from '../';
import { configureRoomCallback } from '../CostMatrixes';
import { findRoute } from '../WorldMap/findRoute';

/**
 * Generates a path with PathFinder.
 */
export function generatePath(origin: RoomPosition, targets: MoveTarget[], opts?: MoveOpts): RoomPosition[] | undefined {
  // Generate full opts object
  let actualOpts = {
    ...config.DEFAULT_MOVE_OPTS,
    ...opts
  };

  // Dynamic choose weight for roads, plains and swamps depending on body.
  if (opts?.creepMovementInfo) {
    actualOpts = { ...actualOpts, ...defaultTerrainCosts(opts.creepMovementInfo) };
  }

  // generate a route to limit search space
  const targetRooms = targets.reduce(
    (rooms, { pos }) => (rooms.includes(pos.roomName) ? rooms : [pos.roomName, ...rooms]),
    [] as string[]
  );
  let routes = findRoute(origin.roomName, targetRooms, actualOpts);

  // generate path for each route segment
  if (!routes?.length || routes.length === 1) {
    const rooms = routes?.[0]?.rooms;
    // No portals - just generate a single path
    const result = PathFinder.search(origin, targets, {
      ...actualOpts,
      maxOps: Math.min(actualOpts.maxOps ?? 100000, (actualOpts.maxOpsPerRoom ?? 2000) * (rooms?.length ?? 1)),
      roomCallback: configureRoomCallback(actualOpts, rooms)
    });
    if (!result.path.length || result.incomplete) return undefined;

    return result.path;
  } else {
    // Generate paths to each portalSet and then merge into a single path
    let workingOrigin = origin;
    const path: RoomPosition[] = [];

    for (const route of routes) {
      if (!route.portalSet) {
        // no portal set - this is the last segment of the path, go to the actual targets
        const result = PathFinder.search(workingOrigin, targets, {
          ...actualOpts,
          maxOps: Math.min(actualOpts.maxOps ?? 100000, (actualOpts.maxOpsPerRoom ?? 2000) * route.rooms.length),
          roomCallback: configureRoomCallback(actualOpts, route.rooms)
        });
        if (!result.path.length || result.incomplete) return undefined;
        path.push(...result.path);
      } else {
        // portal set - pathfind to the closest portal in the portalset
        const lastRoom = route.rooms.includes(route.portalSet.room1) ? route.portalSet.room1 : route.portalSet.room2;
        const portalTargets = (
          lastRoom === route.portalSet.room1
            ? [...route.portalSet.portalMap.keys()]
            : [...route.portalSet.portalMap.values()]
        ).map(coord => ({ pos: new RoomPosition(coord.x, coord.y, lastRoom), range: 1 }));
        const result = PathFinder.search(workingOrigin, portalTargets, {
          ...actualOpts,
          maxOps: Math.min(actualOpts.maxOps ?? 100000, (actualOpts.maxOpsPerRoom ?? 2000) * route.rooms.length),
          roomCallback: configureRoomCallback(actualOpts, route.rooms)
        });
        if (!result.path.length || result.incomplete) return undefined;
        // paths to range 1 of portal - select a portal at the end of the path
        const portal = portalTargets.find(t => t.pos.isNearTo(result.path[result.path.length - 1]))!.pos;
        path.push(...result.path, portal);

        // The next path begins at the destination of the target portal
        if (route.portalSet.room1 === lastRoom) {
          const destination = route.portalSet.portalMap.get(portal);
          if (!destination)
            throw new Error(`Portal ${portal} not found in portalSet ${JSON.stringify(route.portalSet)}`);
          workingOrigin = new RoomPosition(destination.x, destination.y, route.portalSet.room2);
        } else {
          const destination = route.portalSet.portalMap.reversed.get(portal);
          if (!destination)
            throw new Error(`Portal ${portal} not found in portalSet ${JSON.stringify(route.portalSet)}`);
          workingOrigin = new RoomPosition(destination.x, destination.y, route.portalSet.room1);
        }
      }
    }

    return path;
  }
}

function defaultTerrainCosts(
  creepInfo: Required<MoveOpts>['creepMovementInfo']
): Required<Pick<MoveOpts, 'roadCost' | 'plainCost' | 'swampCost'>> {
  const result = {
    roadCost: config.DEFAULT_MOVE_OPTS.roadCost || 1,
    plainCost: config.DEFAULT_MOVE_OPTS.plainCost || 2,
    swampCost: config.DEFAULT_MOVE_OPTS.swampCost || 10
  };

  let totalCarry = creepInfo.usedCapacity;

  let moveParts = 0;
  let usedCarryParts = 0;
  let otherBodyParts = 0;

  // Iterating right to left because carry parts are filled in that order.
  for (let i = creepInfo.body.length - 1; i >= 0; i--) {
    const bodyPart: BodyPartDefinition = creepInfo.body[i];
    if (bodyPart.type !== MOVE && bodyPart.type !== CARRY) {
      otherBodyParts++;
    } else if (bodyPart.hits <= 0) {
      continue;
    } else if (bodyPart.type === MOVE) {
      let boost = 1;
      if (bodyPart.boost) {
        boost = BOOSTS[MOVE][bodyPart.boost].fatigue;
      }
      moveParts += 1 * boost;
    } else if (totalCarry > 0 && bodyPart.type === CARRY) {
      let boost = 1;
      if (bodyPart.boost) {
        boost = BOOSTS[CARRY][bodyPart.boost].capacity;
      }
      // We count carry parts used by removing the capacity used by them from the total that the creep is carrying.
      // When total is empty, resting carry parts doesn't generate fatigue (even if they have no hits).
      totalCarry -= CARRY_CAPACITY * boost;
      usedCarryParts++;
    }
  }

  // If no move parts it can't move, skip and apply defaults to speed this up.
  if (moveParts > 0) {
    const fatigueFactor = usedCarryParts + otherBodyParts;
    const recoverFactor = moveParts * 2;

    // In case cost is 0 (only move parts), all terrains will cost 1.
    // Hardcoding 0.1 as minimum cost to obtain this result.
    const cost = Math.max(fatigueFactor / recoverFactor, 0.1);

    // Number of ticks that it takes move over each terrain.
    // Having this as a separated function could be interesting for obtaining how many ticks
    // it will take a creep to walk over a route with determined terrains.
    const roadCost = Math.ceil(cost);
    const plainCost = Math.ceil(cost * 2);
    const swampCost = Math.ceil(cost * 10);

    // Greatest common divisor.
    // https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/gcd.md
    const gcd = (...arr: number[]) => {
      const _gcd = (x: number, y: number): number => (!y ? x : gcd(y, x % y));
      return [...arr].reduce((a, b) => _gcd(a, b));
    };

    // Calculate the greatest common divisor so we can reduce the costs to the smallest numbers possible.
    const norm = gcd(roadCost, plainCost, swampCost);

    // Normalize and set the default costs. This costs are going to be always under the 255 limit.
    // Worst scenario is with 49 not move body parts and only 1 move part. This means a cost of 24.5,
    // implying 25 / 49 / 245 costs for each terrain.
    result.roadCost = roadCost / norm;
    result.plainCost = plainCost / norm;
    result.swampCost = swampCost / norm;
  }
  return result;
}
