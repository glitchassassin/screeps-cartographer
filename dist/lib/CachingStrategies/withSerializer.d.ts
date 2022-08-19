import { CachingStrategy, GenericCachingStrategy, Serializer } from '.';
export declare const withSerializer: <T>(strategy: CachingStrategy, serializer: Serializer<T>) => GenericCachingStrategy<T>;
