/// <reference types="screeps" />
export declare type MoveTarget = {
    pos: RoomPosition;
    range: number;
};
export interface MoveOpts extends PathFinderOpts {
    serializeMemory?: boolean;
    reusePath?: number;
    visualizePathStyle?: PolyStyle;
    avoidCreeps?: boolean;
    avoidObstacleStructures?: boolean;
    roadCost?: number;
}
export * from './CachingStrategies';
export * from './Movement/moveTo';
export declare function preTick(): void;
