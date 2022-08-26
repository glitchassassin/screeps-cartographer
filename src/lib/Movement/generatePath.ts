import { MoveTarget } from 'lib';
import { mutateCostMatrix } from 'lib/CostMatrixes';

export interface GeneratePathOpts extends PathFinderOpts {
  avoidCreeps?: boolean;
  avoidObstacleStructures?: boolean;
  roadCost?: number;
}

export function generatePath(
  origin: RoomPosition,
  targets: MoveTarget[],
  opts: GeneratePathOpts
): RoomPosition[] | undefined {
  // generate path
  const result = PathFinder.search(origin, targets, {
    ...opts,
    roomCallback(room) {
      let cm = opts.roomCallback?.(room);
      if (cm === false) return cm;
      const cloned = cm instanceof PathFinder.CostMatrix ? cm.clone() : new PathFinder.CostMatrix();
      return mutateCostMatrix(cloned, room, {
        avoidCreeps: opts.avoidCreeps,
        avoidObstacleStructures: opts.avoidObstacleStructures,
        roadCost: opts.roadCost
      });
    }
  });
  if (!result.path.length) return undefined;

  return result.path;
}
