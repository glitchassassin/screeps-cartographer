import { getRangeTo } from 'main';
import { isPositionWalkable, moveTo } from '../../lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

function getSquaresByAvailableExits(room: Room) {
  // flee square should be 8 tiles away from an exit square; start square
  // will be between the flee square and the exit

  // left exit available?
  let exit = room.find(FIND_EXIT_LEFT)[0];
  if (exit) {
    const fleeSquare = new RoomPosition(exit.x + 8, exit.y, exit.roomName);
    for (let i = 6; i > 0; i--) {
      if (isPositionWalkable(new RoomPosition(exit.x + i, exit.y, exit.roomName))) {
        return {
          fleeSquare,
          startSquare: new RoomPosition(exit.x + i, exit.y, exit.roomName)
        };
      }
    }
  }

  // right exit available?
  exit = room.find(FIND_EXIT_RIGHT)[0];
  if (exit) {
    const fleeSquare = new RoomPosition(exit.x - 8, exit.y, exit.roomName);
    for (let i = 6; i > 0; i--) {
      if (isPositionWalkable(new RoomPosition(exit.x - i, exit.y, exit.roomName))) {
        return {
          fleeSquare,
          startSquare: new RoomPosition(exit.x - i, exit.y, exit.roomName)
        };
      }
    }
  }

  // top exit available?
  exit = room.find(FIND_EXIT_TOP)[0];
  if (exit) {
    const fleeSquare = new RoomPosition(exit.x, exit.y + 8, exit.roomName);
    for (let i = 6; i > 0; i--) {
      if (isPositionWalkable(new RoomPosition(exit.x, exit.y + i, exit.roomName))) {
        return {
          fleeSquare,
          startSquare: new RoomPosition(exit.x, exit.y + i, exit.roomName)
        };
      }
    }
  }

  // bottom exit available?
  exit = room.find(FIND_EXIT_BOTTOM)[0];
  if (exit) {
    const fleeSquare = new RoomPosition(exit.x, exit.y - 8, exit.roomName);
    for (let i = 6; i > 0; i--) {
      if (isPositionWalkable(new RoomPosition(exit.x, exit.y - i, exit.roomName))) {
        return {
          fleeSquare,
          startSquare: new RoomPosition(exit.x, exit.y - i, exit.roomName)
        };
      }
    }
  }

  throw new Error('Could not find an exit to test flee behavior');
}

export class TestFlee extends CartographerTestCase {
  _creeps = {
    c1: ''
  };
  timeout = 100; // ticks
  lastRange = 0;
  fleeSquare?: RoomPosition;
  startSquare?: RoomPosition;
  phase = 0;
  test() {
    if (!this.fleeSquare || !this.startSquare) {
      const squares = getSquaresByAvailableExits(this.spawn.room);
      this.fleeSquare = squares.fleeSquare;
      this.startSquare = squares.startSquare;
    }

    const RANGE = 10;

    this.spawn.room.visual.rect(
      this.fleeSquare.x - 0.5 - RANGE,
      this.fleeSquare.y - 0.5 - RANGE,
      RANGE * 2 + 1,
      RANGE * 2 + 1,
      { fill: 'transparent', stroke: '#ff0000' }
    );

    if (this.phase === 0) {
      // move to start square
      moveTo(this.creeps.c1, { pos: this.startSquare, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
      if (this.creeps.c1.pos.isEqualTo(this.startSquare)) {
        this.phase += 1;
      }
    }
    if (this.phase === 1) {
      // flee within the same room
      moveTo(
        this.creeps.c1,
        { pos: this.fleeSquare, range: RANGE },
        { flee: true, visualizePathStyle: { stroke: '#00ff00' } }
      );
      if (this.creeps.c1.pos.roomName !== this.fleeSquare.roomName) {
        return TestResult.FAIL;
      }
      if (this.creeps.c1.pos.getRangeTo(this.fleeSquare) === RANGE) {
        this.phase += 1;
      }
    }
    if (this.phase === 2) {
      // return to start square
      moveTo(this.creeps.c1, { pos: this.startSquare, range: 0 });
      if (this.creeps.c1.pos.isEqualTo(this.startSquare)) {
        this.phase += 1;
      }
    }
    if (this.phase === 3) {
      // allow fleeing out of the room
      moveTo(
        this.creeps.c1,
        { pos: this.fleeSquare, range: RANGE },
        { flee: true, keepTargetInRoom: false, visualizePathStyle: { stroke: '#00ff00' } }
      );
      if (getRangeTo(this.creeps.c1.pos, this.fleeSquare) === RANGE) {
        return TestResult.PASS;
      }
    }

    return TestResult.PENDING;
  }

  cleanup(): void {
    this.phase = 0;
  }
}
