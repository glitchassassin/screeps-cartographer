import { MoveOpts } from 'lib';
import { registerPull } from 'lib/TrafficManager/moveLedger';

export function follow(pulled: Creep, puller: Creep, opts?: MoveOpts) {
  pulled.move(puller);
  puller.pull(pulled);
  registerPull(puller);
}
