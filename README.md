[![docs](https://img.shields.io/badge/API-Docs-green)](https://glitchassassin.github.io/screeps-cartographer/)

# screeps-cartographer

Cartographer is an advanced (and open source) movement library for Screeps

## Using Cartographer

For an example, see `src/test.ts`.

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
moveTo(creep, hostileCreep, { flee: true });
// repath after a certain number of ticks, like stock moveTo
moveTo(creep, hostileCreep, { reusePath: 5 });
// path around creeps (default is false)
moveTo(creep, creep.room.storage, { avoidCreeps: true });
// don't path around structures (default is false)
moveTo(creep, creep.room.storage, { avoidObstacleStructures: false });
// set custom terrain values
moveTo(creep, creep.room.storage, { roadCost: 5, plainCost: 1, swampCost: 1 });
```

You can find the full list of [extra options here.](https://glitchassassin.github.io/screeps-cartographer/interfaces/MoveOpts.html)

## Testing Cartographer

Cartographer includes a super-minimal Screeps bot which will maintain a spawn and generate scouts to collect room intelligence. This allows roads to be generated and visualized for debugging purposes, and also enables integration tests to catch regressions.

To run the tests, simply run the build and copy the contents of `dist/main.js` to Screeps. The tests will reset and run again automatically after a global reset. Test output is logged to the console.
