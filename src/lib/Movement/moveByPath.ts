import { followPath, getCachedPath, MoveByCachedPathOpts } from './cachedPaths';
import { moveTo } from './moveTo';

/**
 * Moves a creep along a cached path. If `opts.reverse`, moves it backwards.
 * If the creep isn't already on the path, it moves to the path first. Returns
 * ERR_NO_PATH if the cached path doesn't exist.
 */
export function moveByPath(creep: Creep, key: string, opts?: MoveByCachedPathOpts) {
  const result = followPath(creep, key, opts);
  if (result === ERR_NOT_FOUND) {
    // need to move to the path
    const path = getCachedPath(key, opts);
    if (!path) return ERR_NO_PATH;
    return moveTo(creep, path);
  }
  return result;
}
