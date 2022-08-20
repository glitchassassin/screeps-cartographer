export const config = {
  DEFAULT_MOVE_OPTS: {
    serializeMemory: false,
    reusePath: 5,
    visualizePathStyle: {
      fill: 'transparent',
      stroke: '#fff',
      lineStyle: 'dashed',
      strokeWidth: 0.15,
      opacity: 0.1
    } as PolyStyle,
    avoidCreeps: true,
    avoidObstacleStructures: true,
    roadCost: 1,
    plainCost: 2,
    swampCost: 10
  },
  MEMORY_CACHE_PATH: '_cg',
  MEMORY_CACHE_EXPIRATION_PATH: '_cge'
};
