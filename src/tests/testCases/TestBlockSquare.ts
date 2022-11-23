import { blockSquare, moveTo } from '../../lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestBlockSquare extends CartographerTestCase {
  _creeps = {
    c1: ''
  };
  timeout = 50; // ticks
  testRegion = {
    w: 2,
    h: 1
  };
  targetPos1: RoomPosition | undefined;
  targetPos2: RoomPosition | undefined;
  phase = 0;
  retries = 0;
  test() {
    if (!this.testRegionOrigin) return TestResult.PENDING;
    this.targetPos1 ??= new RoomPosition(
      this.testRegionOrigin.x,
      this.testRegionOrigin.y,
      this.testRegionOrigin.roomName
    );
    this.targetPos2 ??= new RoomPosition(
      this.testRegionOrigin.x + 1,
      this.testRegionOrigin.y,
      this.testRegionOrigin.roomName
    );
    if (this.phase === 0) {
      if (this.creeps.c1.pos.isEqualTo(this.targetPos1)) this.phase += 1;
      // arrange creeps
      moveTo(this.creeps.c1, { pos: this.targetPos1, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
    } else if (this.phase === 1) {
      if (this.creeps.c1.pos.isEqualTo(this.targetPos2)) {
        return TestResult.PASS;
      }
      // block the creep's current square
      blockSquare(this.targetPos1);
      moveTo(
        this.creeps.c1,
        [
          { pos: this.targetPos1, range: 0 },
          { pos: this.targetPos2, range: 0 }
        ],
        { priority: 2, visualizePathStyle: { stroke: '#00ff00' } }
      );
    }
    return TestResult.PENDING;
  }
}
