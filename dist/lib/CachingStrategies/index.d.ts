export interface CachingStrategy {
    get(key: string): string;
    set(key: string, value: string): void;
    delete(key: string): void;
}
export interface Serializer<T> {
    serialize(value?: T): string | undefined;
    deserialize(value?: string): T | undefined;
}
