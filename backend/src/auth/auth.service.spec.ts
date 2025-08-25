// Dependencias de terceros
import { RoleName } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

// Módulos Internos de la Aplicacion
import { EmailService } from 'src/email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis/redis.service';
import { AuthService } from './auth.service';

// Mock de bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// --- CORRECCIÓN 1: Definimos el mock de PrismaService de forma explícita ---
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
  },
};

const mockEmailService = {
  sendVerificationEmail: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: {} },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);

    // Limpiamos todos los mocks antes de cada prueba
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---- PRUEBAS PARA EL REGISTRO DE USUARIO ----
  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'Test',
      lastName: 'User',
      role: RoleName.AUTHOR,
    };

    const mockCreatedUser = { id: 'user-id-123', email: registerDto.email };

    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (jwtService.sign as jest.Mock).mockReturnValue('verification-token');
    });

    it('should register a new user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.register(registerDto);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          password: 'hashedPassword123',
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          isVerified: false,
          role: { connect: { name: registerDto.role } },
        },
      });
      expect(result.userId).toEqual(mockCreatedUser.id);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockCreatedUser);
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException for a non-public role', async () => {
      const registerDtoWithAdminRole = { ...registerDto, role: RoleName.ADMIN };
      await expect(service.register(registerDtoWithAdminRole)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ---- PRUEBAS PARA EL INICIO DE SESIÓN ----
  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'Password123' };
    const baseMockUser = {
      id: 'user-id-123',
      email: 'test@example.com',
      password: 'hashedPassword123',
      role: { name: RoleName.AUTHOR },
    };

    it('should return tokens and user data on successful login', async () => {
      const verifiedUser = { ...baseMockUser, isVerified: true };
      mockPrismaService.user.findUnique.mockResolvedValue(verifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce('fake-access-token')
        .mockReturnValueOnce('fake-refresh-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');

      const result = await service.login(loginDto);

      expect(prismaService.refreshToken.create).toHaveBeenCalled();
      expect(result.accessToken.token).toBe('fake-access-token');
      expect(result.user.role).toBe(RoleName.AUTHOR);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const verifiedUser = { ...baseMockUser, isVerified: true };
      mockPrismaService.user.findUnique.mockResolvedValue(verifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is not verified', async () => {
      const unverifiedUser = { ...baseMockUser, isVerified: false };
      mockPrismaService.user.findUnique.mockResolvedValue(unverifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
