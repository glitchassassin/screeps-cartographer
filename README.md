[![docs](https://img.shields.io/badge/API-Docs-green)](https://glitchassassin.github.io/screeps-cartographer/)

# screeps-cartographer

[Cartographer](https://github.com/glitchassassin/screeps-cartographer/) is an advanced (and open source) movement library for Screeps.

## Features

- Flexible caching of paths in heap, Memory, or (eventually) segments
- Path to the closest of multiple targets
- Fully configurable to fit your needs
- Can trigger repathing when creeps are stuck
- Can cache custom paths for road-building or reuse with Cartographer's `moveByPath`
- Can set movement priorities to allow higher-priority minions to path before lower-priority minions
- Traffic management moves stationary minions out of the way of moving ones, while allowing them to keep range to a target

## Roadmap

- [x] Replacement for stock moveTo with configurable caching and full PathFinder options
- [x] Point-of-interest path caching for remotes & local economy movement
- [x] Traffic management with creep prioritization & shoving
- [ ] Long-distance travel with better paths than Game.map.findRoute yields

## Using Cartographer

For an example, see `src/tests/index.ts`.

### Setup

Call `preTick()` at the beginning of your loop:

```ts
import { preTick } from 'screeps-cartographer';
const loop = () => {
  preTick();
  // your code goes here
};
```

### Basic Movement

Call `moveTo()`, passing in a creep and the target:

```ts
// target with .pos
moveTo(creep, creep.room.storage)
// target room position
moveTo(creep, new RoomPosition(20, 24, 'W2N5'))
// target room position with range
moveTo(creep, { pos: new RoomPosition(25, 25, 'W2N5'), range: 10 })
// list of room positions (will move to closest)
moveTo(creep, [
  new RoomPosition(20, 20, 'W2N5'),
  new RoomPosition(20, 21, 'W2N5'),
  new RoomPosition(20, 22, 'W2N5'),
  new RoomPosition(20, 23, 'W2N5'),
])
// list of room positions with range (will move to closest)
moveTo(creep, [
  { pos: new RoomPosition(20, 20, 'W2N5'), range: 3 }
  { pos: new RoomPosition(20, 23, 'W2N5'), range: 3 }
])
```

You can also pass in options, including some custom flags and anything supported by PathFinder options.

```ts
// flee from target
moveTo(creep, { pos: hostileCreep.pos, range: 3 }, { flee: true });
// repath after a certain number of ticks, like stock moveTo
moveTo(creep, creep.room.storage, { reusePath: 5 });
// path around creeps (default is false)
moveTo(creep, creep.room.storage, { avoidCreeps: true });
// set repath interval when creep is stuck, and fallback
// options for the repath
moveTo(creep, creep.room.storage, { avoidCreeps: false, repathIfStuck: 5 }, { avoidCreeps: true });
// don't path around structures (default is true)
moveTo(creep, creep.room.storage, { avoidObstacleStructures: false });
// set custom terrain values
moveTo(creep, creep.room.storage, { roadCost: 5, plainCost: 1, swampCost: 1 });
```

You can find the full list of [extra options here.](https://glitchassassin.github.io/screeps-cartographer/interfaces/MoveOpts.html)

### Using Cached Paths

Instead of calling moveTo each time, you may find it more efficient to save a cached path and reuse it for multiple creeps. One common example would be pathing between storage and remote sources.

```ts
// create initial path to remote source
const path1 = cachePath(storage.room.name + source.id + '1', storage.pos, { pos: source.pos, range: 1 });
const harvestPos = path1[path1.length - 1];
// create secondary path, avoiding the road, for empty haulers
cachePath(
  storage.room.name + source.id + '2',
  storage.pos,
  { pos: path1[path1.length - 2], range: 0 }, // rejoin the first path just before the harvester
  {
    roadCost: 1,
    plainCost: 1,
    swampCost: 1,
    roomCallback(room) {
      const cm = new PathFinder.CostMatrix();
      if (room === harvestPos.roomName) {
        // harvest pos is not pathable because a creep will be here
        cm.set(harvestPos.x, harvestPos.y, 255);
      }
      for (const pos of path1) {
        if (pos.roomName === room) cm.set(pos.x, pos.y, 50);
      }
      return cm;
    }
  }
);

// build roads
const path = getCachedPath(storage.room.name + source.id + '1');
path.forEach(pos => pos.createConstructionSite(STRUCTURE_ROAD));

// move to remote source
moveByPath(haulerCreep, storage.room.name + source.id + '2');
// return home from remote source, following path
moveByPath(haulerCreep, storage.room.name + source.id + '1', { reverse: true });
```

### Traffic Management

Traffic management can be enabled by simply including the `reconcileTraffic` function in your main loop, after all creep movement has been requested:

```ts
export const loop = () => {
  runCreepLogic();
  reconcileTraffic();
};
```

If `reconcileTraffic` is not included, creeps will simply default to unmanaged movement. Be careful to run potentially expensive operations _after_ reconcileTraffic to avoid running out of bucket - your creeps _will not move_ if you run out of CPU in a tick before reconcileTraffic gets a chance to run.

`reconcileTraffic` will only manage creeps that use Cartographer to move; it does not affect Creep prototype move methods.

### Setting Movement Priorities

All move functions accept a `priority` option:

```ts
moveTo(creep, controller, { priority: 10 });
```

Creeps with a higher priority will be given preference over creeps with a lower priority: if both want to path to the same square on a given tick, the one with a higher priority will move and the one with a lower priority will not (also saving its intent cost).

## Testing Cartographer

Cartographer includes a super-minimal Screeps bot which will maintain a spawn and generate scouts to collect room intelligence. This allows roads to be generated and visualized for debugging purposes, and also enables integration tests to catch regressions.

To run the tests, simply run the build and copy the contents of `dist/test.js` to Screeps. The tests will reset and run again automatically after a global reset. Test output is logged to the console.
