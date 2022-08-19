import { MoveTarget } from 'lib';
export declare const MoveTargetSerializer: {
    serialize(target?: MoveTarget): string | undefined;
    deserialize(target?: string): {
        pos: RoomPosition;
        range: number;
    } | undefined;
};
/**
 * Move target serializes into three characters: two for position and one for range
 */
export declare const MoveTargetListSerializer: {
    serialize(target?: MoveTarget[]): string | undefined;
    deserialize(target?: string): ({
        pos: RoomPosition;
        range: number;
    } | undefined)[] | undefined;
};
