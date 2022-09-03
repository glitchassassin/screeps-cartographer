import { moveTo } from '../../lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestFlee extends CartographerTestCase {
  _creeps = {
    c1: ''
  };
  timeout = 50; // ticks
  test() {
    const RANGE = 10;
    if (this.creeps.c1.pos.getRangeTo(this.spawn) === RANGE) {
      return TestResult.PASS;
    }
    moveTo(
      this.creeps.c1,
      { pos: this.spawn.pos, range: RANGE },
      { flee: true, keepTargetInRoom: false, visualizePathStyle: { stroke: '#00ff00' } }
    );
    return TestResult.PENDING;
  }
}
