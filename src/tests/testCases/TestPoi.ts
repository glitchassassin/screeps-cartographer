import { cachePaths, CachingStrategies, getCachedPaths, moveByCachedPath, resetCachedPaths } from 'lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestPoi extends CartographerTestCase {
  _creeps = {
    c1: ''
  };
  ticksRun = 0;
  phase: 'there' | 'back_again' = 'there';
  path = 0;
  test() {
    // setup
    this.ticksRun += 1;
    const controller = this.spawn.room.controller;
    if (!controller) return TestResult.FAIL;
    cachePaths('controller', this.spawn.pos, controller, { cache: CachingStrategies.HeapCache });
    const paths = getCachedPaths('controller', { cache: CachingStrategies.HeapCache });

    // test begins
    if (paths.length !== 2) return TestResult.FAIL;
    new RoomVisual(this.spawn.room.name).poly(paths[0], { stroke: 'magenta' }).poly(paths[1], { stroke: 'cyan' });
    if (paths[0].some(p0 => paths[1].some(p1 => p0.isEqualTo(p1)))) {
      return TestResult.FAIL; // paths should not overlap
    }

    if (this.phase === 'there') {
      if (this.creeps.c1.pos.inRangeTo(controller, 1)) this.phase = 'back_again';
      moveByCachedPath(this.creeps.c1, 'controller', { index: this.path, cache: CachingStrategies.HeapCache });
    }
    if (this.phase === 'back_again') {
      if (this.creeps.c1.pos.inRangeTo(this.spawn, 1)) {
        this.path += 1;
        this.phase = 'there';
      }
      moveByCachedPath(this.creeps.c1, 'controller', {
        reverse: true,
        index: this.path,
        cache: CachingStrategies.HeapCache
      });
    }

    if (this.path > 1) {
      resetCachedPaths('controller', { cache: CachingStrategies.HeapCache });
      if (getCachedPaths('controller', { cache: CachingStrategies.HeapCache }).length === 0) return TestResult.PASS;
      return TestResult.FAIL;
    }
    return TestResult.PENDING;
  }
}
