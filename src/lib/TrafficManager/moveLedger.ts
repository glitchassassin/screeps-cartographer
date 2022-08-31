import { packPos } from 'utils/packrat';

interface MoveIntent {
  creep: Creep;
  priority: number;
  targets: RoomPosition[];
}

const generateIndexes = () => ({
  creep: new Map<Creep, MoveIntent>(),
  priority: new Map<number, Map<number, Map<Creep, MoveIntent>>>(),
  targets: new Map<string, Map<Creep, MoveIntent>>(),
  pullers: new Set<Creep>()
});
let _indexes = generateIndexes();
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
export function getMoveIntents() {
  if (Game.time !== tick) {
    tick = Game.time;
    _indexes = generateIndexes();
  }
  return _indexes;
}

/**
 * Register a pull intent (used to avoid breaking trains of
 * pulled creeps)
 */
export function registerPull(puller: Creep) {
  const intents = getMoveIntents();
  intents.pullers.add(puller);
}

/**
 * Register a move intent (adds to a couple indexes for quick lookups)
 */
export function registerMove(intent: MoveIntent, pulled = false) {
  if (intent.creep.fatigue && !pulled) {
    intent.targets = [intent.creep.pos];
  }
  const indexes = getMoveIntents();
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
}

/**
 * Updates an intent's indexes when its target count changes
 */
export function updateIntentTargetCount(intent: MoveIntent, oldCount: number) {
  const indexes = getMoveIntents();
  const byPriority = indexes.priority.get(intent.priority) ?? new Map<number, Map<Creep, MoveIntent>>();
  byPriority.get(oldCount)?.delete(intent.creep);
  indexes.priority.set(intent.priority, byPriority);
  const byTargetCount = byPriority.get(intent.targets.length) ?? new Map<Creep, MoveIntent>();
  byPriority.set(intent.priority, byTargetCount);
  byTargetCount.set(intent.creep, intent);
}
