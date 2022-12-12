import { preTick, reconcileTraffic } from '../lib';
import { scout } from './roles/scout';
import { worker } from './roles/worker';
import { runTestCases, testCasesComplete } from './testCases';

let trafficCpu: number[] = [];

export const runTestScenarios = () => {
  for (const name in Memory.creeps) {
    if (!Game.creeps[name]) delete Memory.creeps[name];
  }

  preTick();

  let spawning = false;

  for (const room in Game.rooms) {
    spawning ||= spawn(room);
  }
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    if (!creep.spawning && creep.memory.role) roles[creep.memory.role](creep);
  }
  if (!spawning) runTestCases();

  const start = Game.cpu.getUsed();
  reconcileTraffic({ visualize: true });
  const cpuUsed = Game.cpu.getUsed() - start;
  trafficCpu.push(cpuUsed / Object.keys(Game.creeps).length);
  if (trafficCpu.length && Game.time % 100 === 0) {
    // track last 100 ticks
    trafficCpu = trafficCpu.slice(-100);
    console.log(
      `Average CPU used by traffic management: ${(trafficCpu.reduce((a, b) => a + b, 0) / trafficCpu.length).toFixed(
        2
      )} per creep`
    );
  }

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
  if (!spawn) return false;
  const creeps = Object.keys(Game.creeps).filter(name => name.startsWith(room));
  if (creeps.filter(name => name.includes('WORKER')).length < 6) {
    // spawn a worker
    worker.spawn(spawn);
    return true;
  } else if (testCasesComplete && creeps.filter(name => name.includes('SCOUT')).length < 6) {
    // spawn a scout
    scout.spawn(spawn);
    return true;
  }
  return false;
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
