import { Coord } from 'utils/packrat';
export declare const PositionSerializer: {
    serialize(pos?: RoomPosition): string | undefined;
    deserialize(pos?: string): RoomPosition | undefined;
};
export declare const PositionListSerializer: {
    serialize(pos?: RoomPosition[]): string | undefined;
    deserialize(pos?: string): RoomPosition[] | undefined;
};
export declare const CoordSerializer: {
    serialize(pos?: Coord): string | undefined;
    deserialize(pos?: string): Coord | undefined;
};
export declare const CoordListSerializer: {
    serialize(pos?: Coord[]): string | undefined;
    deserialize(pos?: string): Coord[] | undefined;
};
