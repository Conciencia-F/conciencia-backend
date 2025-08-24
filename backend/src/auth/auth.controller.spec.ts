// Dependencias de terceros
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { RoleName } from '@prisma/client';

// Modulos Internos de la Aplicacion
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis/redis.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';

// Mock de AuthService. No necesitamos la implementación real, solo sus funciones.
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  refreshAccessToken: jest.fn(),
};

// --- 2. Creamos mocks para las otras dependencias ---
const mockEmailService = {
  sendVerificationEmail: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        // --- 3. Añadimos los mocks al módulo de prueba ---
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        // Proveemos mocks vacíos para las otras dependencias del AuthService
        // aunque no las usemos directamente en el test del controlador.
        { provide: JwtService, useValue: {} },
        { provide: RedisService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ---- PRUEBA PARA EL ENDPOINT DE REGISTRO ----
  describe('register', () => {
    it('should call authService.register with the correct data and return the result', async () => {
      // 1. Preparamos los datos de entrada (el DTO)
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
        role: RoleName.AUTHOR, // Usamos el nuevo enum RoleName
      };

      // 2. Preparamos la respuesta que esperamos del servicio
      const expectedResult = {
        message:
          'Usuario registrado correctamente. Se envió un correo de activación.',
        userId: 'user-id-123',
      };

      // 3. Configuramos el mock: Cuando se llame a authService.register, debe devolver nuestro resultado esperado.
      jest.spyOn(authService, 'register').mockResolvedValue(expectedResult);

      // 4. Ejecutamos la función del controlador que queremos probar
      const result = await controller.register(registerDto);

      // 5. Verificamos que todo ocurrió como esperábamos
      // Verificación A: ¿Se llamó al servicio con los datos correctos?
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      // Verificación B: ¿El controlador devolvió el resultado que le dio el servicio?
      expect(result).toEqual(expectedResult);
    });
  });
});
