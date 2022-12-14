import { moveTo } from '../../lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestDeadlock extends CartographerTestCase {
  _creeps = {
    c1: '',
    c2: '',
    c3: ''
  };
  timeout = 50; // ticks
  retries = 0;
  testRegion = {
    w: 3,
    h: 1
  };
  targetPos1: RoomPosition | undefined;
  targetPos2: RoomPosition | undefined;
  targetPos3: RoomPosition | undefined;
  phase: 'setup' | 'run' = 'setup';
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
    this.targetPos3 ??= new RoomPosition(
      this.testRegionOrigin.x + 2,
      this.testRegionOrigin.y,
      this.testRegionOrigin.roomName
    );
    if (this.phase === 'setup') {
      if (
        this.creeps.c1.pos.isEqualTo(this.targetPos1) &&
        this.creeps.c2.pos.isEqualTo(this.targetPos2) &&
        this.creeps.c3.pos.isEqualTo(this.targetPos3)
      )
        this.phase = 'run';
      // arrange creeps
      moveTo(this.creeps.c1, { pos: this.targetPos1, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
      moveTo(this.creeps.c2, { pos: this.targetPos2, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
      moveTo(this.creeps.c3, { pos: this.targetPos3, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
    } else {
      this.running ??= Game.time;
      if (this.creeps.c3.pos.isEqualTo(this.targetPos2)) return TestResult.PASS;
      if (this.running + 2 <= Game.time) return TestResult.FAIL; // did not swap
      moveTo(
        this.creeps.c1,
        { pos: this.targetPos2, range: 0 },
        { priority: 2, visualizePathStyle: { stroke: '#00ff00' } }
      );
      moveTo(this.creeps.c2, { pos: this.targetPos3, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
      moveTo(this.creeps.c3, { pos: this.targetPos2, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
    }
    return TestResult.PENDING;
  }
}
