import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisException } from './redis.exceptions';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redisClient: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async set(key: string, value: string, ttl: number) {
    try {
      await this.redisClient.set(key, value, 'EX', ttl);
    } catch (error) {
      this.logger.error(`Error al establecer clave Redis ${key}`, error);
      throw new RedisException(
        'SET',
        key,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      this.logger.error(`Error al obtener clave Redis ${key}`, error);
      throw new RedisException(
        'GET',
        key,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async del(key: string) {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(`Error al eliminar clave Redis ${key}`, error);
      throw new RedisException(
        'DEL',
        key,
        error instanceof Error ? error : undefined,
      );
    }
  }

  onModuleDestroy() {
    this.redisClient.quit();
  }
}
