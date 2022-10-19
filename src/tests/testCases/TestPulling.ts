import { follow, moveTo } from '../../lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestPulling extends CartographerTestCase {
  _creeps = {
    t1: '',
    t2: ''
  };
  timeout = 50; // ticks
  retries = 0;
  testRegion = {
    w: 2,
    h: 1
  };
  targetPos1: RoomPosition | undefined;
  targetPos2: RoomPosition | undefined;
  phase: number = 0;
  running: number | undefined;
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
      if (this.creeps.t1.pos.isEqualTo(this.targetPos1) && this.creeps.t2.pos.isEqualTo(this.targetPos2))
        this.phase = 1;
      // arrange creeps
      moveTo(this.creeps.t1, { pos: this.targetPos1, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
      moveTo(this.creeps.t2, { pos: this.targetPos2, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
    } else if (this.phase === 1) {
      this.running ??= Game.time;
      if (!this.creeps.t1.pos.isEqualTo(this.targetPos1) || !this.creeps.t2.pos.isEqualTo(this.targetPos2))
        return TestResult.FAIL;
      if (this.running + 2 <= Game.time) {
        this.running = Game.time;
        this.phase = 2; // puller did not move
      }
      // if puller wants to stay put, it should not be shoved out of its square
      moveTo(this.creeps.t1, { pos: this.targetPos1, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
      follow(this.creeps.t2, this.creeps.t1);
    } else {
      this.running ??= Game.time;
      if (!this.creeps.t1.pos.isEqualTo(this.targetPos1) || !this.creeps.t2.pos.isEqualTo(this.targetPos2))
        return TestResult.FAIL;
      if (this.running + 2 <= Game.time) return TestResult.PASS; // puller did not move
      // if puller wants to stay in one of a few squares, it should not be shoved out of its square
      moveTo(
        this.creeps.t1,
        [
          { pos: this.targetPos1, range: 0 },
          { pos: this.targetPos2, range: 0 }
        ],
        { visualizePathStyle: { stroke: '#00ff00' } }
      );
      follow(this.creeps.t2, this.creeps.t1);
    }
    return TestResult.PENDING;
  }
}
