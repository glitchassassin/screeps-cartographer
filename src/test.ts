import { moveTo } from 'lib/Cartographer';
import { packPos, packPosList } from 'utils/packrat';

export const runTestScenarios = () => {
  for (const room in Game.rooms) {
    spawn(room);
  }
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    roles[creep.memory.role](creep);
  }
  visualizeIntel();
};

declare global {
  interface CreepMemory {
    state?: 'HARVEST' | 'UPGRADE' | 'DEPOSIT';
    role: 'worker' | 'scout';
    harvestSource?: Id<Source>;
    room: string;
    scoutTarget?: string;
  }
  interface RoomMemory {
    visited?: boolean;
    sources?: string;
    controller?: string;
    exits?: string;
  }
}

Memory.rooms ??= {};

const spawn = (room: string) => {
  const [spawn] = Game.rooms[room].find(FIND_MY_SPAWNS).filter(s => !s.spawning);
  if (!spawn) return;
  const creeps = Object.keys(Game.creeps).filter(name => name.startsWith(room));
  if (creeps.filter(name => name.includes('WORKER')).length < 6) {
    // spawn a worker
    spawn.spawnCreep([WORK, MOVE, MOVE, CARRY], `${room}_WORKER_${Game.time % 10000}`, {
      memory: { room, role: 'worker' }
    });
  } else if (creeps.filter(name => name.includes('SCOUT')).length < 6) {
    // spawn a scout
    spawn.spawnCreep([MOVE], `${room}_SCOUT_${Game.time % 10000}`, {
      memory: { room, role: 'scout' }
    });
  }
};

const roles = {
  worker: (creep: Creep) => {
    if (!creep.memory.state || creep.memory.state === 'HARVEST') {
      creep.memory.state = 'HARVEST';
      if (!creep.memory.harvestSource) {
        const sources = Game.rooms[creep.memory.room].find(FIND_SOURCES_ACTIVE);
        const target = sources[Math.floor(Math.random() * sources.length)];
        if (!target && creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
          creep.memory.state = 'DEPOSIT';
          return;
        }
        creep.memory.harvestSource = target?.id;
      }
      if (!creep.memory.harvestSource) return;

      const source = Game.getObjectById(creep.memory.harvestSource);
      if (!source) return;

      if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
        moveTo(creep, source);
      } else {
        if (creep.store.getFreeCapacity() === 0) {
          delete creep.memory.harvestSource;
          const ttd = Game.rooms[creep.memory.room].controller?.ticksToDowngrade;
          if (ttd && ttd < 3000) {
            creep.memory.state = 'UPGRADE';
          } else {
            creep.memory.state = 'DEPOSIT';
          }
        }
      }
    }

    if (creep.memory.state === 'UPGRADE') {
      const controller = Game.rooms[creep.memory.room].controller;
      if (!controller) {
        creep.memory.state = 'DEPOSIT';
        return;
      }
      if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
        moveTo(creep, controller);
      } else {
        if (creep.store.getUsedCapacity() === 0) {
          creep.memory.state = 'HARVEST';
        }
      }
    }

    if (creep.memory.state === 'DEPOSIT') {
      const [spawn] = Game.rooms[creep.memory.room].find(FIND_MY_SPAWNS);
      if (!spawn || spawn.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.state = 'UPGRADE';
        return;
      }
      if (creep.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        moveTo(creep, spawn);
      } else {
        if (creep.store.getUsedCapacity() === 0) {
          creep.memory.state = 'HARVEST';
        }
      }
    }
  },
  scout: (creep: Creep) => {
    // Store intel
    if (!Memory.rooms[creep.pos.roomName]?.visited) {
      Memory.rooms[creep.pos.roomName] = {
        visited: true,
        sources: packPosList(creep.room.find(FIND_SOURCES).map(s => s.pos)),
        controller: creep.room.controller ? packPos(creep.room.controller.pos) : undefined,
        exits: packPosList(creep.room.find(FIND_EXIT))
      };
      Object.values(Game.map.describeExits(creep.pos.roomName)).forEach(
        adjacentRoom => (Memory.rooms[adjacentRoom] ??= {})
      );
    }

    // If we reached the previous target, pick a new one
    if (creep.pos.roomName === creep.memory.scoutTarget) {
      delete creep.memory.scoutTarget;
      for (const room in Memory.rooms) {
        if (!Memory.rooms[room].visited && !Object.values(Game.creeps).some(c => c.memory.scoutTarget === room)) {
          creep.memory.scoutTarget = room;
          break;
        }
      }
    }
    if (!creep.memory.scoutTarget) return; // no more rooms to scout

    moveTo(creep, { pos: new RoomPosition(25, 25, creep.memory.scoutTarget), range: 20 });
  }
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
