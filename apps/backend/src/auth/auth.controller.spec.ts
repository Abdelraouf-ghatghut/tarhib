import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmployeeRole } from '../employees/dto/employee.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const mockPayload: JwtPayload = {
  sub: 'uuid-agent',
  email: 'agent@corp.com',
  role: EmployeeRole.HOSPITALITY_AGENT,
  companyId: 'company-uuid',
  branchId: 'branch-uuid',
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService],
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
    const result = controller.getMe(mockPayload);
    expect(result.sub).toBe('uuid-agent');
    expect(result.role).toBe(EmployeeRole.HOSPITALITY_AGENT);
    expect(result.companyId).toBe('company-uuid');
  });
});
