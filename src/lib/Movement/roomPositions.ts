import { memoize } from 'lib/Utils/memoize';

const MAX_WORLD_SIZE = 256 >> 1;

const roomToPacked = memoize(
  (room: string) => room,
  (room: string): number => {
    for (let i = 2; i < room.length; i++) {
      if (room[i] === 'N' || room[i] === 'S') {
        const xQuadrant = room[0];
        const yQuadrant = room[i];
        let x = parseInt(room.slice(1, i));
        let y = parseInt(room.slice(i + 1));
        if (xQuadrant === 'W') x = -x - 1;
        if (yQuadrant === 'N') y = -y - 1;
        x += MAX_WORLD_SIZE;
        y += MAX_WORLD_SIZE;
        return (x << 8) | y;
      }
    }
    throw new Error(`Invalid room name ${room}`);
  }
);

export const fastRoomPosition = (x: number, y: number, room: string): RoomPosition => {
  const pos = Object.create(RoomPosition.prototype);
  pos.__packedPos = (roomToPacked(room) << 16) | (x << 8) | y;
  return pos;
};

export const sameRoomPosition = (pos: RoomPosition, newX: number, newY: number): RoomPosition => {
  const newPos = Object.create(RoomPosition.prototype);
  newPos.__packedPos = (pos.__packedPos & 0xffff0000) | (newX << 8) | newY;
  return newPos;
};

export const offsetRoomPosition = (pos: RoomPosition, xOffset: number, yOffset: number): RoomPosition => {
  const x = (pos.__packedPos >> 8) & 0xff;
  const y = pos.__packedPos & 0xff;
  const newPos = Object.create(RoomPosition.prototype);
  newPos.__packedPos = (pos.__packedPos & 0xffff0000) | ((x + xOffset) << 8) | (y + yOffset);
  return newPos;
};
