import { fixEdgePosition, isExit, moveTo } from '../../lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestRoomEdgeRange extends CartographerTestCase {
  _creeps = {
    c1: ''
  };
  timeout = 50; // ticks
  targetPos: RoomPosition | undefined = undefined;
  test() {
    if (!this.targetPos) {
      const currentRoom = this.spawn.room;
      let adjacentRoom = Object.values(Game.map.describeExits(currentRoom.name))[0];
      if (!adjacentRoom) throw new Error('Could not find adjacent room');
      let exitDirection = currentRoom.findExitTo(adjacentRoom);
      if (exitDirection === ERR_NO_PATH || exitDirection === ERR_INVALID_ARGS)
        throw new Error('Could not find exit direction');
      let exit = currentRoom.find(exitDirection)[0];
      if (!exit) throw new Error('Could not find exit');

      // get square on opposite side of exit
      if (exit.x === 0) {
        this.targetPos = new RoomPosition(48, exit.y, adjacentRoom);
      } else if (exit.x === 49) {
        this.targetPos = new RoomPosition(1, exit.y, adjacentRoom);
      } else if (exit.y === 0) {
        this.targetPos = new RoomPosition(exit.x, 48, adjacentRoom);
      } else if (exit.y === 49) {
        this.targetPos = new RoomPosition(exit.x, 1, adjacentRoom);
      } else {
        throw new Error('exit square not on edge');
      }
    }

    if (!fixEdgePosition({ pos: this.targetPos, range: 1}).some(({ pos, range }) => pos.inRangeTo(this.targetPos!, range))) {
      throw new Error('Target square not included in edge breakdown')
    }
    
    if (
      this.creeps.c1.pos.inRangeTo(this.targetPos, 5) &&
      !isExit(this.creeps.c1.pos) &&
      this.creeps.c1.pos.roomName === this.targetPos.roomName
    ) {
      return TestResult.PASS;
    }
    moveTo(this.creeps.c1, { pos: this.targetPos, range: 5 }, { visualizePathStyle: { stroke: '#00ff00' } });
    return TestResult.PENDING;
  }
}
