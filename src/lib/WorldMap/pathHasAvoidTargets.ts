import { MoveTarget } from "lib";

export const pathHasAvoidTargets = 
(path: RoomPosition[], avoidTargets: MoveTarget[]) => {
  if (path.length === 0 || avoidTargets.length === 0) return false; // no path or no avoid targets
  return path.some((pos) => {
    return avoidTargets.some((target) => {
      return pos.inRangeTo(target.pos, target.range);
    });
  });
}