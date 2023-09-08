import { Coord } from 'utils/packPositions';

export class CoordMap extends Map {
  private map = new Map<number, Coord>();
  private _reversed = new Map<number, Coord>();
  constructor() {
    super();
  }
  reversed = {
    get: (key: Coord) => this._reversed.get((key.x << 6) | key.y),
    has: (key: Coord) => this._reversed.has((key.x << 6) | key.y)
  };
  get(key: Coord) {
    return this.map.get((key.x << 6) | key.y);
  }
  set(key: Coord, value: Coord) {
    this.map.set((key.x << 6) | key.y, value);
    this._reversed.set((value.x << 6) | value.y, key);
    return this;
  }
  delete(coord: Coord) {
    const value = this.map.get((coord.x << 6) | coord.y);
    if (value) this._reversed.delete((value.x << 6) | value.y);
    return this.map.delete((coord.x << 6) | coord.y);
  }
  has(coord: Coord) {
    return this.map.has((coord.x << 6) | coord.y);
  }
  clear() {
    this._reversed.clear();
    this.map.clear();
  }
  *entries(): IterableIterator<[Coord, Coord]> {
    for (const [k, v] of this.map.entries()) {
      const kCoord = { x: k >> 6, y: k & 0b111111 };
      yield [kCoord, v] as [Coord, Coord];
    }
  }
  values(): IterableIterator<Coord> {
    return this.map.values();
  }
  *keys(): IterableIterator<Coord> {
    for (const k of this.map.keys()) {
      const kCoord = { x: k >> 6, y: k & 0b111111 };
      yield kCoord;
    }
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  get size() {
    return this.map.size;
  }
}
