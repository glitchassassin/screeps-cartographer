import { MemoryCache } from 'lib/CachingStrategies/Memory';
import { NumberSerializer } from 'lib/CachingStrategies/Serializers/Number';
import { adjacentWalkablePositions } from 'lib/Movement/selectors';
// import { logCpu, logCpuStart } from 'utils/logCpu';
import { packPos } from 'utils/packrat';
import { measure } from 'utils/profiler';
import { getMoveIntentRooms, getMoveIntents, registerMove, updateIntentTargetCount } from './moveLedger';

const DEBUG = false;

const keys = {
  RECONCILE_TRAFFIC_RAN: '_crr'
};

/**
 * Checks if the reconcile function has run recently. If not, creeps will
 * fall back to unmanaged movement to preserve some functionality.
 */
export function reconciledRecently() {
  const lastReconciled = MemoryCache.with(NumberSerializer).get(keys.RECONCILE_TRAFFIC_RAN);
  return Boolean(lastReconciled && Game.time - 2 <= lastReconciled);
}

let efficiency: number[] = [];

/**
 * Include this function in your main loop after all creep movement to enable traffic
 * management.
 *
 * Warning: if your bucket overflows and this doesn't run, your creeps will not move.
 * Creeps will fall back to unmanaged movement if the reconcileTraffic is not executed
 * after two ticks.
 */
export function reconcileTraffic() {
  for (const room of getMoveIntentRooms()) {
    if (!Game.rooms[room]) continue;
    reconcileTrafficByRoom(room);
  }
  // log that traffic management is active
  MemoryCache.with(NumberSerializer).set(keys.RECONCILE_TRAFFIC_RAN, Game.time);
}

function reconcileTrafficByRoom(room: string) {
  const start = Game.cpu.getUsed();
  let moveTime = 0;
  const used = new Set<string>();
  const moveIntents = getMoveIntents(room);

  // visualize
  if (DEBUG) {
    for (const { creep, targets, priority } of moveIntents.creep.values()) {
      targets.forEach(t => {
        if (t.isEqualTo(creep.pos)) {
          creep.room.visual.circle(creep.pos, { radius: 0.5, stroke: 'orange', fill: 'transparent' });
        } else {
          creep.room.visual.line(creep.pos, t, { color: 'orange' });
        }
      });
    }
  }

  // Set move intents for shove targets
  for (const creep of Game.rooms[room].find(FIND_MY_CREEPS)) {
    if (moveIntents.creep.has(creep)) continue;

    registerMove({
      creep,
      priority: 0,
      targets: [creep.pos, ...adjacentWalkablePositions(creep.pos, true)]
    });

    if (DEBUG) creep.room.visual.circle(creep.pos, { radius: 1.5, stroke: 'red', fill: 'transparent ' });
  }

  // remove pullers as move targets
  for (const puller of moveIntents.pullers) {
    const posKey = packPos(puller.pos);
    used.add(posKey);
    for (const intent of moveIntents.targets.get(posKey)?.values() ?? []) {
      if (intent.creep === puller) continue;

      intent.targetCount ??= intent.targets.length;
      const oldCount = intent.targetCount;
      intent.targetCount -= 1;
      // update priority/count index
      updateIntentTargetCount(intent, oldCount, intent.targetCount);
    }
  }

  // logCpuStart();
  const priorities = [...moveIntents.priority.entries()].sort((a, b) => b[0] - a[0]);
  // logCpu('sorting priorities');
  for (const [_, priority] of priorities) {
    while (priority.size) {
      const minPositionCount = Math.min(...priority.keys());
      const intents = priority.get(minPositionCount);
      if (!intents) break;
      if (!intents.size) priority.delete(minPositionCount);
      // logCpu('getting prioritized intents');

      for (const intent of intents.values()) {
        if (DEBUG) {
          intent.targets.forEach(t => {
            if (t.isEqualTo(intent.creep.pos)) {
              intent.creep.room.visual.circle(intent.creep.pos, {
                radius: 0.5,
                stroke: 'yellow',
                strokeWidth: 0.2,
                fill: 'transparent',
                opacity: 0.2
              });
            } else {
              intent.creep.room.visual.line(intent.creep.pos, t, { color: 'yellow', width: 0.2 });
            }
          });
        }
        // get the first position with no conflicts, or else the position with
        // fewest conflicts

        let targetPos: RoomPosition | undefined = undefined;
        for (const target of intent.targets) {
          const p = packPos(target);
          if (used.has(p)) continue; // a creep is already moving here
          if (intent.creep.pos.isEqualTo(target) || !moveIntents.prefersToStay.has(p)) {
            // best case - no other creep prefers to stay here
            targetPos = target;
            break;
          }
          targetPos ??= target;
        }

        // handling intent, remove from queue
        intents.delete(intent.creep);
        // logCpu('handling intent');

        if (!targetPos) {
          // no movement options
          if (DEBUG) {
            intent.creep.room.visual
              .line(
                intent.creep.pos.x - 0.5,
                intent.creep.pos.y - 0.5,
                intent.creep.pos.x + 0.5,
                intent.creep.pos.y + 0.5,
                { color: 'red' }
              )
              .line(
                intent.creep.pos.x - 0.5,
                intent.creep.pos.y + 0.5,
                intent.creep.pos.x + 0.5,
                intent.creep.pos.y - 0.5,
                { color: 'red' }
              );
          }
          continue;
        }

        // resolve intent
        moveTime += measure(() => intent.creep.move(intent.creep.pos.getDirectionTo(targetPos!)));
        intent.resolved = true;
        // logCpu('resolving intent');

        if (DEBUG) intent.creep.room.visual.line(intent.creep.pos, targetPos, { color: 'green', width: 0.5 });

        // remove pos from other intents targeting the same position
        const posKey = packPos(targetPos);
        used.add(posKey);
        for (const sameTargetIntent of moveIntents.targets.get(posKey)?.values() ?? []) {
          if (sameTargetIntent.resolved) continue;

          sameTargetIntent.targetCount ??= sameTargetIntent.targets.length;
          const oldCount = sameTargetIntent.targetCount;
          sameTargetIntent.targetCount -= 1;

          // update priority/count index
          updateIntentTargetCount(sameTargetIntent, oldCount, sameTargetIntent.targetCount);
        }
        // logCpu('removing move position from other intents');
      }
    }
  }

  const totalTime = Math.max(0, Game.cpu.getUsed() - start);
  efficiency.push(moveTime / totalTime);
  if (efficiency.length > 1500) efficiency = efficiency.slice(-1500);
  // console.log(
  //   `reconcileTraffic: total(${totalTime.toFixed(3)} cpu), efficiency(${(
  //     (100 * efficiency.reduce((a, b) => a + b)) /
  //     efficiency.length
  //   ).toFixed(2)}%)`
  // );
}
