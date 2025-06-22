import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { Role } from './interfaces/role.enum';
import { TokenInfo } from './interfaces/token-info.interface'; // importa tu interfaz

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
            refreshAccessToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register with the provided dto', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: Role.STUDENT_REGULAR,
      };

      const expectedResult = {
        message: 'Usuario registrado correctamente',
        userId: 'user-id',
      };

      jest.spyOn(authService, 'register').mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('login', () => {
    it('should call authService.login with the provided dto', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResult: {
        accessToken: TokenInfo;
        refreshToken: TokenInfo;
        user: {
          id: string;
          email: string;
          role: Role;
        };
      } = {
        accessToken: {
          token: 'access-token',
          expiresIn: 3600,
          type: 'access',
        },
        refreshToken: {
          token: 'refresh-token',
          expiresIn: 604800,
          type: 'refresh',
        },
        user: {
          id: 'user-id',
          email: 'test@example.com',
          role: Role.STUDENT_REGULAR,
        },
      };

      jest.spyOn(authService, 'login').mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with the token from authorization header', async () => {
      const mockReq = {
        headers: {
          authorization: 'Bearer access-token',
        },
      };

      const expectedResult = {
        message: 'Sesión cerrada correctamente',
      };

      jest.spyOn(authService, 'logout').mockResolvedValue(undefined);

      const result = await controller.logout(mockReq as any);

      expect(authService.logout).toHaveBeenCalledWith('access-token');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshAccessToken with the provided token', async () => {
      const refreshToken = 'refresh-token';

      const expectedResult: {
        accessToken: TokenInfo;
      } = {
        accessToken: {
          token: 'new-access-token',
          expiresIn: 3600,
          type: 'access',
        },
      };

      jest
        .spyOn(authService, 'refreshAccessToken')
        .mockResolvedValue(expectedResult);

      const result = await controller.refreshToken(refreshToken);

      expect(authService.refreshAccessToken).toHaveBeenCalledWith(refreshToken);
      expect(result).toEqual(expectedResult);
    });
  });
});
