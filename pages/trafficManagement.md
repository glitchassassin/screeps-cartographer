# Traffic Management

Traffic management is difficult to do well. There are many deep layers of potential optimization.

The goal of traffic management is to _move creeps closer to their destination_ while _moving as few creeps as possible._

## Problems We Want To Solve

### Idle Creeps

Creeps should rarely be idle, but sometimes they are. A defender might finish its job and have no one left to fight. Other creeps still need to path through the room, and might collide with one of these idle creeps.

When this happens, the idle creep should move out of the way to avoid blocking the moving creep.

### Working Creeps

More often we'll have creeps that want to be in range to a target - upgrading in range 3 of a controller, harvesting in range 1 of a source, etc. Often there are multiple squares that will fit this requirement.

In case of collision, the creep should move to another square in range of its target to avoid blocking the moving creep.

### Pulling Creeps

When a moving creep collides with a train of pulled creeps, it can break the train. By default the puller at the front of the train will swap places with the approaching creep, separating the puller from the creeps it's pulling.

In case of collision, no moving creep should be allowed to move into the square of a puller creep.

## Solution Algorithm

To begin with, we'll collect all the move intents for creeps that plan to move this tick. Creeps that don't need to move, but do want to stay in range of a target, will also submit a move intent (with the first target being their current position).

We'll index these intents by creep, target position, priority, and target count so we can look them up quickly later.

```ts
interface MoveIntent {
  creep: Creep;
  priority: number;
  targets: RoomPosition[];
}
```

Once all the move intents are registered, we'll check each of the target positions and, if there's an idle creep (with no move intent), register a new move intent for any adjacent square.

Then we'll remove any target positions from intents that are currently occupied by pullers (so other creeps can't move into and break a train).

Now we have the total set of moves for this tick. Each creep has a set of possible destination squares. We'll use a variant of the wavefunction collapse algorithm to reduce these to a single definite move.

We'll loop through the intents by priority (highest priority to lowest priority). For each priority tier:

1. We'll get the intent with the _fewest_ possible destination squares, and resolve that intent with the first target in its targets list. (The targets list is sorted by preference, with the most preferred target at the beginning of the list.)
2. After moving the creep to the target square, we'll remove the target from every other intent that has the same target square, reducing the number of targets in their target lists.
3. Repeat from step 1 until all intents are resolved.
