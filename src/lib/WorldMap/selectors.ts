export const isHighway = (roomName: string) => {
  let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
  if (!parsed) throw new Error('Invalid room name');
  return Number(parsed[1]) % 10 === 0 || Number(parsed[2]) % 10 === 0;
};
export const isCenterRoom = (roomName: string) => {
  let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
  if (!parsed) throw new Error('Invalid room name');
  return Number(parsed[1]) % 10 === 5 && Number(parsed[2]) % 10 === 5;
};
export const isSourceKeeperRoom = (roomName: string) => {
  if (roomName === 'sim') {
    return false;
  }
  let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
  if (!parsed) throw new Error('Invalid room name');
  let fmod = Number(parsed[1]) % 10;
  let smod = Number(parsed[2]) % 10;
  // return !(fmod === 5 && smod === 5) && (fmod >= 4 && fmod <= 6) && (smod >= 4 && smod <= 6);
  return fmod >= 4 && fmod <= 6 && smod >= 4 && smod <= 6;
};

/**
 * Returns the remaining slice of the path (not including start)
 */
export const slicedPath = (path: RoomPosition[], start: number, reverse?: boolean) => {
  if (reverse) return path.slice(0, start);
  return path.slice(start + 1);
};
