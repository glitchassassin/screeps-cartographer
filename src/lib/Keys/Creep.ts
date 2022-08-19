import { objectIdKey } from './ObjectId';

export const creepKey = (creep: Creep, key?: string) => objectIdKey(creep.id, key);
