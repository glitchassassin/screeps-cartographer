import { moveTo } from '../../lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestStuck extends CartographerTestCase {
  _creeps = {
    c1: '',
    c2: ''
  };
  timeout = 50; // ticks
  testRegion = {
    w: 2,
    h: 2
  };
  targetPos1: RoomPosition | undefined;
  targetPos2: RoomPosition | undefined;
  targetPos3: RoomPosition | undefined;
  phase: 'setup' | 'run' = 'setup';
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
    this.targetPos3 ??= new RoomPosition(
      this.testRegionOrigin.x + 1,
      this.testRegionOrigin.y + 1,
      this.testRegionOrigin.roomName
    );
    if (this.phase === 'setup') {
      if (this.creeps.c1.pos.isEqualTo(this.targetPos1) && this.creeps.c2.pos.isEqualTo(this.targetPos2))
        this.phase = 'run';
      // arrange creeps
      moveTo(this.creeps.c1, { pos: this.targetPos1, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
      moveTo(this.creeps.c2, { pos: this.targetPos2, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
    } else {
      if (this.creeps.c1.pos.isEqualTo(this.targetPos3)) return TestResult.PASS;
      // try to move through a creep
      moveTo(this.creeps.c1, { pos: this.targetPos3, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
      moveTo(this.creeps.c2, { pos: this.targetPos2, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
    }
    return TestResult.PENDING;
  }
}
