/**
 * 缓存管理器
 */

interface CacheItem<T> {
    data: T;
    expiry: number;
}

/**
 * 简单的内存缓存管理器
 * 注意：Cloudflare Workers 每次请求都是独立的，缓存仅在单次请求生命周期内有效
 */
export class CacheManager {
    private static cache = new Map<string, CacheItem<unknown>>();

    /**
     * 设置缓存
     */
    static set<T>(key: string, value: T, ttlMs: number = 60000): void {
        this.cache.set(key, {
            data: value,
            expiry: Date.now() + ttlMs,
        });
    }

    /**
     * 获取缓存
     */
    static get<T>(key: string): T | null {
        const item = this.cache.get(key) as CacheItem<T> | undefined;

        if (!item) {
            return null;
        }

        // 检查是否过期
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    /**
     * 删除缓存
     */
    static delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * 清空所有缓存
     */
    static clear(): void {
        this.cache.clear();
    }

    /**
     * 检查缓存是否存在且未过期
     */
    static has(key: string): boolean {
        const item = this.cache.get(key);
        if (!item) {
            return false;
        }

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * 获取缓存大小
     */
    static size(): number {
        // 清理过期缓存
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now > value.expiry) {
                this.cache.delete(key);
            }
        }
        return this.cache.size;
    }
}
