import { config, TestResult } from '../tests';

export abstract class CartographerTestCase {
  retries: number = config.retries;
  timeout: number = config.timeout;
  started: number | undefined = undefined;

  constructor() {
    const spawn = Object.values(Game.spawns)[0];
    this._spawn = spawn.id;
  }

  toString() {
    return `[${this.constructor.name}:${this.retries}]`;
  }

  testRegion: { w: number; h: number } = {
    w: 0,
    h: 0
  };
  testRegionOrigin: RoomPosition | undefined = undefined;

  // spawn lookup
  _spawn: Id<StructureSpawn>;
  get spawn() {
    const spawn = Game.getObjectById(this._spawn);
    if (!spawn) throw new Error(`Spawn not found: ${this._spawn}`);
    return spawn;
  }

  // creep lookup
  _creeps: Record<string, string> = {};
  get creeps() {
    let creeps: Record<string, Creep> = {};
    for (const name in this._creeps) {
      if (name === '') continue; // creep not spawned yet
      creeps[name] = Game.creeps[this._creeps[name]];
    }
    return creeps;
  }

  // boilerplate
  run(): TestResult {
    this.visualize();
    let setupResult = this.setup();
    if (setupResult !== TestResult.PASS) return setupResult;
    this.started ??= Game.time;
    if (Game.time - this.started > this.timeout) {
      console.log(`${this} timed out`);
      this.reset();
      return TestResult.FAIL;
    }

    let testResult = this.test();
    if (testResult === TestResult.PASS) {
      this.cleanup();
    }
    return testResult;
  }
  setup(): TestResult {
    let pending = false;
    for (const key in this._creeps) {
      const creepName = this._creeps[key];
      if (creepName !== '' && !Game.creeps[creepName]) {
        // creep was spawned, but has died: test failed
        return TestResult.FAIL;
      }
      if (this._creeps[key] === '') {
        // creep needs spawned
        pending = true;
        const prefix = `${this.constructor.name}_${key}`;
        const name = `${prefix}_${Game.time % 10000}`;
        this.spawn.spawnCreep([MOVE], name, { memory: { room: this.spawn.room.name } });
        if (this.spawn.spawning?.name.startsWith(prefix)) {
          this._creeps[key] = this.spawn.spawning.name;
        }
      }
    }
    // Clean up abandoned creeps
    let allCreeps = Object.keys(Game.creeps);
    for (const key in this._creeps) {
      const prefix = `${this.constructor.name}_${key}`;
      const staleCreep = allCreeps.find(c => c.startsWith(prefix) && c !== this._creeps[key]);
      if (staleCreep) Game.creeps[staleCreep].suicide();
    }
    return pending ? TestResult.PENDING : TestResult.PASS;
  }
  /**
   * Runs when a creep has been spawned
   */
  test(): TestResult {
    throw new Error('Not implemented yet');
  }
  cleanup() {
    for (const key in this._creeps) {
      if (this._creeps[key] !== '') {
        Game.creeps[this._creeps[key]]?.suicide();
      }
      this._creeps[key] = '';
    }
    this.started = undefined;
  }
  reset() {
    this.cleanup();
    this.retries -= 1;
  }
  visualize() {
    if (!this.testRegionOrigin || this.testRegion.w === 0 || this.testRegion.h === 0) return;
    this.spawn.room.visual
      .rect(this.testRegionOrigin.x - 0.5, this.testRegionOrigin.y - 0.5, this.testRegion.w, this.testRegion.h, {
        stroke: 'cyan',
        fill: 'transparent',
        opacity: 0.3
      })
      .text(this.constructor.name, this.testRegionOrigin.x - 0.4, this.testRegionOrigin.y - 0.7, {
        color: 'cyan',
        opacity: 0.3,
        align: 'left',
        font: 0.3
      });
  }
}
