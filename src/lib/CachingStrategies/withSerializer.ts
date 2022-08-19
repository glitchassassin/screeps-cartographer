import { CachingStrategy, Serializer } from '.';

export const withSerializer = <T>(strategy: CachingStrategy, serializer: Serializer<T>) => ({
  get(key: string) {
    return serializer.deserialize(strategy.get(key));
  },
  set(key: string, value: T) {
    const v = serializer.serialize(value);
    if (v) {
      strategy.set(key, v);
    } else {
      strategy.delete(key);
    }
  },
  delete(key: string) {
    strategy.delete(key);
  }
});
