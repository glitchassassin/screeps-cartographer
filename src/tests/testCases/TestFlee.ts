import { moveTo } from '../../lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestFlee extends CartographerTestCase {
  _creeps = {
    c1: ''
  };
  timeout = 50; // ticks
  lastRange = 0;
  test() {
    const RANGE = 10;
    const currentRange = this.creeps.c1.pos.getRangeTo(this.spawn)
    if (currentRange === RANGE) {
      return TestResult.PASS;
    }
    // Has edge cases, but generally, the range should never be *decreasing* while fleeing
    if (currentRange < this.lastRange) {
      return TestResult.FAIL;
    }
    this.lastRange = currentRange;
    moveTo(
      this.creeps.c1,
      { pos: this.spawn.pos, range: RANGE },
      { flee: true, keepTargetInRoom: false, visualizePathStyle: { stroke: '#00ff00' } }
    );
    return TestResult.PENDING;
  }
}
