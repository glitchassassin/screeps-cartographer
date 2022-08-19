import { MoveOpts, MoveTarget } from 'lib';
declare global {
    interface CreepMemory {
        _cmvp?: string;
        _cmvt?: string;
    }
}
/**
 *
 * @param creep
 * @param targets
 * @param opts
 */
export declare const moveTo: (creep: Creep, targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[], opts?: MoveOpts) => -2 | CreepMoveReturnCode | -5 | -10;
