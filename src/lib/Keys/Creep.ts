import { objectIdKey } from './ObjectId';

/**
 * Derives a cache key namespaced to a particular creep
 */
export const creepKey = (creep: Creep | PowerCreep, key?: string) => objectIdKey(creep.id, key);
