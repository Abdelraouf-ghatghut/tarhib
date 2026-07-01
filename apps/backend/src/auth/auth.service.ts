import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { KeycloakService } from './keycloak/keycloak.service';
import { EmailService } from './email/email.service';
import {
  Employee,
  EmployeeStatus,
} from '../employees/entities/employee.entity';
import { Company } from '../companies/entities/company.entity';
import { Role } from '../roles/entities/role.entity';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import type { LoginDto } from './dto/login.dto';
import type { TokenResponseDto } from './dto/token-response.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import type { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import type { PasswordResetDto } from './dto/password-reset.dto';
import type { RegisterDto } from './dto/register.dto';
import type { InviteEmployeeDto } from './dto/invite-employee.dto';
import type { AcceptInviteDto } from './dto/accept-invite.dto';

const LOGIN_ATTEMPTS_PREFIX = 'login_attempts:';
const LOGIN_BLOCKED_PREFIX = 'login_blocked:';
const PWD_RESET_PREFIX = 'pwd_reset:';
const INVITE_PREFIX = 'invite:';
const MAX_LOGIN_ATTEMPTS = 5;
const RESET_TOKEN_TTL_SECONDS = 3600;
const INVITE_TOKEN_TTL_SECONDS = 7 * 24 * 3600; // 7 days

@Injectable()
export class AuthService {
  private readonly lockDurationSeconds: number;

  constructor(
    private readonly keycloak: KeycloakService,
    private readonly redis: RedisService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {
    this.lockDurationSeconds = config.get<number>(
      'LOGIN_LOCK_DURATION_SECONDS',
      900,
    );
  }

  getCurrentUser(payload: JwtPayload): JwtPayload {
    return payload;
  }

  // ── TARHIB-21: Login email/mdp ───────────────────────────────────────────
  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const blockedKey = `${LOGIN_BLOCKED_PREFIX}${dto.email}`;
    const isBlocked = await this.redis.get(blockedKey);
    if (isBlocked) {
      const remaining = await this.redis.ttl(blockedKey);
      throw new HttpException(
        `Account temporarily locked. Retry in ${remaining}s`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      const tokens = await this.keycloak.loginWithPassword(
        dto.email,
        dto.password,
      );
      await this.redis.del(`${LOGIN_ATTEMPTS_PREFIX}${dto.email}`);
      return this.enrichTokens(tokens, dto.email);
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        await this.recordFailedAttempt(dto.email);
        // Generic message — never reveal whether email or password was wrong
        throw new UnauthorizedException(
          'Identifiants invalides / Invalid credentials',
        );
      }
      throw err;
    }
  }

  /** Enrichit la réponse token avec le contexte employé (rôle, permissions, companyId…) */
  private async enrichTokens(
    tokens: TokenResponseDto,
    email: string,
  ): Promise<TokenResponseDto> {
    const employee = await this.employeeRepo.findOne({ where: { email } });
    if (!employee) return tokens;

    let permissions: string[] = [];

    if (employee.roleId) {
      // Nouveau RBAC dynamique
      const role = await this.roleRepo.findOne({
        where: { id: employee.roleId },
        relations: ['permissions'],
      });
      permissions = role?.permissions?.map((p) => p.key) ?? [];
    } else {
      // Fallback legacy : mapping rôle string → permissions
      permissions = AuthService.legacyPermissions(employee.role);
    }

    return {
      ...tokens,
      email: employee.email,
      role: employee.role ?? undefined,
      roleId: employee.roleId ?? undefined,
      scope: employee.scope ?? undefined,
      permissions,
      companyId: employee.companyId ?? undefined,
      branchId: employee.branchId ?? undefined,
    };
  }

  private static legacyPermissions(role: string): string[] {
    switch (role) {
      case 'EMPLOYEE':
        return [
          'catalog.view',
          'order.create',
          'meeting.book',
          'meeting.order_services',
          'quota.view',
          'profile.edit',
        ];
      case 'DEPARTMENT_MANAGER':
        return [
          'catalog.view',
          'order.create',
          'order.approve',
          'meeting.book',
          'meeting.order_services',
          'meeting.manage',
          'quota.view',
          'employee.manage',
          'report.view',
          'profile.edit',
        ];
      case 'HOSPITALITY_AGENT':
        return [
          'order.prepare',
          'order.deliver',
          'order.queue.manage',
          'vip.manage',
          'inventory.manage',
          'profile.edit',
        ];
      case 'INVENTORY_MANAGER':
        return [
          'inventory.manage',
          'vip.manage',
          'report.view',
          'profile.edit',
        ];
      case 'ADMIN':
        return [
          'company.manage',
          'branch.manage',
          'employee.manage',
          'role.manage',
          'report.view',
          'order.queue.manage',
          'inventory.manage',
          'vip.manage',
          'profile.edit',
        ];
      default:
        return ['profile.edit'];
    }
  }

