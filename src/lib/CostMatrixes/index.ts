import { type MoveOpts, type MoveTarget } from 'lib';
import { calculateNearbyPositions } from '../Movement/selectors';
import { avoidSourceKeepers } from './sourceKeepers';

export type CostMatrixMutator = (cm: CostMatrix, room: string) => CostMatrix;
export interface CostMatrixOptions {
  avoidCreeps?: boolean;
  avoidObstacleStructures?: boolean;
  avoidSourceKeepers?: boolean;
  ignorePortals?: boolean;
  roadCost?: number;
  avoidTargets?: (roomName: string) => MoveTarget[];
}

/**
 * Mutates a cost matrix based on a set of options, and returns the mutated cost matrix.
 */
export const mutateCostMatrix = (cm: CostMatrix, room: string, opts: CostMatrixOptions) => {
  if (opts.avoidCreeps) {
    Game.rooms[room]?.find(FIND_CREEPS).forEach(c => cm.set(c.pos.x, c.pos.y, 255));
    Game.rooms[room]?.find(FIND_POWER_CREEPS).forEach(c => cm.set(c.pos.x, c.pos.y, 255));
  }
  if (opts.avoidSourceKeepers) {
    avoidSourceKeepers(room, cm);
  }
  if (opts.avoidObstacleStructures || opts.roadCost) {
    if (opts.avoidObstacleStructures) {
      Game.rooms[room]?.find(FIND_MY_CONSTRUCTION_SITES).forEach(s => {
        if ((OBSTACLE_OBJECT_TYPES as string[]).includes(s.structureType)) {
          cm.set(s.pos.x, s.pos.y, 255);
        }
      });
    }
    Game.rooms[room]?.find(FIND_STRUCTURES).forEach(s => {
      if (opts.avoidObstacleStructures) {
        if (
          (OBSTACLE_OBJECT_TYPES as string[]).includes(s.structureType) ||
          (s.structureType === STRUCTURE_RAMPART && !s.my && !s.isPublic)
        ) {
          cm.set(s.pos.x, s.pos.y, 255);
        }
      }
      if (opts.roadCost) {
        if (s instanceof StructureRoad && cm.get(s.pos.x, s.pos.y) === 0) {
          cm.set(s.pos.x, s.pos.y, opts.roadCost);
        }
      }
      if (!opts.ignorePortals) {
        if (s.structureType === STRUCTURE_PORTAL) {
          cm.set(s.pos.x, s.pos.y, 255);
        }
      }
    });
  }
  if (opts.avoidTargets) {
    opts.avoidTargets(room).forEach(t => {
      calculateNearbyPositions(t.pos, t.range).forEach(p => cm.set(p.x, p.y, 254));
    });
  }
  return cm;
};

export const configureRoomCallback = (actualOpts: MoveOpts, targetRooms?: string[]) => (room: string) => {
  if (targetRooms && !targetRooms.includes(room)) return false; // outside route search space
  let cm = actualOpts.roomCallback?.(room);
  if (cm === false) return cm;
  const cloned = cm instanceof PathFinder.CostMatrix ? cm.clone() : new PathFinder.CostMatrix();
  return mutateCostMatrix(cloned, room, actualOpts);
};
