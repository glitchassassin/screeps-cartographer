import { adjacentWalkablePositions, moveTo } from '../../lib';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

export class TestOpportunitySquares extends CartographerTestCase {
  _creeps = {
    c1: '',
  };
  timeout = 50; // ticks
  retries = 0;
  testRegion = {
    w: 5,
    h: 6
  };
  targetPos1: RoomPosition | undefined;
  targetPos2: RoomPosition | undefined;
  blockedSquares: RoomPosition[] | undefined;
  phase: 'setup' | 'run' = 'setup';
  running: number | undefined;
  /**
   * At the end of a path, we check to see if there are any other viable target squares (besides the final path
   * square). These need to be filtered based on the roomCallback to make sure we aren't stepping in a blocked square.
   */
  test() {
    if (!this.testRegionOrigin) return TestResult.PENDING;
    this.targetPos1 ??= new RoomPosition(
      this.testRegionOrigin.x + 2,
      this.testRegionOrigin.y + 4,
      this.testRegionOrigin.roomName
    );
    this.targetPos2 ??= new RoomPosition(
      this.testRegionOrigin.x + 2,
      this.testRegionOrigin.y + 1,
      this.testRegionOrigin.roomName
    );
    this.blockedSquares ??= adjacentWalkablePositions(this.targetPos2, true).slice(1);
    this.blockedSquares.forEach(p => Game.rooms[p.roomName].visual.rect(p.x - 0.5, p.y - 0.5, 1, 1, { fill: "red" }))

    if (this.phase === 'setup') {
      if (
        this.creeps.c1.pos.isEqualTo(this.targetPos1)
      )
        this.phase = 'run';
      // arrange creeps
      moveTo(this.creeps.c1, { pos: this.targetPos1, range: 0 }, { visualizePathStyle: { stroke: '#00ff00' } });
    } else {
      this.running ??= Game.time;
      if (this.blockedSquares.some(pos => this.creeps.c1.pos.isEqualTo(pos))) return TestResult.FAIL;
      if (this.creeps.c1.pos.isEqualTo(this.targetPos2)) return TestResult.PASS;
      // move, avoiding blocked squares
      moveTo(
        this.creeps.c1,
        [{ pos: this.targetPos2, range: 0 }, ...this.blockedSquares.map(pos => ({ pos, range: 0 }))],
        {
          priority: 2,
          visualizePathStyle: { stroke: '#00ff00' },
          roomCallback: (roomName) => {
            const cm = new PathFinder.CostMatrix();
            this.blockedSquares?.forEach(pos => cm.set(pos.x, pos.y, 0xff))
            return cm;
          },
        }
      );
    }
    return TestResult.PENDING;
  }
}
