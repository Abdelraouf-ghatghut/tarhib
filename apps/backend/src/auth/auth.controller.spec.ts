/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
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
  permissions: [],
};

const TOKEN: TokenResponseDto = {
  accessToken: 'at',
  refreshToken: 'rt',
  expiresIn: 900,
};

const mockAuthService: Partial<AuthService> = {
  getCurrentUser: jest.fn((p: JwtPayload) => Promise.resolve(p)),
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

function mockRes(): Response {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;
}

function mockReq(cookies: Record<string, string> = {}): Request {
  return { cookies } as unknown as Request;
}

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

  it('getMe returns the user from the JWT payload', async () => {
    const result = await controller.getMe(MOCK_PAYLOAD);
    expect(result.sub).toBe('uuid-agent');
    expect(result.role).toBe(EmployeeRole.HOSPITALITY_AGENT);
    expect(result.companyId).toBe('company-uuid');
  });

  it('login delegates to AuthService and sets the refresh cookie', async () => {
    const res = mockRes();
    const result = await controller.login(
      { email: 'u@t.com', password: 'Pass1234!' },
      res,
    );
    expect(result.accessToken).toBe('at');
    expect(mockAuthService.login).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledWith(
      'tarhib_rt',
      'rt',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
    );
  });

  it('requestOtp delegates to OtpService', async () => {
    await controller.requestOtp({ phoneNumber: '+213555000000' });
    expect(mockOtpService.requestOtp).toHaveBeenCalledWith('+213555000000');
  });

  it('refresh accepts the token from the body (mobile) and rotates the cookie', async () => {
    const res = mockRes();
    const result = await controller.refresh(mockReq(), res, {
      refreshToken: 'rt',
    });
    expect(result.accessToken).toBe('at');
    expect(mockAuthService.refresh).toHaveBeenCalledWith({
      refreshToken: 'rt',
    });
    expect(res.cookie).toHaveBeenCalled();
  });

  it('refresh reads the token from the HttpOnly cookie (web)', async () => {
    const result = await controller.refresh(
      mockReq({ tarhib_rt: 'cookie-rt' }),
      mockRes(),
    );
    expect(result.accessToken).toBe('at');
    expect(mockAuthService.refresh).toHaveBeenCalledWith({
      refreshToken: 'cookie-rt',
    });
  });

  it('refresh rejects when no token is provided', async () => {
    await expect(controller.refresh(mockReq(), mockRes())).rejects.toThrow(
      'missingRefreshToken',
    );
  });

  it('logout revokes the token and clears the cookie', async () => {
    const res = mockRes();
    await controller.logout(mockReq(), res, { refreshToken: 'rt' });
    expect(mockAuthService.logout).toHaveBeenCalledWith({
      refreshToken: 'rt',
    });
    expect(res.clearCookie).toHaveBeenCalledWith('tarhib_rt', {
      path: '/auth',
    });
  });
});
