/// <reference types="screeps" />
export declare const runTestScenarios: () => void;
declare global {
    interface CreepMemory {
        state?: 'HARVEST' | 'UPGRADE' | 'DEPOSIT';
        role: 'worker' | 'scout';
        harvestSource?: Id<Source>;
        room: string;
        scoutTarget?: string;
    }
    interface RoomMemory {
        visited?: boolean;
        sources?: string;
        controller?: string;
        exits?: string;
    }
}
