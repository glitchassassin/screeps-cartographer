/// <reference types="screeps" />
export declare const runTestScenarios: () => void;
declare global {
    interface CreepMemory {
        state?: 'HARVEST' | 'UPGRADE' | 'DEPOSIT';
        role: 'worker' | 'scout';
        harvestSource?: Id<Source>;
        room: string;
        scoutTarget?: string;
        useCartographer?: boolean;
    }
    interface RoomMemory {
        visited?: boolean;
        sources?: string;
        controller?: string;
        exits?: string;
    }
    interface Memory {
        cg_perf: {
            sum: number;
            count: number;
        };
        mt_perf: {
            sum: number;
            count: number;
        };
    }
}
