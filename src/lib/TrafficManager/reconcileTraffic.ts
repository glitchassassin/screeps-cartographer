import { MemoryCache } from 'lib/CachingStrategies/Memory';
import { NumberSerializer } from 'lib/CachingStrategies/Serializers/Number';
import { packPos } from 'utils/packrat';
import { profile } from 'utils/profiler';
import { getMoveIntents } from './moveLedger';

const keys = {
  RECONCILE_TRAFFIC_RAN: '_crr'
};

export function reconciledRecently() {
  const lastReconciled = MemoryCache.with(NumberSerializer).get(keys.RECONCILE_TRAFFIC_RAN);
  return Boolean(lastReconciled && Game.time - 2 <= lastReconciled);
}

/**
 * Include this function in your main loop after all creep movement to enable traffic
 * management.
 *
 * Warning: if your bucket overflows and this doesn't run, your creeps will not move.
 * Creeps will fall back to unmanaged movement if the reconcileTraffic is not executed
 * after two ticks.
 */
export function reconcileTraffic() {
  const used = new Set<string>();
  const moveIntents = getMoveIntents();
  const priorities = [...moveIntents.priority.entries()].sort((a, b) => b[0] - a[0]);
  for (const [_, priority] of priorities) {
    for (const intent of priority.values()) {
      for (const pos of intent.targets) {
        const key = packPos(pos);
        if (used.has(key)) continue;
        profile('move', () => intent.creep.move(intent.creep.pos.getDirectionTo(pos)));
        used.add(key);
        break;
      }
    }
  }
  // log that traffic management is active
  MemoryCache.with(NumberSerializer).set(keys.RECONCILE_TRAFFIC_RAN, Game.time);
}
