import { HeapCache } from './Heap';
import { MemoryCache } from './Memory';

export interface CachingStrategy extends GenericCachingStrategy<string> {}
export interface GenericCachingStrategy<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, expiration?: number): void;
  expires(key: string): number | undefined;
  delete(key: string): void;
  with<T>(serializer: Serializer<T>): GenericCachingStrategy<T>;
  clean(): void;
}
export interface Serializer<T> {
  serialize(value?: T): string | undefined;
  deserialize(value?: string): T | undefined;
}

export * from './Heap';
export * from './Memory';
export * from './Serializers/MoveTarget';
export * from './Serializers/Number';
export * from './Serializers/RoomPosition';

export function cleanAllCaches() {
  MemoryCache.clean();
  HeapCache.clean();
}
