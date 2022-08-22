import { config } from 'config';
import { CachingStrategy } from '.';
import { NumberSerializer } from './Serializers/Number';
import { withSerializer } from './withSerializer';

declare global {
  interface Memory {
    [index: string]: any;
  }
}

function memoryCache() {
  Memory[config.MEMORY_CACHE_PATH] ??= {};
  return Memory[config.MEMORY_CACHE_PATH] as Record<string, string>;
}

function memoryExpirationCache() {
  Memory[config.MEMORY_CACHE_EXPIRATION_PATH] ??= {};
  return Memory[config.MEMORY_CACHE_EXPIRATION_PATH] as Record<string, string>;
}

export const MemoryCache: CachingStrategy = {
  set(key: string, value: string, expiration?: number) {
    memoryCache()[key] = value;
    if (expiration !== undefined) {
      const expires = NumberSerializer.serialize(expiration);
      if (expires) memoryExpirationCache()[key] = expires;
    }
  },
  get(key: string) {
    return memoryCache()[key];
  },
  expires(key: string) {
    return NumberSerializer.deserialize(memoryExpirationCache()[key]);
  },
  delete(key: string) {
    delete memoryCache()[key];
  },
  with(serializer) {
    return withSerializer(MemoryCache, serializer);
  },
  clean() {
    const expirationCache = memoryExpirationCache();
    for (const key in expirationCache) {
      const expires = NumberSerializer.deserialize(expirationCache[key]);
      if (expires !== undefined && Game.time >= expires) {
        MemoryCache.delete(key);
        delete expirationCache[key];
      }
    }
  }
};
