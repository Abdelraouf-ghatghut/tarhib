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
import { INestApplication, Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { type SuperTest, type Test as SuperTestRequest } from 'supertest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { EmployeeRole } from '../employees/dto/employee.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthModule } from './auth.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

const TEST_SECRET = 'integration-test-secret';
const COMPANY_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const BRANCH_ID = 'bbbbbbbb-0000-0000-0000-000000000002';

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
  let agent: SuperTest<SuperTestRequest>;

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
    }).compile();

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
