import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { RedisService } from 'src/shared/redis/redis.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let redisService: RedisService;

  const mockPayload = {
    sub: 'user-id',
    email: 'test@example.com',
    role: 'STUDENT_REGULAR',
  };

  // Store original env
  const originalEnv = process.env;

  beforeEach(async () => {
    // Setup environment variable
    process.env.JWT_SECRET = 'test-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    redisService = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user data when token is valid', async () => {
      const mockReq = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      // Mock Redis response (token not blacklisted)
      jest.spyOn(redisService, 'get').mockResolvedValue(null);

      const result = await strategy.validate(mockReq as any, mockPayload);

      expect(redisService.get).toHaveBeenCalledWith('bl_valid-token');
      expect(result).toEqual({
        userId: mockPayload.sub,
        email: mockPayload.email,
        role: mockPayload.role,
      });
    });

    it('should throw UnauthorizedException when token is missing', async () => {
      const mockReq = {
        headers: {},
      };

      await expect(
        strategy.validate(mockReq as any, mockPayload),
      ).rejects.toThrow(
        new UnauthorizedException('Falta el token de autorización'),
      );
    });

    it('should throw UnauthorizedException when token is blacklisted', async () => {
      const mockReq = {
        headers: {
          authorization: 'Bearer blacklisted-token',
        },
      };

      // Mock Redis response (token is blacklisted)
      jest.spyOn(redisService, 'get').mockResolvedValue('true');

      await expect(
        strategy.validate(mockReq as any, mockPayload),
      ).rejects.toThrow(new UnauthorizedException('Token no válido'));

      expect(redisService.get).toHaveBeenCalledWith('bl_blacklisted-token');
    });
  });
});
