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

    // test room name parsing
    if (!fastRoomPosition(25, 25, 'W10N10').isEqualTo(new RoomPosition(25, 25, 'W10N10'))) {
      console.log('fastRoomPosition [25, 25, W10N10]', fastRoomPosition(25, 25, 'W10N10'));
      return TestResult.FAIL;
    }
    if (!fastRoomPosition(25, 25, 'E10N10').isEqualTo(new RoomPosition(25, 25, 'E10N10'))) {
      console.log('fastRoomPosition [25, 25, E10N10]', fastRoomPosition(25, 25, 'E10N10'));
      return TestResult.FAIL;
    }
    if (!fastRoomPosition(25, 25, 'W10S10').isEqualTo(new RoomPosition(25, 25, 'W10S10'))) {
      console.log('fastRoomPosition [25, 25, W10S10]', fastRoomPosition(25, 25, 'W10S10'));
      return TestResult.FAIL;
    }
    if (!fastRoomPosition(25, 25, 'E10S10').isEqualTo(new RoomPosition(25, 25, 'E10S10'))) {
      console.log('fastRoomPosition [25, 25, E10S10]', fastRoomPosition(25, 25, 'E10S10'));
      return TestResult.FAIL;
    }

    // test offset
    const testPos = new RoomPosition(25, 25, 'W0N0');
    if (!offsetRoomPosition(testPos, 2, 2).isEqualTo(new RoomPosition(27, 27, 'W0N0'))) {
      console.log('offsetRoomPosition [27, 27, W0N0]', offsetRoomPosition(testPos, 2, 2));
      return TestResult.FAIL;
    }
    if (!offsetRoomPosition(testPos, -2, -2).isEqualTo(new RoomPosition(23, 23, 'W0N0'))) {
      console.log('offsetRoomPosition [23, 23, W0N0]', offsetRoomPosition(testPos, -2, -2));
      return TestResult.FAIL;
    }

    // test same room
    if (!sameRoomPosition(testPos, 27, 27).isEqualTo(new RoomPosition(27, 27, 'W0N0'))) {
      console.log('sameRoomPosition [27, 27, W0N0]', sameRoomPosition(testPos, 27, 27));
      return TestResult.FAIL;
    }
    if (!sameRoomPosition(testPos, 23, 23).isEqualTo(new RoomPosition(23, 23, 'W0N0'))) {
      console.log('sameRoomPosition [23, 23, W0N0]', sameRoomPosition(testPos, 23, 23));
      return TestResult.FAIL;
    }

    return TestResult.PASS;
  }
}
