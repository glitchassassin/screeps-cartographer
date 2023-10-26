import { adjacentWalkablePositions, calculateNearbyPositions } from '../../lib/Movement/selectors';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';
import { TestBlockSquare } from './TestBlockSquare';
import { TestCachedPaths } from './TestCachedPaths';
import { TestCPU } from './TestCPU';
import { TestDeadlock } from './TestDeadlock';
import { TestDynamicAvoidance } from './TestDynamicAvoidance';
import { TestFlee } from './TestFlee';
import { TestOpportunitySquares } from './TestOpportunitySquares';
import { TestPackPosList } from './TestPackPosList';
import { TestPortals } from './TestPortals';
import { TestPriority } from './TestPriority';
import { TestPulling } from './TestPulling';
import { TestRoomEdgeRange } from './TestRoomEdgeRange';
import { TestRoomPositionPerformance } from './TestRoomPositionPerformance';
import { TestShove } from './TestShove';
import { TestShovingCostMatrix } from './TestShovingCostMatrix';
import { TestStuck } from './TestStuck';
import { TestSwarm } from './TestSwarm';
import { TestTrain } from './TestTrain';

export const allTestCases = [
  new TestDeadlock(),
  new TestSwarm(),
  new TestFlee(),
  new TestStuck(),
  new TestCachedPaths(),
  new TestPriority(),
  new TestShove(),
  new TestTrain(),
  new TestRoomEdgeRange(),
  new TestPulling(),
  new TestBlockSquare(),
  new TestCPU(),
  new TestOpportunitySquares(),
  new TestPackPosList(),
  new TestDynamicAvoidance(),
  new TestShovingCostMatrix(),
  new TestPortals(),
  new TestRoomPositionPerformance()
];
export const testCases = allTestCases.slice();
const testResults = new Map<CartographerTestCase, TestResult>();
let initialized = false;

export let testCasesComplete = false;

export function runTestCases() {
  if (!initialized) {
    console.log('-=< Running tests: >=-\n  ' + testCases.join('\n  '));
    plotTestCases();
    initialized = true;
  }
  if (!testCasesComplete && testResults.size === testCases.length) {
    // tests complete
    console.log('-=< Tests complete >=-');
    for (const [test, result] of testResults) {
      console.log(`  ${test}: ${result}`);
    }
    testCasesComplete = true;
  }
  for (const test of testCases) {
    if (testResults.has(test)) continue;
    const result = test.run();
    if (result === TestResult.FAIL && test.retries > 0) {
      console.log(`Retrying: ${test}`);
      test.reset();
      continue;
    }
    if (result !== TestResult.PENDING) {
      testResults.set(test, result);
    }
    if (result === TestResult.PENDING) break; // wait for test to finish
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
      if (next.look().find(c => c.structure || c.terrain === 'wall')) continue;
      frontier.push(next);
      const test = toPlot[0];
      if (!test) return;

      const roomForTest = Game.rooms[next.roomName]
        .lookAtArea(next.y, next.x, next.y + test.testRegion.h, next.x + test.testRegion.w, true)
        .every(
          p =>
            p.terrain !== 'wall' &&
            !p.structure &&
            p.x > 0 &&
            p.x < 49 &&
            p.y > 0 &&
            p.y < 49 &&
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
