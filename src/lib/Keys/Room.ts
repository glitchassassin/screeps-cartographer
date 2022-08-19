import { packRoomName } from 'utils/packrat';

export const roomKey = (room: string, key?: string) => packRoomName(room) + (key ?? '');
