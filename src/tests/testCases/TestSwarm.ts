import { moveTo } from 'lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestSwarm extends CartographerTestCase {
  _creeps = new Array(9)
    .fill(0)
    .map((_, i) => 'c' + i)
    .reduce((sum, key) => {
      sum[key] = '';
      return sum;
    }, {} as Record<string, string>);
  timeout = 1000; // ticks
  retries = 0;
  testRegion = {
    w: 3,
    h: 3
  };
  targetPos1: RoomPosition | undefined;
  running: number | undefined;
  test() {
    if (!this.testRegionOrigin) return TestResult.PENDING;
    this.targetPos1 ??= new RoomPosition(
      this.testRegionOrigin.x + 1,
      this.testRegionOrigin.y + 1,
      this.testRegionOrigin.roomName
    );
    let done = true;
    for (const creep in this.creeps) {
      moveTo(this.creeps[creep], { pos: this.targetPos1, range: 1 });
      if (!this.creeps[creep].pos.inRangeTo(this.targetPos1, 1)) done = false;
    }
    if (done) return TestResult.PASS;
    return TestResult.PENDING;
  }
}
