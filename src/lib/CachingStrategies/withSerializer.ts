import { CachingStrategy, GenericCachingStrategy, Serializer } from '.';

const cache = new Map<CachingStrategy, Map<Serializer<any>, Map<string, any>>>();

function cachedMap(strategy: CachingStrategy, serializer: Serializer<any>): Map<string, any> {
  const strategyMap = cache.get(strategy) ?? new Map<Serializer<any>, Map<string, any>>();
  cache.set(strategy, strategyMap);
  const serializerMap = strategyMap.get(serializer) ?? new Map<string, any>();
  strategyMap.set(serializer, serializerMap);
  return serializerMap;
}

export const withSerializer = <T>(strategy: CachingStrategy, serializer: Serializer<T>): GenericCachingStrategy<T> => ({
  // default most methods from strategy
  ...strategy,
  // override certain methods for serialization
  get(key: string): T | undefined {
    const map = cachedMap(strategy, serializer);
    const serializedValue = strategy.get(key);
    if (serializedValue === undefined) map.delete(key); // make sure cache isn't expired
    const value = map.get(key) ?? serializer.deserialize(serializedValue);
    if (value !== undefined) map.set(key, value);
    return value;
  },
  set(key: string, value: T) {
    const v = serializer.serialize(value);
    const map = cachedMap(strategy, serializer);
    if (v) {
      strategy.set(key, v);
      map.set(key, value);
    } else {
      strategy.delete(key);
      map.delete(key);
    }
  },
  delete(key) {
    strategy.delete(key);
    const map = cachedMap(strategy, serializer);
    map.delete(key);
  },
  with<T>(serializer: Serializer<T>) {
    return withSerializer(strategy, serializer);
  }
});
