import { MemoryCache } from '../CachingStrategies/Memory';
import { NumberSerializer } from '../CachingStrategies/Serializers/Number';
import { adjacentWalkablePositions } from '../Movement/selectors';
// import { logCpu, logCpuStart } from '../../utils/logCpu';
import { packPos } from '../../utils/packPositions';
import { measure } from '../../utils/profiler';
import { getMoveIntentRooms, getMoveIntents, registerMove, updateIntentTargetCount } from './moveLedger';

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

export interface ReconcileTrafficOpts {
  /**
   * Show debug visualizations for troubleshooting traffic
   */
  visualize?: boolean;
}

/**
 * Include this function in your main loop after all creep movement to enable traffic
 * management.
 *
 * Warning: if your bucket overflows and this doesn't run, your creeps will not move.
 * Creeps will fall back to unmanaged movement if the reconcileTraffic is not executed
 * after two ticks.
 */
export function reconcileTraffic(opts?: ReconcileTrafficOpts) {
  for (const room of getMoveIntentRooms()) {
    if (!Game.rooms[room]) continue;
    reconcileTrafficByRoom(room, opts);
  }
  // log that traffic management is active
  MemoryCache.with(NumberSerializer).set(keys.RECONCILE_TRAFFIC_RAN, Game.time);
}

function reconcileTrafficByRoom(room: string, opts?: ReconcileTrafficOpts) {
  const start = Game.cpu.getUsed();
  let moveTime = 0;
  const moveIntents = getMoveIntents(room);
  const used = moveIntents.blockedSquares;

  // visualize
  if (opts?.visualize) {
    for (const { creep, targets, priority } of moveIntents.creep.values()) {
      targets.forEach(t => {
        if (t.isEqualTo(creep.pos)) {
          Game.rooms[creep.pos.roomName].visual.circle(creep.pos, {
            radius: 0.5,
            stroke: 'orange',
            fill: 'transparent'
          });
        } else {
          Game.rooms[creep.pos.roomName].visual.line(creep.pos, t, { color: 'orange' });
        }
      });
    }
  }

  // Set move intents for shove targets
  for (const creep of (Game.rooms[room].find(FIND_MY_CREEPS) as (Creep | PowerCreep)[]).concat(
    Game.rooms[room].find(FIND_MY_POWER_CREEPS)
  )) {
    if (moveIntents.creep.has(creep) || moveIntents.pullees.has(creep) || moveIntents.pullers.has(creep)) continue;

    registerMove({
      creep,
      priority: 0,
      targets: [creep.pos, ...adjacentWalkablePositions(creep.pos, true)]
    });

    if (opts?.visualize) {
      console.log(creep, creep.pos, Game.rooms[creep.pos.roomName]);
      Game.rooms[creep.pos.roomName].visual.circle(creep.pos, { radius: 1, stroke: 'red', fill: 'transparent ' });
    }
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

      const intentStack = [...intents.values()];

      while (intentStack.length) {
        const intent = intentStack.shift();
        if (!intent) break;
        if (intent.resolved) {
          // a swapping creep will sometimes end up on the stack twice.
          // if its move has already been resolved, ignore it
          intents.delete(intent.creep);
          continue;
        }
        // for (const intent of [...intents.values()]) {
        if (opts?.visualize) {
          intent.targets.forEach(t => {
            if (t.isEqualTo(intent.creep.pos)) {
              Game.rooms[intent.creep.pos.roomName].visual.circle(intent.creep.pos, {
                radius: 0.5,
                stroke: 'yellow',
                strokeWidth: 0.2,
                fill: 'transparent',
                opacity: 0.2
              });
            } else {
              Game.rooms[intent.creep.pos.roomName].visual.line(intent.creep.pos, t, { color: 'yellow', width: 0.2 });
            }
          });
        }
        // get the first position with no conflicts, or else the position with
        // fewest conflicts

        let targetPos: RoomPosition | undefined = undefined;
        for (const target of intent.targets) {
          const p = packPos(target);
          if (used.has(p) && !(intent.creep.pos.isEqualTo(target) && moveIntents.pullers.has(intent.creep))) continue; // a creep is already moving here
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
          if (opts?.visualize) {
            Game.rooms[intent.creep.pos.roomName].visual
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

        if (opts?.visualize)
          Game.rooms[intent.creep.pos.roomName].visual.line(intent.creep.pos, targetPos, {
            color: 'green',
            width: 0.5
          });

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

        // if a creep in the destination position is moving to this position, override
        // any other intents moving to this position
        if (!targetPos.isEqualTo(intent.creep.pos) && !moveIntents.pullers.has(intent.creep)) {
          const swapPos = packPos(intent.creep.pos);
          const movingHereIntents = [...(moveIntents.targets.get(swapPos)?.values() ?? [])].filter(
            i => i !== intent && i.targets.length < 2
          );
          const swapCreep = movingHereIntents.find(
            i => !i.resolved && targetPos?.isEqualTo(i.creep.pos) && !moveIntents.pullers.has(i.creep)
          );

          if (swapCreep) {
            if (opts?.visualize)
              Game.rooms[swapCreep.creep.pos.roomName].visual.circle(swapCreep.creep.pos, {
                radius: 0.2,
                fill: 'green'
              });
            // override previously resolved intents
            movingHereIntents
              .filter(i => i.resolved)
              .forEach(i => {
                if (opts?.visualize)
                  Game.rooms[i.creep.pos.roomName].visual.circle(i.creep.pos, { radius: 0.2, fill: 'red' });
              });
            used.delete(swapPos);
            // handle swapCreep next
            intentStack.unshift(swapCreep);
          }
        }
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
