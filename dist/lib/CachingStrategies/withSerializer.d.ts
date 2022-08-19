import { CachingStrategy, Serializer } from '.';
export declare const withSerializer: <T>(strategy: CachingStrategy, serializer: Serializer<T>) => {
    get(key: string): T | undefined;
    set(key: string, value: T): void;
    delete(key: string): void;
};
