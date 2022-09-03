import { registerMove } from '../TrafficManager/moveLedger';
import { reconciledRecently } from '../TrafficManager/reconcileTraffic';

/**
 * Registers a move intent with the Traffic Manager, if reconcileTraffic has
 * run recently, or else falls back to a regular move
 */
export function move(creep: Creep, targets: RoomPosition[], priority = 1) {
  if (reconciledRecently()) {
    // Traffic manager is running
    registerMove({
      creep,
      targets,
      priority
    });
    return OK;
  } else {
    // fall back to regular movement
    if (targets[0].isEqualTo(creep.pos)) return OK;
    return creep.move(creep.pos.getDirectionTo(targets[0]));
  }
}
