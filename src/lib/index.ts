import { CachingStrategy, cleanAllCaches } from './CachingStrategies';
import { updateIntel } from './CostMatrixes/sourceKeepers';

export type MoveTarget = { pos: RoomPosition; range: number };
export interface MoveOpts extends PathFinderOpts {
  /**
   * Caching strategy to use to save paths. Defaults to HeapCache.
   */
  cache?: CachingStrategy;
  /**
   * Number of ticks to save a cached path before repathing. If undefined,
   * cached path will be reused indefinitely. Default is undefined.
   */
  reusePath?: number;
  /**
   * Number of ticks to wait for a creep to become unstuck before repathing
   * with the fallbackOpts. Default is 3.
   */
  repathIfStuck?: number;
  /**
   * If set, will visualize the path using provided styles.
   */
  visualizePathStyle?: PolyStyle;
  /**
   * If target range would extend out of the target room, trim to keep target in room
   */
  keepTargetInRoom?: boolean;
  /**
   * Automatically populates cost matrix with creep positions.
   */
  avoidCreeps?: boolean;
  /**
   * Automatically populates cost matrix with structure positions.
   */
  avoidObstacleStructures?: boolean;
  /**
   * Always path around Source Keeper-protected resources.
   */
  avoidSourceKeepers?: boolean;

  /**
   * Cost for walking on road positions. The default is 1.
   */
  roadCost?: number;
  /**
   * Cost for walking on plain positions. The default is 2.
   */
  plainCost?: number;
  /**
   * Cost for walking on swamp positions. The default is 10.
   */
  swampCost?: number;
  /**
   * Movement priority (higher-value moves override lower-value moves). The default is 1.
   */
  priority?: number;
  /**
   * Default cost for a room in findRoute callback (may be overridden
   * if routeCallback is provided). Defaults to 2.
   */
  defaultRoomCost?: number;
  /**
   * Cost for a Source Keeper room in findRoute callback (may be overridden
   * if routeCallback is provided). Defaults to 2.
   */
  sourceKeeperRoomCost?: number;
  /**
   * Cost for a highway room in findRoute callback (may be overridden
   * if routeCallback is provided). Defaults to 1.
   */
  highwayRoomCost?: number;
  /**
   * The maximum allowed pathfinding operations per room (if maxOps is higher for a short path, PathFinder will use the lower).
   * You can limit CPU time used for the search based on ratio 1 op ~ 0.001 CPU. The default value is 2000.
   */
  maxOpsPerRoom?: number;
  /**
   * This callback works like the builtin `findRoute` and will override
   * the default values for highway/source keeper room cost unless you
   * return `undefined`.
   */
  routeCallback?: (roomName: string, fromRoomName: string) => number | undefined;
}

export * from './CachingStrategies';
export * from './Movement/cachedPaths';
export * from './Movement/generatePath';
export * from './Movement/move';
export * from './Movement/moveByPath';
export * from './Movement/moveTo';
export * from './Movement/pull';
export * from './Movement/selectors';
export { blockSquare } from './TrafficManager/moveLedger';
export * from './TrafficManager/reconcileTraffic';

export function preTick() {
  cleanAllCaches();
  updateIntel();
}
