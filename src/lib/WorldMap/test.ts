import { findRoute } from './findRoute';

let originalRoute: string[];
let route: string[];
let originalPath: RoomPosition[];
let path: RoomPosition[];

export function test() {
  const from = 'W2N5';
  const to = 'W2N6';
  if (!originalRoute) {
    const result = Game.map.findRoute(from, to);
    originalRoute = result !== ERR_NO_PATH ? [from, ...result.map(({ room }) => room)] : [];
  }
  if (!route) {
    route = findRoute(from, to) ?? [];
  }
  if (originalRoute && !originalPath) {
    const result = PathFinder.search(
      new RoomPosition(25, 25, from),
      { pos: new RoomPosition(25, 25, to), range: 20 },
      {
        maxOps: 100000,
        maxRooms: 64,
        swampCost: 1,
        roomCallback(room) {
          return originalRoute.includes(room);
        }
      }
    );
    originalPath = result.path;
    console.log('With original findRoute', JSON.stringify({ ...result, path: undefined, length: originalPath.length }));
  }
  if (route && !path) {
    const result = PathFinder.search(
      new RoomPosition(25, 25, from),
      { pos: new RoomPosition(25, 25, to), range: 20 },
      {
        maxOps: 100000,
        maxRooms: 64,
        swampCost: 1,
        roomCallback(room) {
          return route.includes(room);
        }
      }
    );
    Game.rooms['room'].findExitTo;
    path = result.path;
    console.log('With improved findRoute', JSON.stringify({ ...result, path: undefined, length: path.length }));
  }
  for (const room of originalRoute) {
    Game.map.visual.rect(new RoomPosition(2, 2, room), 46, 46, { stroke: '#ffff00', fill: 'transparent' });
  }
  for (const room of route) {
    Game.map.visual.rect(new RoomPosition(0, 0, room), 50, 50, { stroke: '#00ffff', fill: 'transparent' });
  }
  Game.map.visual.poly(path, { stroke: '#00ffff', fill: 'transparent' });
  Game.map.visual.poly(originalPath, { stroke: '#ffff00', fill: 'transparent' });
}
