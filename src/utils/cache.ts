// 缓存管理器 - 实现 KV + Cache API 两级缓存

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

export class CacheManager {
  private kv: KVNamespace;
  private stats: CacheStats;
  private readonly DEFAULT_TTL = 300; // 5分钟

  constructor(kv: KVNamespace) {
    this.kv = kv;
    this.stats = { hits: 0, misses: 0, size: 0 };
  }

  // 获取缓存值
  async get<T>(key: string): Promise<T | null> {
    try {
      // 先尝试 Cache API (内存缓存)
      const cache = await caches.open('subscription-manager');
      const request = new Request(`http://cache/${key}`);
      const response = await cache.match(request);

      if (response) {
        const entry: CacheEntry<T> = await response.json();
        if (entry.expiresAt > Date.now()) {
          this.stats.hits++;
          return entry.value;
        }
        // 过期，删除
        await cache.delete(request);
      }

      // 再尝试 KV (持久化缓存)
      const kvValue = await this.kv.get<CacheEntry<T>>(key, 'json');
      if (kvValue && kvValue.expiresAt > Date.now()) {
        // 回填到 Cache API
        await this.setCacheApi(key, kvValue);
        this.stats.hits++;
        return kvValue.value;
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // 设置缓存值
  async set<T>(
    key: string,
    value: T,
    ttl: number = this.DEFAULT_TTL,
    tags: string[] = []
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl * 1000,
      tags,
    };

    try {
      // 写入 Cache API
      await this.setCacheApi(key, entry);

      // 写入 KV (异步，不阻塞)
      await this.kv.put(key, JSON.stringify(entry), {
        expirationTtl: ttl,
      });

      // 如果有标签，记录标签索引
      if (tags.length > 0) {
        await this.addToTagIndex(key, tags);
      }

      this.stats.size++;
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // 删除缓存
  async delete(key: string): Promise<void> {
    try {
      const cache = await caches.open('subscription-manager');
      await cache.delete(new Request(`http://cache/${key}`));
      await this.kv.delete(key);
      this.stats.size = Math.max(0, this.stats.size - 1);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // 按标签批量失效
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keys = await this.kv.get<string[]>(`tag:${tag}`, 'json');
      if (keys && Array.isArray(keys)) {
        await Promise.all(keys.map((key) => this.delete(key)));
        await this.kv.delete(`tag:${tag}`);
      }
    } catch (error) {
      console.error('Cache invalidate by tag error:', error);
    }
  }

  // 清空所有缓存
  async clear(): Promise<void> {
    try {
      // 清空 Cache API
      const cache = await caches.open('subscription-manager');
      const keys = await cache.keys();
      await Promise.all(keys.map((key) => cache.delete(key)));

      // 清空 KV (通过列出所有键删除)
      const kvKeys = await this.kv.list();
      await Promise.all(kvKeys.keys.map((key) => this.kv.delete(key.name)));

      this.stats = { hits: 0, misses: 0, size: 0 };
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  // 获取缓存统计
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // 预热缓存
  async warmup<T>(keys: string[], fetcher: (key: string) => Promise<T>, ttl?: number): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        const value = await fetcher(key);
        await this.set(key, value, ttl);
      })
    );
  }

  // 私有方法：写入 Cache API
  private async setCacheApi<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    const cache = await caches.open('subscription-manager');
    const response = new Response(JSON.stringify(entry), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${Math.floor((entry.expiresAt - Date.now()) / 1000)}`,
      },
    });
    await cache.put(new Request(`http://cache/${key}`), response);
  }

  // 私有方法：添加到标签索引
  private async addToTagIndex(key: string, tags: string[]): Promise<void> {
    await Promise.all(
      tags.map(async (tag) => {
        const indexKey = `tag:${tag}`;
        const existing = await this.kv.get<string[]>(indexKey, 'json') || [];
        if (!existing.includes(key)) {
          existing.push(key);
          await this.kv.put(indexKey, JSON.stringify(existing));
        }
      })
    );
  }
}

// 创建缓存管理器实例的工厂函数
export function createCacheManager(kv: KVNamespace): CacheManager {
  return new CacheManager(kv);
}
