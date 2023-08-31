export class RoomPositionSet extends Set {
  private map = new Map<number, RoomPosition>();
  add(pos: RoomPosition) {
    this.map.set(pos.__packedPos, pos);
    return this;
  }
  delete(pos: RoomPosition) {
    return this.map.delete(pos.__packedPos);
  }
  has(pos: RoomPosition) {
    return this.map.has(pos.__packedPos);
  }
  clear() {
    this.map.clear();
  }
  *entries() {
    for (const v of this.map.values()) {
      yield [v, v] as [any, any];
    }
  }
  values() {
    return this.map.values();
  }
  keys() {
    return this.map.values();
  }
  [Symbol.iterator]() {
    return this.map.values();
  }
  get size() {
    return this.map.size;
  }
}
