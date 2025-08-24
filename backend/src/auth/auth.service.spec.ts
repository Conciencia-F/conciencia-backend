// Dependencias de terceros
import { RoleName } from '@prisma/client';
import { BadRequestException, ConflictException } from '@nestjs/common';
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

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let emailService: EmailService;

  // Creamos un mock de usuario completo ---
  // Este objeto simula un registro de usuario real de la base de datos,
  // cumpliendo con todos los campos que TypeScript espera.
  const mockUser = {
    id: 'user-id-123',
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'Test',
    lastName: 'User',
    roleId: 'role-author-id',
    isVerified: false,
    deletedAt: null,
    verificationToken: null,
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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
            },
            role: {},
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
        },
        {
          provide: EmailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    emailService = module.get(EmailService);

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
      role: RoleName.AUTHOR, // Usamos un rol válido
    };

    beforeEach(() => {
      // Mock para el hasheo de la contraseña
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      // Mock para la creación del token de verificación
      (jwtService.sign as jest.Mock).mockReturnValue('verification-token');
    });

    it('should register a new user successfully', async () => {
      // Configuración del mock: El usuario no existe
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      // Configuración del mock: La creación del usuario es exitosa y devuelve nuestro mock completo
      jest.spyOn(prismaService.user, 'create').mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      // Verificación 1: Se buscó si el usuario existía
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });

      // Verificación 2: La contraseña se hasheó
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);

      // Verificación 3: Se intentó crear el usuario con la estructura correcta
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          password: 'hashedPassword123',
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          isVerified: false,
          role: {
            connect: { name: registerDto.role }, // <-- Se verifica la nueva estructura
          },
        },
      });

      // Verificación 4: Se generó el token de verificación
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id },
        { expiresIn: '15m' },
      );

      // Verificación 5: Se llamó al servicio de envío de correo
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        registerDto.email,
        'verification-token',
      );

      // Verificación 6: La respuesta es la esperada
      expect(result).toEqual({
        message:
          'Usuario registrado correctamente. Se envió un correo de activación.',
        userId: mockUser.id,
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      // Configuración del mock: El usuario SÍ existe, usamos el mock completo
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);

      // Verificamos que la función lance el error esperado
      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('El correo se encuentra en uso.'),
      );
    });

    it('should throw BadRequestException for a non-public role', async () => {
      const registerDtoWithAdminRole = {
        ...registerDto,
        role: RoleName.ADMIN, // Intentamos registrarnos con un rol prohibido
      };

      // Verificamos que la función lance el error esperado
      await expect(service.register(registerDtoWithAdminRole)).rejects.toThrow(
        new BadRequestException('El rol seleccionado no es válido'),
      );
    });
  });
});
