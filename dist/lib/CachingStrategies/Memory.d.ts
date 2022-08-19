declare global {
    interface Memory {
        [index: string]: any;
    }
}
export declare const MemoryCache: {
    set(key: string, value: string): void;
    get(key: string): string;
    delete(key: string): void;
};
