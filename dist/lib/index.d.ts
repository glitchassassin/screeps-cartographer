/// <reference types="screeps" />
export declare type MoveTarget = {
    pos: RoomPosition;
    range: number;
};
export interface MoveOpts extends PathFinderOpts {
    serializeMemory?: boolean;
    reusePath?: number;
    visualizePathStyle?: PolyStyle;
}
