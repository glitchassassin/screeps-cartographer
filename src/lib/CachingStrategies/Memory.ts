import { config } from 'config';

declare global {
  interface Memory {
    [index: string]: any;
  }
}

function memoryCache() {
  Memory[config.MEMORY_CACHE_PATH] ??= {};
  return Memory[config.MEMORY_CACHE_PATH] as Record<string, string>;
}

export const MemoryCache = {
  set(key: string, value: string) {
    memoryCache()[key] = value;
  },
  get(key: string) {
    return memoryCache()[key];
  },
  delete(key: string) {
    delete memoryCache()[key];
  }
};
