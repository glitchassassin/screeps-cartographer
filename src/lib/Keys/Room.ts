import { packRoomName } from '../../utils/packPositions';

/**
 * Derives a cache key namespaced to a particular room
 */
export const roomKey = (room: string, key?: string) => packRoomName(room) + (key ?? '');
