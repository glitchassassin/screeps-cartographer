import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';
import { TestFlee } from './TestFlee';
import { TestRoomEdgeRange } from './TestRoomEdgeRange';

export const testCases = [new TestRoomEdgeRange(), new TestFlee()];
const testResults = new Map<CartographerTestCase, TestResult>();
let reported = false;
let initialized = false;

export function runTestCases() {
  if (!initialized) {
    console.log('-=< Running tests: >=-\n  ' + testCases.join('\n  '));
    initialized = true;
  }
  if (!reported && testResults.size === testCases.length) {
    // tests complete
    console.log('-=< Tests complete >=-');
    for (const [test, result] of testResults) {
      console.log(`  ${test}: ${result}`);
    }
    reported = true;
  }
  for (const test of testCases) {
    if (testResults.has(test)) continue;
    const result = test.run();
    if (result === TestResult.FAIL && test.retries > 0) {
      console.log(`Retrying: ${test}`);
      continue;
    }
    if (result !== TestResult.PENDING) {
      testResults.set(test, result);
    }
  }
}
