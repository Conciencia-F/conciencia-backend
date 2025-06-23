import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../shared/redis/redis.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from './interfaces/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from 'src/email/email.service';

// Mock de bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let redisService: RedisService;
  let emailService: EmailService;

  // Mock data
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'Test',
    lastName: 'User',
    role: Role.STUDENT_REGULAR,
    isVerified: true,
    verificationToken: null,
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLoginDto = {
    email: 'test@example.com',
    password: 'password123',
  };

  // Mock token values
  const mockAccessToken = 'mock-access-token';
  const mockRefreshToken = 'mock-refresh-token';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(), verify: jest.fn(), decode: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
        },
        {
          provide: EmailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    redisService = module.get(RedisService);
    emailService = module.get(EmailService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  //---- REGISTER ------
  describe('register', () => {
    describe('Successful registration', () => {
      beforeEach(() => {
        // Mock user doesn't exist yet
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

        // Mock user creation
        jest.spyOn(prismaService.user, 'create').mockResolvedValue({
          id: '1',
          email: 'test@example.com',
          password: 'hashedPassword123',
          firstName: 'Test',
          lastName: 'User',
          role: Role.STUDENT_REGULAR,
          isVerified: false,
          verificationToken: 'some-token',
          resetToken: null,
          resetTokenExpiry: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Mock password hashing
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      });

      it('should register a new user successfully', async () => {
        const registerDto = {
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: Role.STUDENT_REGULAR,
        };

        const result = await service.register(registerDto);

        // Verify user was checked
        expect(prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { email: registerDto.email },
        });

        // Verify password was hashed
        expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);

        // Verify user was created
        expect(prismaService.user.create).toHaveBeenCalledWith({
          data: {
            email: registerDto.email,
            password: 'hashedPassword123', // The hashed password
            firstName: registerDto.firstName,
            lastName: registerDto.lastName,
            role: registerDto.role,
            isVerified: false,
          },
        });

        // Verify returned data
        expect(result).toEqual({
          message: 'Usuario registrado correctamente',
          userId: '1',
        });
      });
    });

    describe('Failed registration - Email already exists', () => {
      beforeEach(() => {
        jest
          .spyOn(prismaService.user, 'findUnique')
          .mockResolvedValue(mockUser);
      });

      it('should throw ConflictException when email already exists', async () => {
        const registerDto = {
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: Role.STUDENT_REGULAR,
        };

        await expect(service.register(registerDto)).rejects.toThrow(
          new ConflictException(
            `El correo ${registerDto.email} ya está registrado.`,
          ),
        );

        expect(prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { email: registerDto.email },
        });
      });
    });
  });

  //---- REFRESH ACCESS TOKEN ----
  describe('refreshAccessToken', () => {
    const mockRefreshToken = 'valid-refresh-token';
    const mockUserId = '1';
    const mockDecodedToken = { sub: mockUserId };

    describe('Successful token refresh', () => {
      beforeEach(() => {
        // Mock JWT verify
        jest.spyOn(jwtService, 'verify').mockReturnValue(mockDecodedToken);

        // Mock Redis get (token exists and matches)
        jest.spyOn(redisService, 'get').mockResolvedValue(mockRefreshToken);

        // Mock user find
        jest
          .spyOn(prismaService.user, 'findUnique')
          .mockResolvedValue(mockUser);

        // Mock JWT sign for new access token
        jest.spyOn(jwtService, 'sign').mockReturnValue(mockAccessToken);
      });

      it('should return a new access token', async () => {
        const result = await service.refreshAccessToken(mockRefreshToken);

        // Verify JWT was verified
        expect(jwtService.verify).toHaveBeenCalledWith(mockRefreshToken);

        // Verify Redis was checked
        expect(redisService.get).toHaveBeenCalledWith(`refresh_${mockUserId}`);

        // Verify user was found
        expect(prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: mockUserId },
        });

        // Verify new token was created
        expect(jwtService.sign).toHaveBeenCalled();

        // Verify returned data structure
        expect(result).toEqual({
          accessToken: {
            token: mockAccessToken,
            expiresIn: expect.any(Number),
            type: 'access',
          },
        });
      });
    });

    describe('Failed token refresh - Invalid token', () => {
      beforeEach(() => {
        // Mock JWT verify to throw an error
        jest.spyOn(jwtService, 'verify').mockImplementation(() => {
          throw new Error('Invalid token');
        });
      });

      it('should throw UnauthorizedException for invalid token', async () => {
        await expect(
          service.refreshAccessToken('invalid-token'),
        ).rejects.toThrow(
          new UnauthorizedException('Token de refresco inválido o expirado'),
        );
      });
    });

    describe('Failed token refresh - Token not in Redis', () => {
      beforeEach(() => {
        // Mock JWT verify
        jest.spyOn(jwtService, 'verify').mockReturnValue(mockDecodedToken);

        // Mock Redis get (token doesn't exist)
        jest.spyOn(redisService, 'get').mockResolvedValue(null);
      });

      it('should throw UnauthorizedException when token not in Redis', async () => {
        await expect(
          service.refreshAccessToken(mockRefreshToken),
        ).rejects.toThrow(new UnauthorizedException('Refresh token inválido'));

        expect(redisService.get).toHaveBeenCalledWith(`refresh_${mockUserId}`);
      });
    });

    describe('Failed token refresh - Token mismatch', () => {
      beforeEach(() => {
        // Mock JWT verify
        jest.spyOn(jwtService, 'verify').mockReturnValue(mockDecodedToken);

        // Mock Redis get (different token)
        jest.spyOn(redisService, 'get').mockResolvedValue('different-token');
      });

      it("should throw UnauthorizedException when tokens don't match", async () => {
        await expect(
          service.refreshAccessToken(mockRefreshToken),
        ).rejects.toThrow(new UnauthorizedException('Refresh token inválido'));
      });
    });

    describe('Failed token refresh - User not found', () => {
      beforeEach(() => {
        // Mock JWT verify
        jest.spyOn(jwtService, 'verify').mockReturnValue(mockDecodedToken);

        // Mock Redis get (token exists and matches)
        jest.spyOn(redisService, 'get').mockResolvedValue(mockRefreshToken);

        // Mock user not found
        jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      });

      it('should throw UnauthorizedException when user not found', async () => {
        await expect(
          service.refreshAccessToken(mockRefreshToken),
        ).rejects.toThrow(new UnauthorizedException('Usuario no encontrado'));
      });
    });
  });

  //---- LOGIN ------
  describe('login', () => {
    describe('Successful login', () => {
      beforeEach(() => {
        // Mock database query
        jest
          .spyOn(prismaService.user, 'findUnique')
          .mockResolvedValue(mockUser);

        // Mock password comparison
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // Mock JWT token generation
        jest
          .spyOn(jwtService, 'sign')
          .mockReturnValueOnce(mockAccessToken) // Access token
          .mockReturnValueOnce(mockRefreshToken); // Refresh token

        // Mock Redis service
        jest.spyOn(redisService, 'set').mockResolvedValue(undefined);
      });

      it('should return tokens and user data on successful login', async () => {
        const result = await service.login(mockLoginDto);

        // Verify that the user was queried with the correct email
        expect(prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { email: mockLoginDto.email },
        });

        // Verify password was compared
        expect(bcrypt.compare).toHaveBeenCalledWith(
          mockLoginDto.password,
          mockUser.password,
        );

        // Verify JWT tokens were created
        expect(jwtService.sign).toHaveBeenCalledTimes(2);

        // Verify refresh token was stored in Redis
        expect(redisService.set).toHaveBeenCalledWith(
          `refresh_${mockUser.id}`,
          mockRefreshToken,
          expect.any(Number),
        );

        // Verify the returned data structure
        expect(result).toEqual({
          accessToken: {
            token: mockAccessToken,
            expiresIn: expect.any(Number),
            type: 'access',
          },
          refreshToken: {
            token: mockRefreshToken,
            expiresIn: expect.any(Number),
            type: 'refresh',
          },
          user: {
            id: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
          },
        });
      });
    });

    describe('Failed login - User not found', () => {
      beforeEach(() => {
        // Mock database query that returns null (user not found)
        jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      });

      it('should throw UnauthorizedException when user is not found', async () => {
        await expect(service.login(mockLoginDto)).rejects.toThrow(
          new UnauthorizedException(
            'Credenciales inválidas. Intente nuevamente.',
          ),
        );

        expect(prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { email: mockLoginDto.email },
        });
      });
    });

    describe('Failed login - Account not verified', () => {
      beforeEach(() => {
        // Mock database query that returns unverified user
        jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
          ...mockUser,
          isVerified: false,
        });
      });

      it('should throw UnauthorizedException when account is not verified', async () => {
        await expect(service.login(mockLoginDto)).rejects.toThrow(
          new UnauthorizedException(
            'Tu cuenta no está activada. Verifica tu correo para activar tu cuenta.',
          ),
        );

        expect(prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { email: mockLoginDto.email },
        });
      });
    });

    describe('Failed login - Invalid password', () => {
      beforeEach(() => {
        // Mock database query
        jest
          .spyOn(prismaService.user, 'findUnique')
          .mockResolvedValue(mockUser);

        // Mock password comparison that returns false
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      });

      it('should throw UnauthorizedException when password is incorrect', async () => {
        await expect(service.login(mockLoginDto)).rejects.toThrow(
          new UnauthorizedException(
            'Credenciales inválidas. Intente nuevamente.',
          ),
        );

        expect(prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { email: mockLoginDto.email },
        });

        expect(bcrypt.compare).toHaveBeenCalledWith(
          mockLoginDto.password,
          mockUser.password,
        );
      });
    });

    describe('Failed login - Incomplete fields', () => {
      it('should throw UnauthorizedException when email is missing', async () => {
        const incompleteDto = { email: '', password: 'password123' };

        await expect(service.login(incompleteDto)).rejects.toThrow(
          new UnauthorizedException(
            'Por favor, completa todos los campos para iniciar sesión.',
          ),
        );
      });

      it('should throw UnauthorizedException when password is missing', async () => {
        const incompleteDto = { email: 'test@example.com', password: '' };

        await expect(service.login(incompleteDto)).rejects.toThrow(
          new UnauthorizedException(
            'Por favor, completa todos los campos para iniciar sesión.',
          ),
        );
      });
    });

    describe('Error handling', () => {
      it('should handle unexpected errors during login', async () => {
        jest.spyOn(prismaService.user, 'findUnique').mockImplementation(() => {
          throw new Error('Database connection error');
        });

        await expect(service.login(mockLoginDto)).rejects.toThrow(
          new UnauthorizedException(
            'Ocurrió un error durante el inicio de sesión. Intente nuevamente.',
          ),
        );

        expect(prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { email: mockLoginDto.email },
        });
      });
    });
  });

  describe('logout', () => {
    const mockAccessToken = 'valid-access-token';
    const mockRefreshToken = 'valid-refresh-token';
    const mockDecodedAccessToken = {
      sub: '1',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };
    const mockDecodedRefreshToken = { sub: '1' };

    describe('Successful logout with both tokens', () => {
      beforeEach(() => {
        // Mock JWT decode for access token
        jest
          .spyOn(jwtService, 'decode')
          .mockReturnValueOnce(mockDecodedAccessToken);

        // Mock Redis set for blacklisting access token
        jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

        // Mock JWT decode for refresh token
        jest
          .spyOn(jwtService, 'decode')
          .mockReturnValueOnce(mockDecodedRefreshToken);

        // Mock Redis del for removing refresh token
        jest.spyOn(redisService, 'del').mockResolvedValue(undefined);
      });

      it('should invalidate both access and refresh tokens', async () => {
        await service.logout(mockAccessToken, mockRefreshToken);

        // Verify access token was decoded
        expect(jwtService.decode).toHaveBeenCalledWith(mockAccessToken);

        // Verify access token was blacklisted
        expect(redisService.set).toHaveBeenCalledWith(
          `bl_${mockAccessToken}`,
          'true',
          expect.any(Number),
        );

        // Verify refresh token was decoded
        expect(jwtService.decode).toHaveBeenCalledWith(mockRefreshToken);

        // Verify refresh token was removed
        expect(redisService.del).toHaveBeenCalledWith(
          `refresh_${mockDecodedRefreshToken.sub}`,
        );
      });
    });

    describe('Successful logout with only access token', () => {
      beforeEach(() => {
        // Mock JWT decode for access token
        jest
          .spyOn(jwtService, 'decode')
          .mockReturnValue(mockDecodedAccessToken);

        // Mock Redis set
        jest.spyOn(redisService, 'set').mockResolvedValue(undefined);
      });

      it('should only invalidate access token', async () => {
        await service.logout(mockAccessToken);

        // Verify access token was decoded
        expect(jwtService.decode).toHaveBeenCalledWith(mockAccessToken);

        // Verify access token was blacklisted
        expect(redisService.set).toHaveBeenCalledWith(
          `bl_${mockAccessToken}`,
          'true',
          expect.any(Number),
        );

        // Verify refresh token functions were not called
        expect(redisService.del).not.toHaveBeenCalled();
      });
    });

    describe('Edge case - Expired access token', () => {
      const expiredToken = 'expired-token';
      const expiredDecodedToken = {
        sub: '1',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };

      beforeEach(() => {
        // Mock JWT decode for expired token
        jest.spyOn(jwtService, 'decode').mockReturnValue(expiredDecodedToken);

        // Mock Redis set
        jest.spyOn(redisService, 'set').mockResolvedValue(undefined);
      });

      it('should not blacklist expired tokens', async () => {
        await service.logout(expiredToken);

        // Verify token was decoded
        expect(jwtService.decode).toHaveBeenCalledWith(expiredToken);

        // Verify Redis set was not called (token already expired)
        expect(redisService.set).not.toHaveBeenCalled();
      });
    });

    describe('Error handling in refresh token invalidation', () => {
      beforeEach(() => {
        // Mock JWT decode for access token
        jest
          .spyOn(jwtService, 'decode')
          .mockReturnValueOnce(mockDecodedAccessToken);

        // Mock Redis set
        jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

        // Mock JWT decode for refresh token to throw error
        jest.spyOn(jwtService, 'decode').mockImplementationOnce(() => {
          throw new Error('Invalid token format');
        });

        // Spy on console.error
        jest.spyOn(console, 'error').mockImplementation(() => {});
      });

      it('should handle errors when invalidating refresh token', async () => {
        await service.logout(mockAccessToken, 'invalid-format-token');

        // Verify error was logged
        expect(console.error).toHaveBeenCalledWith(
          'Error al invalidar refresh token:',
          expect.any(Error),
        );
      });
    });
  });

  // Prueba del método verifyEmail
  describe('verifyEmail', () => {
    describe('Token inválido o expirado', () => {
      beforeEach(() => {
        jest.spyOn(jwtService, 'verify').mockImplementation(() => {
          throw new Error('Invalid token');
        });
      });

      it('debería lanzar BadRequestException para token inválido', async () => {
        await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
          new BadRequestException('Token inválido o expirado'),
        );
        expect(jwtService.verify).toHaveBeenCalledWith('invalid-token');
      });
    });

    describe('Usuario no encontrado', () => {
      beforeEach(() => {
        jest.spyOn(jwtService, 'verify').mockReturnValue({ sub: '1' });
        jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      });

      it('should throw NotFoundException when user does not exist', async () => {
        await expect(service.verifyEmail('valid-token')).rejects.toThrow(
          new NotFoundException('Usuario no encontrado'),
        );
        expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
        expect(prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: '1' },
        });
      });
    });

    describe('Cuenta ya verificada', () => {
      beforeEach(() => {
        jest.spyOn(jwtService, 'verify').mockReturnValue({ sub: '1' });
        jest
          .spyOn(prismaService.user, 'findUnique')
          .mockResolvedValue({ ...mockUser, isVerified: true });
      });

      it('debería devolver mensaje cuando ya está verificada', async () => {
        const result = await service.verifyEmail('valid-token');
        expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
        expect(prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: '1' },
        });
        expect(result).toBe('Tu cuenta ya estaba verificada.');
      });
    });

    describe('Verificación exitosa', () => {
      beforeEach(() => {
        jest.spyOn(jwtService, 'verify').mockReturnValue({ sub: '1' });
        jest
          .spyOn(prismaService.user, 'findUnique')
          .mockResolvedValue({ ...mockUser, isVerified: false });
        jest.spyOn(prismaService.user, 'update').mockResolvedValue({
          ...mockUser,
          isVerified: true,
        });
      });

      it('debería verificar correctamente la cuenta', async () => {
        const result = await service.verifyEmail('valid-token');
        expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
        expect(prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: '1' },
        });
        expect(prismaService.user.update).toHaveBeenCalledWith({
          where: { id: '1' },
          data: { isVerified: true },
        });
        expect(result).toBe('Cuenta verificada correctamente');
      });
    });
  });
});
