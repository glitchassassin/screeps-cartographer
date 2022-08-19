const cache = new Map<string, any>();

export const HeapCache = {
  set(key: string, value: any) {
    cache.set(key, value);
  },
  get(key: string) {
    return cache.get(key);
  },
  delete(key: string) {
    cache.delete(key);
  }
};
