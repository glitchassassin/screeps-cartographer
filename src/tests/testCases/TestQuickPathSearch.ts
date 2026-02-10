import { CartographerTestCase } from './CartographerTestCase';
import { TestResult } from '../tests';
import { quickPathSearch } from '../../lib/Utils/quickPathSearch';

export class TestQuickPathSearch extends CartographerTestCase {
  _creeps = {};
  timeout = 50; // ticks
  retries = 0;
  testRegion = {
    w: 5,
    h: 5
  };

  test() {
    if (!this.testRegionOrigin) return TestResult.PENDING;
    const room = this.testRegionOrigin.roomName;
    const x = this.testRegionOrigin.x;
    const y = this.testRegionOrigin.y;

    // Create a simple path: (x, y) -> (x+1, y) -> (x+2, y) -> ... -> (x+4, y)
    const path: RoomPosition[] = [];
    for (let i = 0; i < 5; i++) {
      path.push(new RoomPosition(x + i, y, room));
    }

    // Test 1: Search for an element on the path
    const searchIndex = 2;
    const searchPos = path[searchIndex];
    const result1 = quickPathSearch(searchPos, path);
    if (result1 !== searchIndex) {
      console.log(`TestQuickPathSearch: Failed to find index. Expected ${searchIndex}, got ${result1}`);
      return TestResult.FAIL;
    }

    // Test 2: Search for an element NOT on the path
    const notOnPathPos = new RoomPosition(x, y + 1, room);
    const result2 = quickPathSearch(notOnPathPos, path);
    if (result2 !== -1) {
      console.log(`TestQuickPathSearch: Found index for non-path position. Expected -1, got ${result2}`);
      return TestResult.FAIL;
    }

    // Test 3: Optimization verification (indirectly)
    // If we search for the last element, the algorithm should theoretically skip some checks.
    // While we can't easily assert the skip happened without instrumentation, we can ensure it still finds the correct index.
    const lastIndex = 4;
    const lastPos = path[lastIndex];
    const result3 = quickPathSearch(lastPos, path);
    if (result3 !== lastIndex) {
      console.log(`TestQuickPathSearch: Failed to find last index. Expected ${lastIndex}, got ${result3}`);
      return TestResult.FAIL;
    }
    
    // Test 4: Verify boundary conditions - First Element
    const firstIndex = 0;
    const firstPos = path[firstIndex];
    const result4 = quickPathSearch(firstPos, path);
    if (result4 !== firstIndex) {
      console.log(`TestQuickPathSearch: Failed to find first index. Expected ${firstIndex}, got ${result4}`);
      return TestResult.FAIL;
    }

    return TestResult.PASS;
  }
}
