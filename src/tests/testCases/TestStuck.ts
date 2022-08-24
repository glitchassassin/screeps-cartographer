import { moveTo } from 'lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestStuck extends CartographerTestCase {
  _creeps = {
    c1: '',
    c2: ''
  };
  timeout = 50; // ticks
  targetPos1: RoomPosition | undefined;
  targetPos2: RoomPosition | undefined;
  targetPos3: RoomPosition | undefined;
  phase: 'setup' | 'run' = 'setup';
  test() {
    this.targetPos1 ??= new RoomPosition(this.spawn.pos.x, this.spawn.pos.y + 2, this.spawn.pos.roomName);
    this.targetPos2 ??= new RoomPosition(this.spawn.pos.x, this.spawn.pos.y + 3, this.spawn.pos.roomName);
    this.targetPos3 ??= new RoomPosition(this.spawn.pos.x, this.spawn.pos.y + 4, this.spawn.pos.roomName);
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
