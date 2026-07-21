/**
 * Integration tests for the Auth guards.
 *
 * Uses a real NestJS application with a predictable JWT_SECRET so we can
 * sign our own tokens and exercise the full request→guard→controller path
 * without a live Keycloak instance.
 *
 * Tests cover:
 *   1. 401 when the Authorization header is absent
 *   2. 401 when the token is signed with the wrong secret
 *   3. 200 with a valid token on a public-but-guarded route (GET /auth/me)
 *   4. 403 when the authenticated user lacks the required role
 */
import {
  INestApplication,
  Injectable,
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ExtractJwt, Strategy } from 'passport-jwt';
import supertest, { type Agent } from 'supertest';
import jwt from 'jsonwebtoken';
import { EmployeeRole } from '../employees/dto/employee.dto';
import { Employee } from '../employees/entities/employee.entity';
import { Company } from '../companies/entities/company.entity';
import { Role } from '../roles/entities/role.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Department } from '../departments/entities/department.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

const TEST_SECRET = 'integration-test-secret';
const COMPANY_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const BRANCH_ID = 'bbbbbbbb-0000-0000-0000-000000000002';

/**
 * Remplace la stratégie de prod (JWKS Keycloak + enrichissement DB) par une
 * vérification HS256 locale : on teste ici le câblage requête→guard→contrôleur,
 * pas Keycloak.
 */
@Injectable()
class TestJwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: TEST_SECRET,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}

const repoStub = { findOne: jest.fn().mockResolvedValue(null) };

function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, TEST_SECRET, { expiresIn: '5m' });
}

function makePayload(role: EmployeeRole): Omit<JwtPayload, 'iat' | 'exp'> {
  return {
    sub: 'test-sub',
    email: 'test@example.com',
    role,
    companyId: COMPANY_ID,
    branchId: BRANCH_ID,
    permissions: [],
  };
}

/** Minimal controller added only for integration testing */
@Controller('test-auth')
class TestAuthController {
  @Get('guarded')
  @UseGuards(JwtAuthGuard)
  guardedRoute(@CurrentUser() user: JwtPayload): JwtPayload {
    return user;
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.ADMIN)
  adminOnly(): { ok: boolean } {
    return { ok: true };
  }
}

describe('Auth guards (integration)', () => {
  let app: INestApplication;
  let agent: Agent;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ JWT_SECRET: TEST_SECRET })],
        }),
        AuthModule,
      ],
      controllers: [TestAuthController],
    })
      // Mock service-layer deps so tests run without Redis/Keycloak/Twilio/DB
      .overrideProvider(AuthService)
      .useValue({ getCurrentUser: (p: JwtPayload) => p })
      .overrideProvider(OtpService)
      .useValue({})
      .overrideProvider(JwtStrategy)
      .useClass(TestJwtStrategy)
      .overrideProvider(getRepositoryToken(Employee))
      .useValue(repoStub)
      .overrideProvider(getRepositoryToken(Company))
      .useValue(repoStub)
      .overrideProvider(getRepositoryToken(Role))
      .useValue(repoStub)
      .overrideProvider(getRepositoryToken(Branch))
      .useValue(repoStub)
      .overrideProvider(getRepositoryToken(Department))
      .useValue(repoStub)
      .overrideProvider(getRepositoryToken(AuditLog))
      .useValue(repoStub)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    agent = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /auth/me', () => {
    it('returns 401 when Authorization header is absent', () => {
      return agent.get('/auth/me').expect(401);
    });

    it('returns 401 when the token is signed with the wrong secret', () => {
      const badToken = jwt.sign(
        makePayload(EmployeeRole.EMPLOYEE),
        'wrong-secret',
      );
      return agent
        .get('/auth/me')
        .set('Authorization', `Bearer ${badToken}`)
        .expect(401);
    });

    it('returns 200 and the user payload when the token is valid', () => {
      const token = signToken(makePayload(EmployeeRole.EMPLOYEE));
      return agent
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as JwtPayload;
          expect(body.sub).toBe('test-sub');
          expect(body.role).toBe(EmployeeRole.EMPLOYEE);
          expect(body.companyId).toBe(COMPANY_ID);
          expect(body.branchId).toBe(BRANCH_ID);
        });
    });
  });

  describe('GET /test-auth/guarded', () => {
    it('returns 401 without token', () => {
      return agent.get('/test-auth/guarded').expect(401);
    });

    it('returns 200 with a valid HOSPITALITY_AGENT token', () => {
      const token = signToken(makePayload(EmployeeRole.HOSPITALITY_AGENT));
      return agent
        .get('/test-auth/guarded')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as JwtPayload;
          expect(body.role).toBe(EmployeeRole.HOSPITALITY_AGENT);
        });
    });
  });

  describe('GET /test-auth/admin-only (RolesGuard)', () => {
    it('returns 403 when user is EMPLOYEE (not ADMIN)', () => {
      const token = signToken(makePayload(EmployeeRole.EMPLOYEE));
      return agent
        .get('/test-auth/admin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('returns 200 when user is ADMIN', () => {
      const token = signToken(makePayload(EmployeeRole.ADMIN));
      return agent
        .get('/test-auth/admin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as { ok: boolean };
          expect(body.ok).toBe(true);
        });
    });

    it('returns 403 when user is DEPARTMENT_MANAGER (not ADMIN)', () => {
      const token = signToken(makePayload(EmployeeRole.DEPARTMENT_MANAGER));
      return agent
        .get('/test-auth/admin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});
