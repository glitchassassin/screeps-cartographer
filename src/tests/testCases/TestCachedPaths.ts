import { config } from 'config';
import { MemoryCache } from 'lib/CachingStrategies/Memory';
import { PositionListSerializer, cachePath, getCachedPath, moveByPath, resetCachedPath } from '../../lib';
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
    if (!controller) throw new Error('No controller');
    const path1 = cachePath('controller1', this.spawn.pos, controller, { reusePath: CREEP_LIFE_TIME });
    if (!path1) throw new Error('controller1 path failed to generate');
    const path2 = cachePath(
      'controller2',
      this.spawn.pos,
      { pos: path1[path1.length - 1], range: 0 },
      {
        reusePath: CREEP_LIFE_TIME,
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
    if (!path2) throw new Error('controller1 path failed to generate');

    // Test if now-incompatible cached paths break anything
    MemoryCache.set('test_incompatible_path', 'this is not a real path and will break if we try to parse it');
    const path = MemoryCache.with(PositionListSerializer).get('test_incompatible_path');
    if (path !== undefined) {
      console.log('[TestCachedPaths] Expected bogus cached path to be undefined, was', JSON.stringify(path));
      return TestResult.FAIL;
    }

    if (this.ticksRun === 1) {
      cachePath('expiration_test', this.spawn.pos, controller, { reusePath: 10 });
    } else if (this.ticksRun > 11) {
      if (getCachedPath('expiration_test')) throw new Error('Expired path was not cleaned up');
    }

    if (!Memory[config.MEMORY_CACHE_PATH]['_poi_controller1']) throw new Error('Could not find path in Memory');
    if (!Memory[config.MEMORY_CACHE_EXPIRATION_PATH]['_poi_controller1'])
      throw new Error('Could not find path expiration in Memory');

    // test begins
    new RoomVisual(this.spawn.room.name).poly(path1, { stroke: 'magenta' }).poly(path2, { stroke: 'cyan' });
    if (this.phase === 0) {
      if (this.creeps.c1.pos.inRangeTo(controller, 1)) this.phase += 1;
      moveByPath(this.creeps.c1, 'controller1');
    }
    if (this.phase === 1) {
      if (this.creeps.c1.pos.inRangeTo(this.spawn, 1)) this.phase += 1;
      moveByPath(this.creeps.c1, 'controller2', { reverse: true });
    }
    if (this.phase === 2) {
      if (this.creeps.c1.pos.inRangeTo(controller, 1)) this.phase += 1;
      moveByPath(this.creeps.c1, 'controller2');
    }
    if (this.phase === 3) {
      if (this.creeps.c1.pos.inRangeTo(this.spawn, 1)) this.phase += 1;
      moveByPath(this.creeps.c1, 'controller1', { reverse: true });
    }

    if (this.phase === 4) {
      resetCachedPath('controller1');
      resetCachedPath('controller2');
      if (!getCachedPath('controller1') && !getCachedPath('controller2')) return TestResult.PASS;
      throw new Error('Failed to reset cached path');
    }
    return TestResult.PENDING;
  }

  cleanup() {
    super.cleanup();
    resetCachedPath('controller1');
    resetCachedPath('controller2');
    resetCachedPath('expiration_test');
  }
}
