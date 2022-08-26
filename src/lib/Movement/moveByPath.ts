import { followPath, getCachedPath, MoveByCachedPathOpts } from './cachedPaths';
import { moveTo } from './moveTo';

export function moveByPath(creep: Creep, key: string, opts?: MoveByCachedPathOpts) {
  const result = followPath(creep, key, opts);
  if (result === ERR_NO_PATH) {
    // need to move to the path
    const path = getCachedPath(key, opts);
    if (!path) return ERR_NOT_FOUND;
    return moveTo(creep, path);
  }
  return result;
}
