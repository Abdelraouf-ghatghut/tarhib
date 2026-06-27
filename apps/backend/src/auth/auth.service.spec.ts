import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { EmployeeRole } from '../employees/dto/employee.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const COMPANY_ID = 'd290f1ee-0000-0000-0000-000000000001';
const BRANCH_ID = 'd290f1ee-0000-0000-0000-000000000002';

const basePayload = (role: EmployeeRole): JwtPayload => ({
  sub: 'keycloak-uuid-123',
  email: 'user@test.com',
  role,
  companyId: COMPANY_ID,
  branchId: BRANCH_ID,
});

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the payload unchanged', () => {
    const payload = basePayload(EmployeeRole.EMPLOYEE);
    expect(service.getCurrentUser(payload)).toBe(payload);
  });

  it('preserves all JWT fields for ADMIN role', () => {
    const payload = basePayload(EmployeeRole.ADMIN);
    const result = service.getCurrentUser(payload);
    expect(result.role).toBe(EmployeeRole.ADMIN);
    expect(result.companyId).toBe(COMPANY_ID);
    expect(result.branchId).toBe(BRANCH_ID);
  });

  it('preserves all JWT fields for HOSPITALITY_AGENT role', () => {
    const payload = basePayload(EmployeeRole.HOSPITALITY_AGENT);
    const result = service.getCurrentUser(payload);
    expect(result.role).toBe(EmployeeRole.HOSPITALITY_AGENT);
  });
});
