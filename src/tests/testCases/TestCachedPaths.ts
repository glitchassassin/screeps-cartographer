import { cachePath, CachingStrategies, followPath, getCachedPath, resetCachedPath } from '../../lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

/**
 * This test simulates creating two paths to a destination, one for a road
 * and one for haulers to travel off road (when empty, fatigue doesn't matter,
 * and terrain is irrelevant)
 */
export class TestCachedPaths extends CartographerTestCase {
  _creeps = {
    c1: ''
  };
  ticksRun = 0;
  phase = 0;
  test() {
    // setup
    this.ticksRun += 1;
    const controller = this.spawn.room.controller;
    if (!controller) return TestResult.FAIL;
    const path1 = cachePath('controller1', this.spawn.pos, controller, { cache: CachingStrategies.HeapCache });
    if (!path1) return TestResult.FAIL;
    const path2 = cachePath(
      'controller2',
      this.spawn.pos,
      { pos: path1[path1.length - 1], range: 0 },
      {
        cache: CachingStrategies.HeapCache,
        roadCost: 1,
        plainCost: 1,
        swampCost: 1,
        roomCallback(room) {
          const cm = new PathFinder.CostMatrix();
          for (const pos of path1) {
            if (pos.roomName === room) cm.set(pos.x, pos.y, 50);
          }
          return cm;
        }
      }
    );

    // test begins
    if (!path2) return TestResult.FAIL;
    new RoomVisual(this.spawn.room.name).poly(path1, { stroke: 'magenta' }).poly(path2, { stroke: 'cyan' });
    if (this.phase === 0) {
      if (this.creeps.c1.pos.inRangeTo(controller, 1)) this.phase += 1;
      followPath(this.creeps.c1, 'controller1', { cache: CachingStrategies.HeapCache });
    }
    if (this.phase === 1) {
      if (this.creeps.c1.pos.inRangeTo(this.spawn, 1)) this.phase += 1;
      followPath(this.creeps.c1, 'controller2', { reverse: true, cache: CachingStrategies.HeapCache });
    }
    if (this.phase === 2) {
      if (this.creeps.c1.pos.inRangeTo(controller, 1)) this.phase += 1;
      followPath(this.creeps.c1, 'controller2', { cache: CachingStrategies.HeapCache });
    }
    if (this.phase === 3) {
      if (this.creeps.c1.pos.inRangeTo(this.spawn, 1)) this.phase += 1;
      followPath(this.creeps.c1, 'controller1', { reverse: true, cache: CachingStrategies.HeapCache });
    }

    if (this.phase === 4) {
      resetCachedPath('controller', { cache: CachingStrategies.HeapCache });
      if (!getCachedPath('controller', { cache: CachingStrategies.HeapCache })) return TestResult.PASS;
      return TestResult.FAIL;
    }
    return TestResult.PENDING;
  }
}
