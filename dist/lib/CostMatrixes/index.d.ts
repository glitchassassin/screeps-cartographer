/// <reference types="screeps" />
export declare type CostMatrixMutator = (cm: CostMatrix, room: string) => CostMatrix;
export interface CostMatrixOptions {
    avoidCreeps?: boolean;
    avoidObstacleStructures?: boolean;
    roadCost?: number;
}
export declare const mutateCostMatrix: (cm: CostMatrix, room: string, opts: CostMatrixOptions) => CostMatrix;
