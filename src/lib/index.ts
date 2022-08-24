import { CachingStrategy, cleanAllCaches } from './CachingStrategies';

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
}

export * from './CachingStrategies';
export * from './Movement/moveTo';
export * from './Movement/selectors';

export function preTick() {
  cleanAllCaches();
}
