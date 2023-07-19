import { Codec } from "screeps-utf15";

declare global {
  interface RoomPosition {
    __packedPos: number
  }
}

const roomPositionCodec = new Codec({ array: false, depth: 28 });
const directionsCodec = new Codec({ depth: 3, array: true });

/**
 * Pack RoomPosition to two Unicode characters with screeps-utf15
 */
export const packPos = (pos: RoomPosition) => {
  // adjust the packedPos
  const xx = (pos.__packedPos & 0xff00) >> 8
  const yy = (pos.__packedPos & 0xff)
  const packedPos = ((pos.__packedPos >> 4) & 0xfffff000) | xx << 6 | yy
  // encode the room position
  return roomPositionCodec.encode(packedPos)
}

/**
 * Unpack a single packed RoomPosition from two Unicode characters
 */
export const unpackPos = function (str: string) {
  // decode the room position
  const packedPos = roomPositionCodec.decode(str);
  // adjust the packedPos
  const xx = (packedPos & 0xfc0) >> 6
  const yy = (packedPos & 0x3f)
  const newPackedPos = ((packedPos << 4) & 0xffff0000) | xx << 8 | yy
  // return a new RoomPosition object
  const pos = new RoomPosition(0, 0, 'E0S0');
  pos.__packedPos = newPackedPos
  return pos;
}

/**
 * Pack a list of RoomPositions to two Unicode characters each with screeps-utf15
 */
export const packPosList = (posList: RoomPosition[]) => {
  return posList.map(p => packPos(p)).join('');
}

/**
 * Unpack a list of RoomPositions from two Unicode characters each
 */
export const unpackPosList = (str: string) => {
  return str.match(/.{1,2}/g)?.map(s => unpackPos(s));
}

export const roomNameToCoords = (roomName: string) => {
  let match = roomName.match(/^([WE])([0-9]+)([NS])([0-9]+)$/);
  if (!match) throw new Error('Invalid room name');
  let [, h, wx, v, wy] = match;
  return {
    wx: h == 'W' ? ~Number(wx) : Number(wx),
    wy: v == 'N' ? ~Number(wy) : Number(wy)
  };
};

export const roomNameFromCoords = (x: number, y: number) => {
  let h = x < 0 ? 'W' : 'E';
  let v = y < 0 ? 'N' : 'S';
  x = x < 0 ? ~x : x;
  y = y < 0 ? ~y : y;
  return `${h}${x}${v}${y}`;
};

export const globalPosition = (pos: RoomPosition) => {
  let { x, y, roomName } = pos;
  if (x < 0 || x >= 50) throw new RangeError('x value ' + x + ' not in range');
  if (y < 0 || y >= 50) throw new RangeError('y value ' + y + ' not in range');
  if (roomName == 'sim') throw new RangeError('Sim room does not have world position');
  let { wx, wy } = roomNameToCoords(roomName);
  return {
    x: 50 * Number(wx) + x,
    y: 50 * Number(wy) + y
  };
};

export const getRangeTo = (from: RoomPosition, to: RoomPosition) => {
  if (from.roomName === to.roomName) return from.getRangeTo(to);

  // Calculate global positions
  let fromGlobal = globalPosition(from);
  let toGlobal = globalPosition(to);

  return Math.max(Math.abs(fromGlobal.x - toGlobal.x), Math.abs(fromGlobal.y - toGlobal.y));
}

export function posAtDirection(origin: RoomPosition, direction: DirectionConstant) {
  const offset = [
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -1, y: -1 }
  ][direction - 1];

  let newX = origin.x + offset.x;
  let newY = origin.y + offset.y;
  let newRoomName = origin.roomName;
  if (newX < 0) {
    // out of the room to the left
    const { wx, wy } = roomNameToCoords(origin.roomName);
    newRoomName = roomNameFromCoords(wx - 1, wy);
    newX = 49;
  } else if (newX > 49) {
    // out of the room to the right
    const { wx, wy } = roomNameToCoords(origin.roomName);
    newRoomName = roomNameFromCoords(wx + 1, wy);
    newX = 0;
  } else if (newY < 0) {
    // out of the room to the top
    const { wx, wy } = roomNameToCoords(origin.roomName);
    newRoomName = roomNameFromCoords(wx, wy - 1);
    newY = 49;
  } else if (newY > 49) {
    // out of the room to the top
    const { wx, wy } = roomNameToCoords(origin.roomName);
    newRoomName = roomNameFromCoords(wx, wy + 1);
    newY = 0;
  }

  return new RoomPosition(newX, newY, newRoomName);
}

/**
 * Compress a path of adjacent RoomPositions to an origin and a list of directions
 */
export const compressPath = (path: RoomPosition[]) => {
  const directions = []
  const origin = path[0];
  if (!origin) return '';
  let previous = origin;
  for (const next of path.slice(1)) {
    if (getRangeTo(previous, next) !== 1) {
      throw new Error('Cannot compress path unless each RoomPosition is adjacent to the previous one')
    }
    directions.push(previous.getDirectionTo(next));
    previous = next;
  }
  return packPos(origin) + directionsCodec.encode(directions);
}

/**
 * Decompress a path from an origin and list of directions
 */
export const decompressPath = (str: string) => {
  let previous = unpackPos(str.slice(0, 2))
  const path = [previous]
  const directions = directionsCodec.decode(str.slice(2)) as DirectionConstant[];
  for (const d of directions) {
    previous = posAtDirection(previous, d)
    path.push(previous);
  }
  return path;
}