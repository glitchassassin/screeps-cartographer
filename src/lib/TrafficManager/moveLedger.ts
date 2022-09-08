import { packPos } from '../../utils/packrat';

interface MoveIntent {
  creep: Creep;
  priority: number;
  targets: RoomPosition[];
  resolved?: boolean;
  targetCount?: number;
}

const generateIndexes = () => ({
  creep: new Map<Creep, MoveIntent>(),
  priority: new Map<number, Map<number, Map<Creep, MoveIntent>>>(),
  targets: new Map<string, Map<Creep, MoveIntent>>(),
  pullers: new Set<Creep>(),
  prefersToStay: new Set<string>()
});
let _indexes = new Map<string, ReturnType<typeof generateIndexes>>();
let tick = 0;

/**
 * Gets the current tick's move intents, recreating the indexes
 * if the data is stale from the previous tick
 *
 * Returns:
 *  - creep: Index of intents by creep
 *  - priority: Index of intents by priority, then by number of viable target squares, then by creep
 *  - targets: Index of intents by position, then by creep
 *  - pullers: Index of puller creeps
 */
export function getMoveIntents(room: string) {
  if (Game.time !== tick) {
    tick = Game.time;
    _indexes = new Map();
  }
  _indexes.set(room, _indexes.get(room) ?? generateIndexes());
  return _indexes.get(room)!;
}

/**
 * Lists the rooms with move intents to handle
 */
export function getMoveIntentRooms() {
  return [..._indexes.keys()];
}

/**
 * Register a pull intent (used to avoid breaking trains of
 * pulled creeps)
 */
export function registerPull(puller: Creep) {
  const intents = getMoveIntents(puller.pos.roomName);
  intents.pullers.add(puller);
}

/**
 * Register a move intent (adds to a couple indexes for quick lookups)
 */
export function registerMove(intent: MoveIntent, pulled = false) {
  if (intent.creep.fatigue && !pulled) {
    intent.targets = [intent.creep.pos];
  }
  intent.targetCount ??= intent.targets.length;
  const indexes = getMoveIntents(intent.creep.pos.roomName);
  // cancel old intent, if needed
  cancelMove(indexes.creep.get(intent.creep));
  // register new one
  indexes.creep.set(intent.creep, intent);
  const byPriority = indexes.priority.get(intent.priority) ?? new Map();
  indexes.priority.set(intent.priority, byPriority);
  const byTargetCount = byPriority.get(intent.targets.length) ?? new Map();
  byPriority.set(intent.targets.length, byTargetCount);
  byTargetCount.set(intent.creep, intent);
  for (const target of intent.targets) {
    const key = packPos(target);
    const targets = indexes.targets.get(key) ?? new Map();
    indexes.targets.set(key, targets);
    targets.set(intent.creep, intent);
  }
  if (intent.targets.length && intent.targets[0].isEqualTo(intent.creep.pos)) {
    indexes.prefersToStay.add(packPos(intent.creep.pos));
  }
}

/**
 * Register a move intent (adds to a couple indexes for quick lookups)
 */
export function cancelMove(intent?: MoveIntent) {
  if (!intent) return;
  intent.targetCount ??= intent.targets.length;
  const indexes = getMoveIntents(intent.creep.pos.roomName);
  indexes.creep.delete(intent.creep);
  indexes.priority.get(intent.priority)?.get(intent.targets.length)?.delete(intent.creep);
  for (const target of intent.targets) {
    const key = packPos(target);
    indexes.targets.get(key)?.delete(intent.creep);
  }
}

/**
 * Updates an intent's indexes when its target count changes
 */
export function updateIntentTargetCount(intent: MoveIntent, oldCount: number, newCount: number) {
  const indexes = getMoveIntents(intent.creep.pos.roomName);
  const byPriority = indexes.priority.get(intent.priority) ?? new Map<number, Map<Creep, MoveIntent>>();
  byPriority.get(oldCount)?.delete(intent.creep);
  indexes.priority.set(intent.priority, byPriority);
  const byTargetCount = byPriority.get(newCount) ?? new Map<Creep, MoveIntent>();
  byPriority.set(newCount, byTargetCount);
  byTargetCount.set(intent.creep, intent);
}
