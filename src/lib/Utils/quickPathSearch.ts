// using the packed representation to improve cpu usage, also uses skip-list logic on the path
export function quickPathSearch(search: RoomPosition, path: RoomPosition[]): number {
  const searchPacked = search.__packedPos;
  const searchRoom = searchPacked >>> 16;

  for (let i = 0; i < path.length; i++) {
    const currentPos = path[i];

    if (currentPos.isEqualTo(search)) {
      return i;
    }

    const currentRoomPacked = path[i].__packedPos >>> 16;

    // Optimization: if in the same room, we can skip ahead based on distance.
    // Since we move at most 1 tile per index, we can't reach the target sooner than the distance.
    if (currentRoomPacked === searchRoom) {
      const dist = currentPos.getRangeTo(search);
      if (dist > 1) {
        i += dist - 1; // -1 because the loop increments i
      }
    }
  }

  return -1;
}