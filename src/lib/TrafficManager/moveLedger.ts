import { packPos } from '../../utils/packPositions';

interface MoveIntent {
  creep: Creep | PowerCreep;
  priority: number;
  targets: RoomPosition[];
  resolved?: boolean;
  targetCount?: number;
}

const generateIndexes = () => ({
  creep: new Map<Id<Creep | PowerCreep>, MoveIntent>(),
  priority: new Map<number, Map<number, Map<Id<Creep | PowerCreep>, MoveIntent>>>(),
  targets: new Map<string, Map<Id<Creep | PowerCreep>, MoveIntent>>(),
  pullers: new Set<Id<Creep | PowerCreep>>(),
  pullees: new Set<Id<Creep | PowerCreep>>(),
  prefersToStay: new Set<string>(),
  blockedSquares: new Set<string>()
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
export function registerPull(puller: Creep, pullee: Creep) {
  const intents = getMoveIntents(puller.pos.roomName);
  intents.pullers.add(puller.id);
  intents.pullees.add(pullee.id);
}

/**
 * Register a move intent (adds to a couple indexes for quick lookups)
 */
export function registerMove(intent: MoveIntent, pulled = false) {
  if ('fatigue' in intent.creep && intent.creep.fatigue && !pulled) {
    intent.targets = [intent.creep.pos];
  }
  intent.targetCount ??= intent.targets.length;
  const indexes = getMoveIntents(intent.creep.pos.roomName);
  // cancel old intent, if needed
  cancelMove(indexes.creep.get(intent.creep.id));
  // register new one
  indexes.creep.set(intent.creep.id, intent);
  const byPriority = indexes.priority.get(intent.priority) ?? new Map<number, Map<Id<Creep | PowerCreep>, MoveIntent>>();
  indexes.priority.set(intent.priority, byPriority);
  const byTargetCount = byPriority.get(intent.targets.length) ?? new Map<Id<Creep | PowerCreep>, MoveIntent>();
  byPriority.set(intent.targets.length, byTargetCount);
  byTargetCount.set(intent.creep.id, intent);
  for (const target of intent.targets) {
    const key = packPos(target);
    const targets = indexes.targets.get(key) ?? new Map<Id<Creep | PowerCreep>, MoveIntent>();
    indexes.targets.set(key, targets);
    targets.set(intent.creep.id, intent);
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
  indexes.creep.delete(intent.creep.id);
  indexes.priority.get(intent.priority)?.get(intent.targets.length)?.delete(intent.creep.id);
  for (const target of intent.targets) {
    const key = packPos(target);
    indexes.targets.get(key)?.delete(intent.creep.id);
  }
}

/**
 * Updates an intent's indexes when its target count changes
 */
export function updateIntentTargetCount(intent: MoveIntent, oldCount: number, newCount: number) {
  const indexes = getMoveIntents(intent.creep.pos.roomName);
  const byPriority =
    indexes.priority.get(intent.priority) ?? new Map<number, Map<Id<Creep | PowerCreep>, MoveIntent>>();
  byPriority.get(oldCount)?.delete(intent.creep.id);
  indexes.priority.set(intent.priority, byPriority);
  const byTargetCount = byPriority.get(newCount) ?? new Map<Id<Creep | PowerCreep>, MoveIntent>();
  byPriority.set(newCount, byTargetCount);
  byTargetCount.set(intent.creep.id, intent);
}

/**
 * Blocks a specific square, to vacate a space for e.g. creating a construction site or spawning
 */
export function blockSquare(pos: RoomPosition) {
  getMoveIntents(pos.roomName).blockedSquares.add(packPos(pos));
}
