import { GenericCachingStrategy } from '.';

const cache = new Map<string, any>();
const expirationCache = new Map<string, number>();

export const HeapCache: GenericCachingStrategy<any> = {
  set(key: string, value: any, expiration?: number) {
    cache.set(key, value);
    if (expiration !== undefined) {
      expirationCache.set(key, expiration);
    }
  },
  get(key: string) {
    return cache.get(key);
  },
  expires(key: string) {
    return expirationCache.get(key);
  },
  delete(key: string) {
    cache.delete(key);
  },
  with() {
    return HeapCache; // HeapCache never uses serializers
  },
  clean() {
    for (const [key, expires] of expirationCache) {
      if (Game.time >= expires) {
        HeapCache.delete(key);
        expirationCache.delete(key);
      }
    }
  }
};
