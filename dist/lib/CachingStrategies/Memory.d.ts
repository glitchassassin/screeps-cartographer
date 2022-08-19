import { CachingStrategy } from '.';
declare global {
    interface Memory {
        [index: string]: any;
    }
}
export declare const MemoryCache: CachingStrategy;
