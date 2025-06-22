import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

// Mock de ioredis
jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      quit: jest.fn(),
    })),
  };
});

describe('RedisService', () => {
  let service: RedisService;
  let redisClient: Redis;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);
    redisClient = (service as any).redisClient;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('set', () => {
    it('should call redis set with correct parameters', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 3600;

      await service.set(key, value, ttl);

      expect(redisClient.set).toHaveBeenCalledWith(key, value, 'EX', ttl);
    });
  });

  describe('get', () => {
    it('should call redis get with correct key', async () => {
      const key = 'test-key';
      const mockValue = 'test-value';

      (redisClient.get as jest.Mock).mockResolvedValue(mockValue);

      const result = await service.get(key);

      expect(redisClient.get).toHaveBeenCalledWith(key);
      expect(result).toBe(mockValue);
    });

    it('should return null when key does not exist', async () => {
      const key = 'non-existent-key';

      (redisClient.get as jest.Mock).mockResolvedValue(null);

      const result = await service.get(key);

      expect(redisClient.get).toHaveBeenCalledWith(key);
      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('should call redis del with correct key', async () => {
      const key = 'test-key';

      await service.del(key);

      expect(redisClient.del).toHaveBeenCalledWith(key);
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit redis client on module destroy', () => {
      service.onModuleDestroy();

      expect(redisClient.quit).toHaveBeenCalled();
    });
  });
});
