import { packRoomName } from '../../utils/packrat';

/**
 * Derives a cache key namespaced to a particular room
 */
export const roomKey = (room: string, key?: string) => packRoomName(room) + (key ?? '');
