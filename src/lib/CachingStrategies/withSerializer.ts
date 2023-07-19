import { CachingStrategy, GenericCachingStrategy, Serializer } from '.';
import { HeapCache } from './Heap';

const cacheKey = <T>(serializer: Serializer<T>, key: string) => `cg_${serializer.key}_${key}`;

/**
 * Wraps the caching method with a serializer to read/write objects from the cache.
 * Assumes serializers are idempotent - same input will produce the same deserialized
 * output. Caches the deserialized output so it can be looked up quickly instead of
 * running the (more expensive) deserialization each tick. These caches are cleaned
 * up after CREEP_LIFE_TIME ticks or when the target item is deleted.
 */
export const withSerializer = <T>(strategy: CachingStrategy, serializer: Serializer<T>): GenericCachingStrategy<T> => ({
  // default most methods from strategy
  ...strategy,
  // override certain methods for serialization
  get(key: string): T | undefined {
    const serializedValue = strategy.get(key);
    if (!serializedValue) return undefined;
    try {
      const value = HeapCache.get(cacheKey(serializer, serializedValue)) ?? serializer.deserialize(serializedValue);
      if (value !== undefined) HeapCache.set(cacheKey(serializer, serializedValue), value, Game.time + CREEP_LIFE_TIME);
      return value;
    } catch (e) {
      // error deserializing value, discard cache
      strategy.delete(key);
      HeapCache.delete(cacheKey(serializer, serializedValue));
      return undefined;
    }
  },
  set(key: string, value: T, expiration?: number) {
    // free previously cached deserialized value
    const previous = strategy.get(key);
    if (previous) HeapCache.delete(cacheKey(serializer, previous));

    const v = serializer.serialize(value);
    if (v) {
      strategy.set(key, v, expiration);
      HeapCache.set(cacheKey(serializer, v), value, Game.time + CREEP_LIFE_TIME);
    } else {
      strategy.delete(key);
    }
  },
  delete(key) {
    const previous = strategy.get(key);
    if (previous) HeapCache.delete(cacheKey(serializer, previous));
    strategy.delete(key);
  },
  with<T>(serializer: Serializer<T>) {
    return withSerializer(strategy, serializer);
  }
});
