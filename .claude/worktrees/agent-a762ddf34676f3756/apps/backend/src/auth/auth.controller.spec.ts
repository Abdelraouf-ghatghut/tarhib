import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmployeeRole } from '../employees/dto/employee.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import type { TokenResponseDto } from './dto/token-response.dto';

const MOCK_PAYLOAD: JwtPayload = {
  sub: 'uuid-agent',
  email: 'agent@corp.com',
  role: EmployeeRole.HOSPITALITY_AGENT,
  companyId: 'company-uuid',
  branchId: 'branch-uuid',
};

const TOKEN: TokenResponseDto = {
  accessToken: 'at',
  refreshToken: 'rt',
  expiresIn: 900,
};

const mockAuthService: Partial<AuthService> = {
  getCurrentUser: jest.fn((p: JwtPayload) => p),
  login: jest.fn().mockResolvedValue(TOKEN),
  refresh: jest.fn().mockResolvedValue(TOKEN),
  logout: jest.fn().mockResolvedValue(undefined),
  requestPasswordReset: jest.fn().mockResolvedValue(undefined),
  resetPassword: jest.fn().mockResolvedValue(undefined),
};

const mockOtpService: Partial<OtpService> = {
  requestOtp: jest.fn().mockResolvedValue(undefined),
  verifyOtp: jest.fn().mockResolvedValue(TOKEN),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: OtpService, useValue: mockOtpService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMe returns the user from the JWT payload', () => {
    const result = controller.getMe(MOCK_PAYLOAD);
    expect(result.sub).toBe('uuid-agent');
    expect(result.role).toBe(EmployeeRole.HOSPITALITY_AGENT);
    expect(result.companyId).toBe('company-uuid');
  });

  it('login delegates to AuthService', async () => {
    const result = await controller.login({
      email: 'u@t.com',
      password: 'Pass1234!',
    });
    expect(result.accessToken).toBe('at');
    expect(mockAuthService.login).toHaveBeenCalled();
  });

  it('requestOtp delegates to OtpService', async () => {
    await controller.requestOtp({ phoneNumber: '+213555000000' });
    expect(mockOtpService.requestOtp).toHaveBeenCalledWith('+213555000000');
  });

  it('refresh delegates to AuthService', async () => {
    const result = await controller.refresh({ refreshToken: 'rt' });
    expect(result.accessToken).toBe('at');
  });

  it('logout delegates to AuthService', async () => {
    await controller.logout({ refreshToken: 'rt' });
    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});
