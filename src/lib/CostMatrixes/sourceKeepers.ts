import { MemoryCache } from '../CachingStrategies/Memory';
import { PositionListSerializer } from '../CachingStrategies/Serializers/RoomPosition';
import { calculateNearbyPositions } from '../Movement/selectors';
import { isSourceKeeperRoom, isCenterRoom } from '../WorldMap/selectors';

const keys = {
  SOURCE_KEEPER_POS_LIST: '_ck'
};

const skKey = (room: string) => keys.SOURCE_KEEPER_POS_LIST + room;

export function scanSourceKeepers(room: string) {
  if (isSourceKeeperRoom(room) && !isCenterRoom(room) && !MemoryCache.get(skKey(room))) {
    MemoryCache.with(PositionListSerializer).set(
      skKey(room),
      [...Game.rooms[room].find(FIND_SOURCES), ...Game.rooms[room].find(FIND_MINERALS)].map(s => s.pos)
    );
  }
}

export function avoidSourceKeepers(room: string, cm: CostMatrix) {
  const skPositions = MemoryCache.with(PositionListSerializer).get(skKey(room)) ?? [];

  for (const pos of skPositions) {
    calculateNearbyPositions(pos, 5, true).forEach(p => cm.set(p.x, p.y, 0xff));
  }

  return cm;
}
