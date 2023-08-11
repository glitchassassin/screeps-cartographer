import { cachePath, moveByPath, moveTo, resetCachedPath } from '../../lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

/**
 * This test simulates following a cached path to a destination
 * while avoiding an enemy along the path
 */
export class TestDynamicAvoidance extends CartographerTestCase {
  _creeps = {
    c1: '',
  };
  phase = 0;
  targetPos?: RoomPosition;
  avoidanceSquare?: RoomPosition;
  test() {
    // setup
    const controller = this.spawn.room.controller;
    if (!controller) throw new Error('No controller');
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
    const path1 = cachePath('pos1', this.spawn.pos, this.targetPos, { reusePath: CREEP_LIFE_TIME });
    if (!path1) throw new Error('pos1 path failed to generate');

    this.avoidanceSquare = path1[6];
    if (!this.avoidanceSquare) throw new Error('could not pick avoidance square')

    const avoidTargets = (room: string) => {
      if (room === this.avoidanceSquare?.roomName) return [
        { pos: this.avoidanceSquare, range: 3 }
      ]
      return [];
    }


    // test moving by path
    if (this.phase === 0) {
      if (this.creeps.c1.pos.getRangeTo(this.spawn.pos) > 1) this.phase += 1;
      moveByPath(this.creeps.c1, 'pos1', { visualizePathStyle: { stroke: '#00ffff' } });
    }
    if (this.phase === 1) {
      if (this.creeps.c1.pos.inRangeTo(this.avoidanceSquare, 3)) return TestResult.FAIL; // got too close to enemy
      if (this.creeps.c1.pos.inRangeTo(this.targetPos, 3)) this.phase += 1;
      Game.rooms[this.avoidanceSquare.roomName].visual.circle(this.avoidanceSquare, { radius: 0.5, fill: '#ff0000' }).rect(this.avoidanceSquare.x - 3.5, this.avoidanceSquare.y - 3.5, 7, 7, { stroke: '#ff0000', fill: 'transparent' });
      moveByPath(this.creeps.c1, 'pos1', { avoidTargets, visualizePathStyle: { stroke: '#ffffff' } });
    }

    // test moving by moveTo
    if (this.phase === 2) {
      if (this.creeps.c1.pos.inRangeTo(this.spawn.pos, 1)) this.phase += 1;
      moveTo(this.creeps.c1, this.spawn.pos, { visualizePathStyle: { stroke: '#00ffff' } })
    }
    if (this.phase === 3) {
      if (this.creeps.c1.pos.getRangeTo(this.spawn.pos) > 2) this.phase += 1;
      moveTo(this.creeps.c1, this.targetPos, { visualizePathStyle: { stroke: '#ffffff' } })
    }
    if (this.phase === 4) {
      if (this.creeps.c1.pos.inRangeTo(this.targetPos, 3)) return TestResult.PASS;
      if (this.creeps.c1.pos.inRangeTo(this.avoidanceSquare, 3)) return TestResult.FAIL; // got too close to enemy
      Game.rooms[this.avoidanceSquare.roomName].visual.circle(this.avoidanceSquare, { radius: 0.5, fill: '#ff0000' }).rect(this.avoidanceSquare.x - 3.5, this.avoidanceSquare.y - 3.5, 7, 7, { stroke: '#ff0000', fill: 'transparent' });
      moveTo(this.creeps.c1, this.targetPos, { avoidTargets, visualizePathStyle: { stroke: '#ffffff' } })
    }
    return TestResult.PENDING;
  }

  cleanup() {
    super.cleanup();
    resetCachedPath('pos1');
    this.phase = 0;
  }
}
