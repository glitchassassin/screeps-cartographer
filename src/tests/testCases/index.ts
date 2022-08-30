import { adjacentWalkablePositions, calculateNearbyPositions } from 'lib/Movement/selectors';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';
import { TestCachedPaths } from './TestCachedPaths';
import { TestFlee } from './TestFlee';
import { TestPriority } from './TestPriority';
import { TestRoomEdgeRange } from './TestRoomEdgeRange';
import { TestShove } from './TestShove';
import { TestStuck } from './TestStuck';
import { TestTrain } from './TestTrain';

export const testCases = [
  new TestRoomEdgeRange(),
  new TestFlee(),
  new TestStuck(),
  new TestCachedPaths(),
  new TestPriority(),
  new TestShove(),
  new TestTrain()
];
const testResults = new Map<CartographerTestCase, TestResult>();
let reported = false;
let initialized = false;

export function runTestCases() {
  if (!initialized) {
    console.log('-=< Running tests: >=-\n  ' + testCases.join('\n  '));
    plotTestCases();
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

function plotTestCases() {
  const toPlot = testCases.filter(t => !t.testRegionOrigin && t.testRegion.w !== 0);
  if (!toPlot.length) return;
  const spawnPos = Object.values(Game.spawns)[0].pos;
  const frontier = adjacentWalkablePositions(spawnPos);
  const plotted: CartographerTestCase[] = [];

  while (frontier.length) {
    const current = frontier.shift()!;
    for (const next of calculateNearbyPositions(current, 1)) {
      const test = toPlot[0];
      if (!test) return;

      const roomForTest = Game.rooms[next.roomName]
        .lookAtArea(next.y, next.x, next.y + test.testRegion.h, next.x + test.testRegion.w, true)
        .every(
          p =>
            p.terrain !== 'wall' &&
            !plotted.some(
              t =>
                p.x >= t.testRegionOrigin!.x &&
                p.x <= t.testRegionOrigin!.x + t.testRegion.w &&
                p.y >= t.testRegionOrigin!.y &&
                p.y <= t.testRegionOrigin!.y + t.testRegion.h
            )
        );

      if (!roomForTest) continue;
      test.testRegionOrigin = next;
      toPlot.shift();
      plotted.push(test);
    }
  }
}
