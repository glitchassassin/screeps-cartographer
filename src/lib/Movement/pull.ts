import { registerPull } from '../TrafficManager/moveLedger';

/**
 * Cause `puller` to pull `pulled`, registering the pull so traffic management
 * can avoid breaking the chain
 */
export function follow(pulled: Creep, puller: Creep) {
  pulled.move(puller);
  puller.pull(pulled);
  registerPull(puller);
}
