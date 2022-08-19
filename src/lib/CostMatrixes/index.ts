export type CostMatrixMutator = (cm: CostMatrix, room: string) => CostMatrix;
export interface CostMatrixOptions {
  avoidCreeps?: boolean;
  avoidObstacleStructures?: boolean;
  roadCost?: number;
}

export const mutateCostMatrix = (cm: CostMatrix, room: string, opts: CostMatrixOptions) => {
  if (opts.avoidCreeps) {
    Game.rooms[room]?.find(FIND_CREEPS).forEach(c => cm.set(c.pos.x, c.pos.y, 255));
  }
  if (opts.avoidObstacleStructures || opts.roadCost) {
    Game.rooms[room]?.find(FIND_STRUCTURES).forEach(s => {
      if (opts.avoidObstacleStructures) {
        if ((OBSTACLE_OBJECT_TYPES as string[]).includes(s.structureType)) {
          cm.set(s.pos.x, s.pos.y, 255);
        }
      }
      if (opts.roadCost) {
        if (s instanceof StructureRoad && cm.get(s.pos.x, s.pos.y) !== 255) {
          cm.set(s.pos.x, s.pos.y, opts.roadCost);
        }
      }
    });
  }
  return cm;
};
