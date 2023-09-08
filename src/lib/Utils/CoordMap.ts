import { Coord } from 'utils/packPositions';

class OneDirectionalCoordMap extends Map {
  get(key: Coord) {
    return super.get((key.x << 6) | key.y);
  }
  set(key: Coord, value: Coord) {
    super.set((key.x << 6) | key.y, value);
    return this;
  }
  delete(coord: Coord) {
    return super.delete((coord.x << 6) | coord.y);
  }
  has(coord: Coord) {
    return super.has((coord.x << 6) | coord.y);
  }
  *entries(): IterableIterator<[Coord, Coord]> {
    for (const [k, v] of super.entries()) {
      const kCoord = { x: k >> 6, y: k & 0b111111 };
      yield [kCoord, v] as [Coord, Coord];
    }
  }
  values(): IterableIterator<Coord> {
    return super.values();
  }
  *keys(): IterableIterator<Coord> {
    for (const k of super.keys()) {
      const kCoord = { x: k >> 6, y: k & 0b111111 };
      yield kCoord;
    }
  }
  [Symbol.iterator]() {
    return this.entries();
  }
}

export class CoordMap extends OneDirectionalCoordMap {
  reversed = new OneDirectionalCoordMap();
  set(key: Coord, value: Coord) {
    this.reversed.set(value, key);
    return super.set(key, value);
  }
  delete(coord: Coord) {
    const value = this.get(coord);
    if (value) this.reversed.delete(value);
    return super.delete(coord);
  }
  clear() {
    this.reversed.clear();
    super.clear();
  }
}
