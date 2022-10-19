import { registerPull } from '../TrafficManager/moveLedger';

/**
 * Cause `puller` to pull `pulled`, registering the pull so traffic management
 * can avoid breaking the chain
 */
export function follow(pullee: Creep, puller: Creep) {
  pullee.move(puller);
  puller.pull(pullee);
  registerPull(puller, pullee);
}
