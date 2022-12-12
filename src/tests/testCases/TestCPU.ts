import { moveTo } from '../../lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestCPU extends CartographerTestCase {
  _creeps = {
    c1: '',
    c2: ''
  };
  retries = 0;
  testRegion = {
    w: 1,
    h: 1
  };
  targetPos1: RoomPosition | undefined;
  phase: 'setup' | 'run' = 'setup';
  running: number | undefined;
  targetPos: RoomPosition | undefined = undefined;
  targetRange = 20;
  cpuUsed = {
    cartographer: 0,
    builtin: 0
  };
  test() {
    if (!this.targetPos) {
      const currentRoom = this.spawn.room;
      let adjacentRoom = Object.values(Game.map.describeExits(currentRoom.name))[0];
      adjacentRoom = Object.values(Game.map.describeExits(adjacentRoom)).filter(r => r !== currentRoom.name)[0];
      if (!adjacentRoom) throw new Error('Could not find adjacent room');
      this.targetPos = new RoomPosition(25, 25, adjacentRoom);
    }
    if (
      this.creeps.c1.pos.inRangeTo(this.targetPos, this.targetRange) &&
      this.creeps.c2.pos.inRangeTo(this.targetPos, this.targetRange)
    ) {
      console.log('CPU used by Cartographer: ' + this.cpuUsed.cartographer);
      console.log('CPU used by builtin: ' + this.cpuUsed.builtin);
      if (this.cpuUsed.cartographer < this.cpuUsed.builtin) {
        return TestResult.PASS;
      } else {
        return TestResult.FAIL;
      }
    }
    // Measure CPU to path to target pos
    if (!this.creeps.c1.pos.inRangeTo(this.targetPos, this.targetRange)) {
      const start = Game.cpu.getUsed();
      if (moveTo(this.creeps.c1, { pos: this.targetPos, range: this.targetRange }) === OK) {
        this.cpuUsed.cartographer += 0.2; // move cost in traffic management
      }
      this.cpuUsed.cartographer += Math.max(0, Game.cpu.getUsed() - start);
    }

    if (!this.creeps.c2.pos.inRangeTo(this.targetPos, this.targetRange)) {
      const start = Game.cpu.getUsed();
      this.creeps.c2.moveTo(this.targetPos, { range: this.targetRange, reusePath: 1000 });
      this.cpuUsed.builtin += Math.max(0, Game.cpu.getUsed() - start);
    }

    return TestResult.PENDING;
  }
}
