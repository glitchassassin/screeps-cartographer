import { MemoryCache } from 'lib/CachingStrategies/Memory';
import { NumberSerializer } from 'lib/CachingStrategies/Serializers/Number';
import { adjacentWalkablePositions } from 'lib/Movement/selectors';
import { packPos, unpackPos } from 'utils/packrat';
import { getMoveIntents, registerMove, updateIntentTargetCount } from './moveLedger';

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

  // visualize
  for (const { creep, targets, priority } of moveIntents.creep.values()) {
    targets.forEach(t => {
      if (t.isEqualTo(creep.pos)) {
        creep.room.visual.circle(creep.pos, { radius: 0.5, stroke: 'orange', fill: 'transparent' });
      } else {
        creep.room.visual.line(creep.pos, t, { color: 'orange' });
      }
    });
  }

  // Set move intents for shove targets
  for (const posKey of moveIntents.targets.keys()) {
    const pos = unpackPos(posKey);
    Game.rooms[pos.roomName]?.visual.text(moveIntents.targets.get(posKey)?.size.toString() ?? '0', pos);
    if (!Game.rooms[pos.roomName]) {
      console.log('Out-of-room target', pos, JSON.stringify(moveIntents.targets.get(posKey)));
      continue;
    }
    const target = pos.look().find(t => t.creep);
    if (target?.creep?.my && !moveIntents.creep.has(target.creep)) {
      registerMove({
        creep: target.creep,
        priority: 0,
        targets: [target.creep.pos, ...adjacentWalkablePositions(target.creep.pos, true)]
      });
      target.creep.room.visual.circle(pos, { radius: 1.5, stroke: 'red', fill: 'transparent ' });
    }
  }

  const priorities = [...moveIntents.priority.entries()].sort((a, b) => b[0] - a[0]);
  for (const [_, priority] of priorities) {
    while (priority.size) {
      const minPositionCount = Math.min(...priority.keys());
      const intents = priority.get(minPositionCount);
      if (!intents) break;
      if (!intents.size) priority.delete(minPositionCount);

      for (const intent of intents.values()) {
        intent.targets.forEach(t => {
          if (t.isEqualTo(intent.creep.pos)) {
            intent.creep.room.visual.circle(intent.creep.pos, {
              radius: 0.5,
              stroke: 'yellow',
              strokeWidth: 0.2,
              fill: 'transparent'
            });
          } else {
            intent.creep.room.visual.line(intent.creep.pos, t, { color: 'yellow', width: 0.2 });
          }
        });
        // get the first position with no conflicts, or else the position with
        // fewest conflicts
        let targetPos: RoomPosition | undefined = intent.targets[0];

        // handling intent, remove from queue
        intents.delete(intent.creep);
        moveIntents.creep.delete(intent.creep);

        if (!targetPos) {
          // no movement options
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
          continue;
        }

        // resolve intent
        intent.creep.move(intent.creep.pos.getDirectionTo(targetPos));
        intent.creep.room.visual.line(intent.creep.pos, targetPos, { color: 'green', width: 0.5 });

        // mark pos as used
        const posKey = packPos(targetPos);
        used.add(posKey);
        // remove intent from other target positions
        for (const pos of intent.targets) {
          moveIntents.targets.get(packPos(pos))?.delete(intent.creep);
        }
        // remove pos from other intents targeting the same position
        for (const sameTargetIntent of moveIntents.targets.get(posKey)?.values() ?? []) {
          if (intent === sameTargetIntent) continue;
          const oldCount = sameTargetIntent.targets.length;
          const index = sameTargetIntent.targets.findIndex(p => targetPos?.isEqualTo(p));
          if (index !== -1) sameTargetIntent.targets.splice(index, 1);
          // update priority/count index
          updateIntentTargetCount(sameTargetIntent, oldCount);
        }
      }
    }
  }
  // log that traffic management is active
  MemoryCache.with(NumberSerializer).set(keys.RECONCILE_TRAFFIC_RAN, Game.time);
}
