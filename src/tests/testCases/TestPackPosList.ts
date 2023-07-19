import { compressPath, decompressPath, packPos, packPosList, unpackPos, unpackPosList } from 'utils/packPositions';
import { generatePath } from '../../lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestPackPosList extends CartographerTestCase {
  _creeps = {
  };
  retries = 0;
  timeout = 50; // ticks
  test() {
    const currentRoom = this.spawn.room;
    let adjacentRoom = Object.values(Game.map.describeExits(currentRoom.name))[0];
    let nextAdjacentRoom = Object.values(Game.map.describeExits(adjacentRoom)).filter(r => r !== currentRoom.name)[0]

    const path = generatePath(this.spawn.pos, [{ pos: new RoomPosition(25, 25, nextAdjacentRoom), range: 20 }])

    if (!path) {
      console.log("[TestPackPosList] Unable to generate path")
      return TestResult.FAIL;
    }

    if (!unpackPos(packPos(this.spawn.pos)).isEqualTo(this.spawn.pos)) {
      console.log("[TestPackPosList] Inconsistent packPos results")
      return TestResult.FAIL;
    }

    const packedList = packPosList(path)
    const packedUnpackedList = unpackPosList(packedList);
    if (!packedUnpackedList?.every((pos, i) => pos.isEqualTo(path[i]))) {
      console.log("[TestPackPosList] Inconsistent packPosList results")
      return TestResult.FAIL;
    }

    const compressedPath = compressPath(path)
    const compressedDecompressedPath = decompressPath(compressedPath)
    if (!compressedDecompressedPath?.every((pos, i) => pos.isEqualTo(path[i]))) {
      console.log("[TestPackPosList] Inconsistent decompressPath results")
      return TestResult.FAIL;
    }

    // Report space savings

    console.log('Path length:', path.length)
    console.log('Packed length:', packedList.length)
    console.log('Compressed length:', compressedPath.length)

    // Report CPU statistics

    const startPacking = Math.max(0, Game.cpu.getUsed());
    for (let i = 0; i < 1000; i += 1) {
      packPosList(path);
    }
    const packingCpu = Math.max(0, Game.cpu.getUsed()) - startPacking;
    console.log('Packing CPU (per pos):', packingCpu / (1000 * path.length))

    const startUnpacking = Math.max(0, Game.cpu.getUsed());
    for (let i = 0; i < 1000; i += 1) {
      unpackPosList(packedList);
    }
    const unpackingCpu = Math.max(0, Game.cpu.getUsed()) - startUnpacking;
    console.log('Unpacking CPU (per pos):', unpackingCpu / (1000 * path.length))

    const startCompressing = Math.max(0, Game.cpu.getUsed());
    for (let i = 0; i < 1000; i += 1) {
      compressPath(path);
    }
    const compressingCpu = Math.max(0, Game.cpu.getUsed()) - startCompressing;
    console.log('Compressing CPU (per pos):', compressingCpu / (1000 * path.length))

    const startDecompressing = Math.max(0, Game.cpu.getUsed());
    for (let i = 0; i < 1000; i += 1) {
      decompressPath(compressedPath);
    }
    const decompressingCpu = Math.max(0, Game.cpu.getUsed()) - startDecompressing;
    console.log('Decompressing CPU (per pos):', decompressingCpu / (1000 * path.length))

    return TestResult.PASS;
  }
}