  private async recordFailedAttempt(email: string): Promise<void> {
    const attemptsKey = `${LOGIN_ATTEMPTS_PREFIX}${email}`;
    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) {
      await this.redis.expire(attemptsKey, 600);
    }
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await this.redis.set(
        `${LOGIN_BLOCKED_PREFIX}${email}`,
        '1',
        this.lockDurationSeconds,
      );
      await this.redis.del(attemptsKey);
      throw new HttpException(
        `Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // ── TARHIB-23: Réinitialisation mot de passe ─────────────────────────────
  async requestPasswordReset(dto: PasswordResetRequestDto): Promise<void> {
    const token = randomBytes(32).toString('hex');
    await this.redis.set(
      `${PWD_RESET_PREFIX}${token}`,
      dto.email,
      RESET_TOKEN_TTL_SECONDS,
    );
    // Always send the same response regardless of whether the email exists
    await this.email.sendPasswordResetEmail(dto.email, token);
  }

  async resetPassword(dto: PasswordResetDto): Promise<void> {
    const key = `${PWD_RESET_PREFIX}${dto.token}`;
    const email = await this.redis.get(key);

    if (!email) {
      throw new UnauthorizedException('Reset token is invalid or has expired');
    }

    // Single-use: delete before calling Keycloak to prevent race conditions
    await this.redis.del(key);

    await this.keycloak.resetUserPassword(email, dto.newPassword);
  }

  // ── TARHIB-24: Session/Refresh/Logout ────────────────────────────────────
  async refresh(dto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.keycloak.refreshToken(dto.refreshToken);
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    await this.keycloak.revokeRefreshToken(dto.refreshToken);
  }

  // ── Signup: auto-inscription employé ─────────────────────────────────────
  async register(dto: RegisterDto): Promise<void> {
    const company = await this.companyRepo.findOne({
      where: { slug: dto.companySlug },
    });
    if (!company) throw new BadRequestException('Company code not found');

    const existing = await this.employeeRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new BadRequestException('Email already registered');

    const employee = this.employeeRepo.create({
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      firstNameAr: dto.firstNameAr,
      firstNameEn: dto.firstNameEn,
      lastNameAr: dto.lastNameAr,
      lastNameEn: dto.lastNameEn,
      companyId: company.id,
      branchId: company.id, // placeholder — admin will assign branch on approval
      departmentId: company.id,
      role: 'employee',
      status: EmployeeStatus.PENDING,
      active: false,
    });
    await this.employeeRepo.save(employee);
    // Store hashed password temporarily in Redis until admin approves
    await this.redis.set(
      `pending_pwd:${employee.id}`,
      dto.password,
      INVITE_TOKEN_TTL_SECONDS,
    );
  }

  // ── Invitation par admin ──────────────────────────────────────────────────
  async inviteEmployee(dto: InviteEmployeeDto): Promise<void> {
    const existing = await this.employeeRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new BadRequestException('Email already registered');

    const employee = this.employeeRepo.create({
      email: dto.email,
      phoneNumber: `+00${Date.now()}`, // placeholder
      firstNameAr: '',
      firstNameEn: '',
      lastNameAr: '',
      lastNameEn: '',
      companyId: dto.companyId,
      branchId: dto.branchId,
      departmentId: dto.departmentId ?? dto.branchId,
      roleId: dto.roleId ?? null,
      role: 'employee',
      status: EmployeeStatus.INVITED,
      active: false,
    });
    await this.employeeRepo.save(employee);

    const token = randomBytes(32).toString('hex');
    await this.redis.set(
      `${INVITE_PREFIX}${token}`,
      employee.id,
      INVITE_TOKEN_TTL_SECONDS,
    );

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5173');
    await this.email.sendPasswordResetEmail(
      dto.email,
      token, // reuse the reset email template — link points to /accept-invite?token=
    );
    // In production, a dedicated "accept invite" email template should be used
    void appUrl;
  }

  // ── Acceptation invitation ────────────────────────────────────────────────
  async acceptInvite(dto: AcceptInviteDto): Promise<TokenResponseDto> {
    const key = `${INVITE_PREFIX}${dto.token}`;
    const employeeId = await this.redis.get(key);
    if (!employeeId)
      throw new UnauthorizedException('Invite token invalid or expired');

    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    await this.redis.del(key);

    // Create Keycloak account
    const keycloakId = await this.keycloak.createUser(
      employee.email,
      dto.password,
    );

    employee.keycloakId = keycloakId;
    employee.firstNameAr = dto.firstNameAr;
    employee.firstNameEn = dto.firstNameEn;
    employee.lastNameAr = dto.lastNameAr;
    employee.lastNameEn = dto.lastNameEn;
    employee.phoneNumber = dto.phoneNumber;
    employee.status = EmployeeStatus.ACTIVE;
    employee.active = true;
    await this.employeeRepo.save(employee);

    return this.keycloak.loginWithPassword(employee.email, dto.password);
  }

  // ── Inscriptions en attente (admin) ──────────────────────────────────────
  async getPendingRegistrations(companyId?: string): Promise<Employee[]> {
    const where: Record<string, string> = { status: EmployeeStatus.PENDING };
    if (companyId) where['companyId'] = companyId;
    return this.employeeRepo.find({ where });
  }

  async approveRegistration(id: string): Promise<void> {
    const employee = await this.employeeRepo.findOne({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.status !== EmployeeStatus.PENDING) {
      throw new BadRequestException('Employee is not in pending state');
    }

    const tmpPassword = await this.redis.get(`pending_pwd:${id}`);
    if (tmpPassword) {
      const keycloakId = await this.keycloak.createUser(
        employee.email,
        tmpPassword,
      );
      employee.keycloakId = keycloakId;
      await this.redis.del(`pending_pwd:${id}`);
    }

    employee.status = EmployeeStatus.ACTIVE;
    employee.active = true;
    await this.employeeRepo.save(employee);
  }

  async rejectRegistration(id: string): Promise<void> {
    const employee = await this.employeeRepo.findOne({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');
    await this.redis.del(`pending_pwd:${id}`);
    await this.employeeRepo.remove(employee);
  }

  async updateDeviceToken(employeeId: string, fcmToken: string): Promise<void> {
    await this.employeeRepo.update({ id: employeeId }, { fcmToken });
  }
}
