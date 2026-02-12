/**
 * 간단한 메모리 캐시 구현
 * 프로덕션 환경에서는 Redis 사용 권장
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private defaultTTL: number = 300) {
    // 1분마다 만료된 항목 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    const expiresAt = Date.now() + (ttl || this.defaultTTL) * 1000;
    this.cache.set(key, { value, expiresAt });
    return true;
  }

  del(key: string): number {
    return this.cache.delete(key) ? 1 : 0;
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

export const cacheService = new SimpleCache(300); // 기본 5분 TTL

// 캐시 키 생성 헬퍼
export const cacheKeys = {
  userProfile: (userId: string) => `user:profile:${userId}`,
  group: (groupId: string) => `group:${groupId}`,
  userGroups: (userId: string) => `user:groups:${userId}`,
  ranking: (groupId: string, date: string) => `ranking:${groupId}:${date}`,
  pomodoroSettings: (userId: string) => `pomodoro:settings:${userId}`,
} as const;
