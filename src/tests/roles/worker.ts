import { moveTo } from 'lib';

declare global {
  interface CreepMemory {
    state?: 'HARVEST' | 'UPGRADE' | 'DEPOSIT';
    harvestSource?: Id<Source>;
    room: string;
  }
}

export const worker = {
  spawn: (spawn: StructureSpawn) => {
    spawn.spawnCreep([WORK, MOVE, MOVE, CARRY], `${spawn.room.name}_WORKER_${Game.time % 10000}`, {
      memory: { room: spawn.room.name, role: 'worker' }
    });
  },
  run: (creep: Creep) => {
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

      moveTo(creep, source, { visualizePathStyle: { stroke: 'cyan' } });
      creep.harvest(source);

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

    if (creep.memory.state === 'UPGRADE') {
      const controller = Game.rooms[creep.memory.room].controller;
      if (!controller) {
        creep.memory.state = 'DEPOSIT';
        return;
      }
      moveTo(creep, { pos: controller.pos, range: 3 }, { visualizePathStyle: { stroke: 'cyan' } });
      creep.upgradeController(controller);
      if (creep.store.getUsedCapacity() === 0) {
        creep.memory.state = 'HARVEST';
      }
    }

    if (creep.memory.state === 'DEPOSIT') {
      const [spawn] = Game.rooms[creep.memory.room].find(FIND_MY_SPAWNS);
      if (!spawn || spawn.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.state = 'UPGRADE';
        return;
      }
      moveTo(creep, spawn, { visualizePathStyle: { stroke: 'cyan' } });
      creep.transfer(spawn, RESOURCE_ENERGY);
      if (creep.store.getUsedCapacity() === 0) {
        creep.memory.state = 'HARVEST';
      }
    }
  }
};
