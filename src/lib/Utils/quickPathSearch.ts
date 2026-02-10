// using the packed representation to improve cpu usage, also uses skip-list logic on the path
export function quickPathSearch(search: RoomPosition, path: RoomPosition[]): number {
  const searchPacked = search.__packedPos;
  const searchRoom = searchPacked >>> 16;
  const searchX = search.x;
  const searchY = search.y;

  for (let i = 0; i < path.length; i++) {
    const currentPacked = path[i].__packedPos;

    if (currentPacked === searchPacked) {
      return i;
    }

    // Optimization: if in the same room, we can skip ahead based on distance.
    // Since we move at most 1 tile per index, we can't reach the target sooner than the distance.
    if ((currentPacked >>> 16) === searchRoom) {
      const x = (currentPacked >> 8) & 0xFF;
      const y = currentPacked & 0xFF;
      const dist = Math.max(Math.abs(searchX - x), Math.abs(searchY - y));
      if (dist > 1) {
        i += dist - 1; // -1 because the loop increments i
      }
    }
  }

  return -1;
}