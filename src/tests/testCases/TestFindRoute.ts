import { findRoute, findRouteWithPortals } from 'lib/WorldMap/findRoute';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

/**
 * This test is specific to the default private server
 * map.
 */
export class TestFindRoute extends CartographerTestCase {
  _creeps = {
    c1: ''
  };
  retries = 0;
  timeout = 1000; // ticks
  test() {
    // Test findRoute with blocked room
    const route = findRoute('W6N8', ['W4N8'], {
      routeCallback: room => {
        if (room === 'W5N8') return Infinity;
        return undefined;
      }
    });
    // should generate two segments - W2N5-W0N5, portal, W10N5-W10N6
    if (route !== undefined) {
      console.log('Route should have failed', JSON.stringify(route));
      return TestResult.FAIL;
    }
    return TestResult.PASS;
  }
}
