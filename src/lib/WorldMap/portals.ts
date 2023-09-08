import { config } from 'config';
import { CoordMap } from 'lib/Utils/CoordMap';
import { Codec } from 'screeps-utf15';
import { packCoordList, packRoomName, unpackCoordList, unpackRoomName } from 'utils/packPositions';
import { isCenterRoom, isHighway } from './selectors';

const timeCodec = new Codec({ array: false, depth: 30 });

export interface PortalSet {
  room1: string;
  room2: string;
  expires?: number;
  portalMap: CoordMap;
}

export const portalSets = new Map<string, Map<string, PortalSet>>();

// deserialize portal sets after a global reset
Memory[config.MEMORY_PORTAL_PATH] ??= [];
for (const serializedPortalSet of Memory[config.MEMORY_PORTAL_PATH]) {
  const portalSet = deserializePortalSet(serializedPortalSet);
  const originMap = portalSets.get(portalSet.room1) ?? new Map<string, PortalSet>();
  originMap.set(portalSet.room2, portalSet);
  portalSets.set(portalSet.room1, originMap);
  const destinationMap = portalSets.get(portalSet.room2) ?? new Map<string, PortalSet>();
  destinationMap.set(portalSet.room1, portalSet);
  portalSets.set(portalSet.room2, destinationMap);
}

/**
 * Portal sets are linked both ways, so
 * .get(origin).get(destination) === .get(destination).get(origin)
 * (but the `room1` and `room2` don't necessarily correspond to the lookup order)
 */
export function scanPortals(room: string) {
  // only scan highways and center rooms to save CPU
  if (!isHighway(room) && !isCenterRoom(room)) return;

  const observedTargets = new Set<string>();
  for (const portalSet of collectIntrashardPortals(room)) {
    const originMap = portalSets.get(portalSet.room1) ?? new Map<string, PortalSet>();
    originMap.set(portalSet.room2, portalSet);
    const destinationMap = portalSets.get(portalSet.room2) ?? new Map<string, PortalSet>();
    destinationMap.set(portalSet.room1, portalSet);
    observedTargets.add(portalSet.room2);
  }

  // cleanup old portal sets
  const portalSetMap = portalSets.get(room);
  for (const [to, portalSet] of portalSetMap?.entries() ?? []) {
    if (!observedTargets.has(to) || (portalSet.expires && portalSet.expires < Game.time)) {
      // this connection has disappeared or expired
      portalSets.get(room)?.delete(to);
      portalSets.get(to)?.delete(room);
    }
  }
}

export function cachePortals() {
  // serialize portal sets
  const allPortalSets = new Set();
  Memory[config.MEMORY_PORTAL_PATH] = [];
  for (const portalSetMap of portalSets.values()) {
    for (const portalSet of portalSetMap.values()) {
      if (!allPortalSets.has(portalSet)) {
        Memory[config.MEMORY_PORTAL_PATH].push(serializePortalSet(portalSet));
      }
      allPortalSets.add(portalSet);
    }
  }
}

/**
 * A room may have many portals, but these will generally link to only
 * a few other rooms. This function will serialize the origin room,
 * target room, and source and destination coords for each portal pair.
 *
 * This assumes:
 * 1. A portal's destination square always has a reverse portal on the
 *    other side
 * 2. All portals to a given target room have the same expiration
 */
function collectIntrashardPortals(room: string): PortalSet[] {
  if (!Game.rooms[room]) return [];

  // collect portal links by room target
  const portalSets = new Map<string, PortalSet>();
  for (const portal of Game.rooms[room].find(FIND_STRUCTURES, {
    filter: { structureType: STRUCTURE_PORTAL }
  }) as StructurePortal[]) {
    if (!(portal.destination instanceof RoomPosition)) continue; // ignore intershard portals

    const mapping = portalSets.get(portal.destination.roomName) ?? {
      room1: room,
      room2: portal.destination.roomName,
      portalMap: new CoordMap()
    };
    portalSets.set(portal.destination.roomName, mapping);
    mapping.portalMap.set(portal.pos, portal.destination);
    if (portal.ticksToDecay) {
      mapping.expires = Game.time + portal.ticksToDecay;
    } else {
      delete mapping.expires;
    }
  }

  return [...portalSets.values()];
}

/**
 * Format:
 *
 * 1. Origin room (2 chars, packed)
 * 2. Target room (2 chars, packed)
 * 3. Expiration ()
 */
function serializePortalSet(portalSet: PortalSet) {
  let serialized = '';

  // serialize rooms
  serialized += packRoomName(portalSet.room1);
  serialized += packRoomName(portalSet.room2);
  serialized += timeCodec.encode(portalSet.expires ?? 0);
  serialized += packCoordList([...portalSet.portalMap.entries()].flat());
  return serialized;
}

function deserializePortalSet(serialized: string): PortalSet {
  const origin = unpackRoomName(serialized.slice(0, 3));
  const target = unpackRoomName(serialized.slice(3, 6));
  const expires = timeCodec.decode(serialized.slice(6, 8));
  const portalMap = new CoordMap();
  const unpackedCoords = unpackCoordList(serialized.slice(8));
  for (let i = 0; i < unpackedCoords.length; i += 2) {
    portalMap.set(unpackedCoords[i], unpackedCoords[i + 1]);
  }

  return {
    room1: origin,
    room2: target,
    expires: expires !== 0 ? expires : undefined,
    portalMap
  };
}

export function describeExitsWithPortals(room: string): string[] {
  // initial set with normal room exits
  const exits = new Set(Object.values(Game.map.describeExits(room)));

  // add portals to set
  const portalSetMap = portalSets.get(room);
  if (!portalSetMap) return [...exits];
  for (const portalSet of portalSetMap.values()) {
    exits.add(portalSet.room2);
  }
  return [...exits];
}
