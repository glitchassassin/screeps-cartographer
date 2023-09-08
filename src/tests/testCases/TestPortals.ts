import { moveTo } from 'lib';
import { CoordMap } from 'lib/Utils/CoordMap';
import { findRouteWithPortals } from 'lib/WorldMap/findRoute';
import { PortalSet, portalSets } from 'lib/WorldMap/portals';
import { TestResult } from '../tests';
import { CartographerTestCase } from './CartographerTestCase';

/**
 * This test is specific to the default private server
 * map and requires portals to be added between (25, 25, W0N5)
 * and (25, 25, W10N5). The reset-docker.sh script will handle
 * this automatically.
 */
export class TestPortals extends CartographerTestCase {
  _creeps = {
    c1: ''
  };
  retries = 0;
  timeout = 500; // ticks
  findRoute = false;
  generatedPath = false;
  crossedPortal = false;
  test() {
    // hard-code portals, in case they haven't been discovered by scouts yet
    const portalSet = { room1: 'W0N5', room2: 'W10N5', portalMap: new CoordMap() };
    portalSet.portalMap.set({ x: 25, y: 25 }, { x: 25, y: 25 });

    const room1 = portalSets.get('W0N5') ?? new Map<string, PortalSet>();
    portalSets.set('W0N5', room1);
    room1.set('W10N5', portalSet);
    const room2 = portalSets.get('W10N5') ?? new Map<string, PortalSet>();
    portalSets.set('W10N5', room2);
    room2.set('W0N5', portalSet);

    // Test findRoute
    if (!this.findRoute) {
      const route = findRouteWithPortals('W2N5', ['W10N6'], undefined, true);
      // should generate two segments - W2N5-W0N5, portal, W10N5-W10N6
      const targetRoute = ['W2N5', 'W2N6', 'W1N6', 'W0N6', 'W0N5', 'W10N5', 'W10N6'];
      if (
        !Array.isArray(route) ||
        route.length !== 2 ||
        !route
          .flat()
          .map(r => r.room)
          .every((r, i) => r === targetRoute[i])
      ) {
        console.log('Bad route:', JSON.stringify(route));
        return TestResult.FAIL;
      } else {
        console.log('Good route:', JSON.stringify(route));
        this.findRoute = true;
      }
    }

    // Test creep pathing
    moveTo(this.creeps.c1, { pos: new RoomPosition(25, 25, 'W10N6'), range: 20 });
    if (this.creeps.c1.pos.isEqualTo(new RoomPosition(25, 25, 'W10N5'))) {
      // used the portal successfully
      this.crossedPortal = true;
    } else if (this.creeps.c1.pos.roomName === 'W10N6') {
      return this.crossedPortal ? TestResult.PASS : TestResult.FAIL;
    }

    return TestResult.PENDING;
  }
}
