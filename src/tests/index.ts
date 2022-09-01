import { preTick, reconcileTraffic } from 'lib';
import { scout } from './roles/scout';
import { worker } from './roles/worker';
import { runTestCases } from './testCases';

export const runTestScenarios = () => {
  for (const name in Memory.creeps) {
    if (!Game.creeps[name]) delete Memory.creeps[name];
  }

  preTick();

  for (const room in Game.rooms) {
    spawn(room);
  }
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    if (!creep.spawning && creep.memory.role) roles[creep.memory.role](creep);
  }
  runTestCases();

  reconcileTraffic();

  visualizeIntel();
  // profileReport();
};

declare global {
  interface CreepMemory {
    role?: 'worker' | 'scout';
    room: string;
  }
}

Memory.rooms ??= {};

const spawn = (room: string) => {
  const [spawn] = Game.rooms[room].find(FIND_MY_SPAWNS).filter(s => !s.spawning);
  if (!spawn) return;
  const creeps = Object.keys(Game.creeps).filter(name => name.startsWith(room));
  if (creeps.filter(name => name.includes('WORKER')).length < 6) {
    // spawn a worker
    worker.spawn(spawn);
  } else if (creeps.filter(name => name.includes('SCOUT')).length < 6) {
    // spawn a scout
    scout.spawn(spawn);
  }
};

const roles = {
  worker: worker.run,
  scout: scout.run
};

const visualizeIntel = () => {
  for (const room in Memory.rooms) {
    if (Memory.rooms[room].visited) {
      Game.map.visual.text('✓', new RoomPosition(25, 25, room));
    } else {
      Game.map.visual.text('...', new RoomPosition(25, 25, room));
    }
  }
};
