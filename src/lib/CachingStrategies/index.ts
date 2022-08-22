import { HeapCache } from './Heap';
import { MemoryCache } from './Memory';

export interface CachingStrategy extends GenericCachingStrategy<string> {}
export interface GenericCachingStrategy<T> {
  /**
   * Returns the cached value, or undefined if it doesn't exist
   */
  get(key: string): T | undefined;
  /**
   * Sets the value in the cache, with an optional expiration (as a future Game.time)
   */
  set(key: string, value: T, expiration?: number): void;
  /**
   * Returns the expiration time, or undefined if it doesn't exist
   */
  expires(key: string): number | undefined;
  /**
   * Deletes the key from the cache
   */
  delete(key: string): void;
  /**
   * Wraps the cache in a serializer to store objects more compactly.
   * HeapCache notably needs no serializers and simply ignores this.
   */
  with<T>(serializer: Serializer<T>): GenericCachingStrategy<T>;
  /**
   * Cleans up any expired cache values
   */
  clean(): void;
}

export interface Serializer<T> {
  /**
   * Unique key used internally for caching deserialized values
   */
  key: string;
  /**
   * If unable to serialize value, serializer should throw an error; this
   * will prevent the cached item from being created
   */
  serialize(value?: T): string | undefined;
  /**
   * If unable to deserialize value, deserializer should throw an error; this
   * will prevent the cached item from being created
   */
  deserialize(value?: string): T | undefined;
}

export * from './Serializers/MoveTarget';
export * from './Serializers/Number';
export * from './Serializers/RoomPosition';

export function cleanAllCaches() {
  MemoryCache.clean();
  HeapCache.clean();
}

export const CachingStrategies = {
  HeapCache,
  MemoryCache
};
