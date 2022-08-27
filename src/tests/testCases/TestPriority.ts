import { moveTo } from 'lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestPriority extends CartographerTestCase {
  _creeps = {
    c1: '',
    c2: ''
  };
  timeout = 50; // ticks
  targetPos1: RoomPosition | undefined;
  targetPos2: RoomPosition | undefined;
  targetPos3: RoomPosition | undefined;
  phase = 0;
  retries = 0;
  test() {
    this.targetPos1 ??= new RoomPosition(this.spawn.pos.x - 2, this.spawn.pos.y, this.spawn.pos.roomName);
    this.targetPos2 ??= new RoomPosition(this.spawn.pos.x - 3, this.spawn.pos.y, this.spawn.pos.roomName);
    this.targetPos3 ??= new RoomPosition(this.spawn.pos.x - 3, this.spawn.pos.y - 1, this.spawn.pos.roomName);
    if (this.phase === 0) {
      if (this.creeps.c1.pos.isEqualTo(this.targetPos1) && this.creeps.c2.pos.isEqualTo(this.targetPos2))
        this.phase += 1;
      // arrange creeps
      moveTo(this.creeps.c1, { pos: this.targetPos1, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
      moveTo(this.creeps.c2, { pos: this.targetPos2, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
    } else if (this.phase === 1) {
      if (this.creeps.c1.pos.isEqualTo(this.targetPos3)) this.phase += 1;
      if (this.creeps.c2.pos.isEqualTo(this.targetPos3)) return TestResult.FAIL;
      // try to move through a creep
      moveTo(
        this.creeps.c1,
        { pos: this.targetPos3, range: 0 },
        { priority: 2, visualizePathStyle: { stroke: '#00ff00' } }
      );
      moveTo(
        this.creeps.c2,
        { pos: this.targetPos3, range: 0 },
        { priority: 1, visualizePathStyle: { stroke: '#00ff00' } }
      );
    } else {
      if (this.creeps.c2.pos.isEqualTo(this.targetPos1)) return TestResult.PASS;
      if (this.creeps.c1.pos.isEqualTo(this.targetPos1)) return TestResult.FAIL;
      // try to move through a creep
      moveTo(
        this.creeps.c1,
        { pos: this.targetPos1, range: 0 },
        { priority: 1, visualizePathStyle: { stroke: '#00ff00' } }
      );
      moveTo(
        this.creeps.c2,
        { pos: this.targetPos1, range: 0 },
        { priority: 2, visualizePathStyle: { stroke: '#00ff00' } }
      );
    }
    return TestResult.PENDING;
  }
}
