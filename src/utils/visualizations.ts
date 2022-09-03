import { MoveTarget } from '../lib';

export function visualizeMoveTarget({ pos, range }: MoveTarget, opts?: PolyStyle) {
  new RoomVisual(pos.roomName)
    .circle(pos, { radius: 0.5, ...opts })
    .rect(Math.max(0, pos.x - range - 0.5), Math.max(0, pos.y - range - 0.5), range * 2 + 1, range * 2 + 1, opts);
}
