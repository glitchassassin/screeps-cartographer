import {
  Coord,
  packCoord,
  packCoordList,
  packPos,
  packPosList,
  unpackCoord,
  unpackCoordList,
  unpackPos,
  unpackPosList
} from 'utils/packrat';

export const PositionSerializer = {
  serialize(pos?: RoomPosition) {
    if (pos === undefined) return undefined;
    return packPos(pos);
  },
  deserialize(pos?: string) {
    if (pos === undefined) return undefined;
    return unpackPos(pos);
  }
};

export const PositionListSerializer = {
  serialize(pos?: RoomPosition[]) {
    if (pos === undefined) return undefined;
    return packPosList(pos);
  },
  deserialize(pos?: string) {
    if (pos === undefined) return undefined;
    return unpackPosList(pos);
  }
};

export const CoordSerializer = {
  serialize(pos?: Coord) {
    if (pos === undefined) return undefined;
    return packCoord(pos);
  },
  deserialize(pos?: string) {
    if (pos === undefined) return undefined;
    return unpackCoord(pos);
  }
};

export const CoordListSerializer = {
  serialize(pos?: Coord[]) {
    if (pos === undefined) return undefined;
    return packCoordList(pos);
  },
  deserialize(pos?: string) {
    if (pos === undefined) return undefined;
    return unpackCoordList(pos);
  }
};
