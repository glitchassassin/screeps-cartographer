import { moveTo } from '../../lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestStuck extends CartographerTestCase {
  _creeps = {
    c1: '',
    c2: '',
    c3: '',
    c4: ''
  };
  timeout = 50; // ticks
  testRegion = {
    w: 3,
    h: 3
  };
  targetPos1: RoomPosition | undefined;
  blockingPos1: RoomPosition | undefined;
  blockingPos2: RoomPosition | undefined;
  blockingPos3: RoomPosition | undefined;
  targetPos2: RoomPosition | undefined;
  phase: 'setup' | 'run' = 'setup';
  test() {
    if (!this.testRegionOrigin) return TestResult.PENDING;
    this.targetPos1 ??= new RoomPosition(
      this.testRegionOrigin.x + 1,
      this.testRegionOrigin.y,
      this.testRegionOrigin.roomName
    );
    this.blockingPos1 ??= new RoomPosition(
      this.testRegionOrigin.x,
      this.testRegionOrigin.y + 1,
      this.testRegionOrigin.roomName
    );
    this.blockingPos2 ??= new RoomPosition(
      this.testRegionOrigin.x + 1,
      this.testRegionOrigin.y + 1,
      this.testRegionOrigin.roomName
    );
    this.blockingPos3 ??= new RoomPosition(
      this.testRegionOrigin.x + 2,
      this.testRegionOrigin.y + 1,
      this.testRegionOrigin.roomName
    );
    this.targetPos2 ??= new RoomPosition(
      this.testRegionOrigin.x + 1,
      this.testRegionOrigin.y + 2,
      this.testRegionOrigin.roomName
    );
    if (this.phase === 'setup') {
      if (
        this.creeps.c1.pos.isEqualTo(this.targetPos1) &&
        this.creeps.c2.pos.isEqualTo(this.blockingPos1) &&
        this.creeps.c3.pos.isEqualTo(this.blockingPos2) &&
        this.creeps.c4.pos.isEqualTo(this.blockingPos3)
      )
        this.phase = 'run';
      // arrange creeps
      moveTo(this.creeps.c1, { pos: this.targetPos1, range: 0 }, { visualizePathStyle: { stroke: '#ff0000' } });
      moveTo(this.creeps.c2, { pos: this.blockingPos1, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
      moveTo(this.creeps.c3, { pos: this.blockingPos2, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
      moveTo(this.creeps.c4, { pos: this.blockingPos3, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
    } else {
      if (this.creeps.c1.pos.isEqualTo(this.targetPos2)) return TestResult.PASS;
      // try to move through a creep
      moveTo(this.creeps.c1, { pos: this.targetPos2, range: 0 }, { visualizePathStyle: { stroke: '#ff0000' } });
      moveTo(this.creeps.c2, { pos: this.blockingPos1, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
      moveTo(this.creeps.c3, { pos: this.blockingPos2, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
      moveTo(this.creeps.c4, { pos: this.blockingPos3, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
    }
    return TestResult.PENDING;
  }
}
