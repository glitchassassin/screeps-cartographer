import { fastRoomPosition, offsetRoomPosition, sameRoomPosition } from 'lib/Movement/roomPositions';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestRoomPositionPerformance extends CartographerTestCase {
  _creeps = {};
  retries = 0;
  timeout = 50; // ticks
  test() {
    function timeMethod(method: (x: number, y: number) => any, name: string) {
      const start = Game.cpu.getUsed();
      const iterations = 10;
      for (let i = 0; i < iterations; i++) for (let x = 0; x < 50; x++) for (let y = 0; y < 50; y++) method(x, y);
      const end = Game.cpu.getUsed();
      console.log(`${name} (${iterations * 2500} iterations): ${end - start} CPU`);
    }
    timeMethod((x, y) => new RoomPosition(x, y, 'W0N0'), 'new RoomPosition');
    timeMethod((x, y) => fastRoomPosition(x, y, 'W0N0'), 'fastRoomPosition');
    const pos = new RoomPosition(0, 0, 'W0N0');
    timeMethod((x, y) => offsetRoomPosition(pos, x, y), 'offsetRoomPosition');
    timeMethod((x, y) => sameRoomPosition(pos, x, y), 'sameRoomPosition');

    return TestResult.PASS;
  }
}
