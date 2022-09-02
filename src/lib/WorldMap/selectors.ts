export const isHighway = (roomName: string) => {
  let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
  if (!parsed) throw new Error('Invalid room name');
  return Number(parsed[1]) % 10 === 0 || Number(parsed[2]) % 10 === 0;
};
export const isSourceKeeperRoom = (roomName: string) => {
  let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
  if (!parsed) throw new Error('Invalid room name');
  let fmod = Number(parsed[1]) % 10;
  let smod = Number(parsed[2]) % 10;
  // return !(fmod === 5 && smod === 5) && (fmod >= 4 && fmod <= 6) && (smod >= 4 && smod <= 6);
  return fmod >= 4 && fmod <= 6 && smod >= 4 && smod <= 6;
};
