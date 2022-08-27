import { packPos } from 'utils/packrat';

interface MoveIntent {
  creep: Creep;
  priority: number;
  targets: RoomPosition[];
}

const generateIndexes = () => ({
  creep: new Map<Creep, MoveIntent>(),
  priority: new Map<number, Map<Creep, MoveIntent>>(),
  targets: new Map<string, Map<Creep, MoveIntent>>()
});
let _indexes = generateIndexes();
let tick = 0;

export function getMoveIntents() {
  if (Game.time !== tick) {
    tick = Game.time;
    _indexes = generateIndexes();
  }
  return _indexes;
}

/**
 * Index intent for future reference
 */
export function registerMove(intent: MoveIntent) {
  const indexes = getMoveIntents();
  indexes.creep.set(intent.creep, intent);
  const priority = indexes.priority.get(intent.priority) ?? new Map();
  indexes.priority.set(intent.priority, priority);
  priority.set(intent.creep, intent);
  for (const target of intent.targets) {
    const key = packPos(target);
    const targets = indexes.targets.get(key) ?? new Map();
    indexes.targets.set(key, targets);
    targets.set(intent.creep, intent);
  }
}
