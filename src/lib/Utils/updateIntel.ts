import { scanSourceKeepers } from 'lib/CostMatrixes/sourceKeepers';
import { cachePortals, scanPortals } from 'lib/WorldMap/portals';

export function updateIntel() {
  for (const room in Game.rooms) {
    scanSourceKeepers(room);
    scanPortals(room);
  }

  cachePortals();
}
