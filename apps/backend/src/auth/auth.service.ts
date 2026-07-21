import {
  BadRequestException,
  ForbiddenException,
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
  EmployeeScope,
  EmployeeStatus,
} from '../employees/entities/employee.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Department } from '../departments/entities/department.entity';
import { Role, RoleScope } from '../roles/entities/role.entity';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import type { LoginDto } from './dto/login.dto';
import type { TokenResponseDto } from './dto/token-response.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import type { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import type { PasswordResetDto } from './dto/password-reset.dto';
import type { RegisterDto } from './dto/register.dto';
import type { InviteEmployeeDto } from './dto/invite-employee.dto';
import type { AcceptInviteDto } from './dto/accept-invite.dto';
import type { ApproveRegistrationDto } from './dto/approve-registration.dto';
import { AccessPolicyService } from '../access/access-policy.service';
import type { AccessProfile } from '../access/access-policy.service';
import { AuditService } from '../audit/audit.service';
import {
  IMPERSONATE_ROLE_KEY_PREFIX,
  IMPERSONATION_TTL_SECONDS,
} from './impersonation.constants';

const LOGIN_ATTEMPTS_PREFIX = 'login_attempts:';
const LOGIN_BLOCKED_PREFIX = 'login_blocked:';
const PWD_RESET_PREFIX = 'pwd_reset:';
const INVITE_PREFIX = 'invite:';
const MAX_LOGIN_ATTEMPTS = 5;
const RESET_TOKEN_TTL_SECONDS = 3600;
const INVITE_TOKEN_TTL_SECONDS = 7 * 24 * 3600; // 7 days

// Sans 0/O/1/I/L (ambiguïté visuelle) — saisi manuellement dans l'app, pas
// cliqué depuis un lien. 32 symboles divise 256 exactement : `byte % 32` est
// uniforme, pas de biais modulo.
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateInviteCode(length = 8): string {
  return Array.from(
    randomBytes(length),
    (b) => INVITE_CODE_ALPHABET[b % INVITE_CODE_ALPHABET.length],
  ).join('');
}

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
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly accessPolicy: AccessPolicyService,
    private readonly auditService: AuditService,
  ) {
    this.lockDurationSeconds = config.get<number>(
      'LOGIN_LOCK_DURATION_SECONDS',
      900,
    );
  }

  async getCurrentUser(payload: JwtPayload): Promise<
    JwtPayload & {
      firstNameAr?: string;
      firstNameEn?: string;
      lastNameAr?: string;
      lastNameEn?: string;
      departmentId?: string | null;
    }
  > {
    // Le JWT ne porte que les claims d'autorisation — le nom affiché dans le
    // profil vient de la fiche employé.
    const employee = await this.employeeRepo.findOne({
      where: { id: payload.sub },
    });
    if (!employee) return payload;
    return {
      ...payload,
      firstNameAr: employee.firstNameAr,
      firstNameEn: employee.firstNameEn,
      lastNameAr: employee.lastNameAr,
      lastNameEn: employee.lastNameEn,
      departmentId: employee.departmentId,
    };
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
    const employee = await this.employeeRepo.findOne({
      where: { email },
      relations: ['additionalRoles'],
    });
    if (!employee) return tokens;

    const access = await this.accessPolicy.resolve(employee);
    const primary = access.roles.find((r) => r.primary) ?? access.roles[0];

    return {
      ...tokens,
      email: employee.email,
      role: primary?.nameEn ?? primary?.nameAr ?? employee.role ?? undefined,
      roleId: employee.roleId ?? undefined,
      roleIds: access.roles.map((r) => r.id),
      scope: employee.scope ?? undefined,
      permissions: access.permissions,
      capabilities: access.capabilities,
      modules: access.modules.map((m) => m.key),
      dataScope: access.dataScope,
      companyId: employee.companyId ?? undefined,
      branchId: employee.branchId ?? undefined,
    };
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
      throw new UnauthorizedException('resetTokenInvalidOrExpired');
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

  // ── Impersonation : tester rôles/permissions sans changer de compte ─────
  //
  // Deux modes, cf. plan TARHIB — impersonation :
  // - "employé" (startEmployeeImpersonation) : identité réelle, jeton Keycloak
  //   échangé (token-exchange). Utilisé pour reproduire exactement ce qu'une
  //   personne précise voit. Réservé au personnel interne (scope TARHIB) :
  //   le web admin est un outil interne, un employé CLIENT ne doit jamais
  //   pouvoir s'y connecter, même via impersonation (cf. AuthContext.login()
  //   côté web-admin, qui rejette déjà tout scope !== "TARHIB"). Prévisualiser
  //   un rôle client se fait exclusivement via le mode "rôle" ci-dessous.
  // - "rôle" (startRoleImpersonation) : aucune identité changée, seul le
  //   résultat de AccessPolicyService.resolve() est substitué à chaque
  //   requête via un indicateur Redis lu par JwtStrategy. Utilisé pour tester
  //   un rôle sans employé précis.
  // Dans les deux cas : jamais de rôle/compte contenant `company.manage`
  // (garde anti-escalade), et une entrée d'audit dédiée (jamais loguée
  // automatiquement par l'intercepteur générique sous "POST:AUTH", ce qui
  // serait indiscernable d'un login normal).

  async startEmployeeImpersonation(
    actor: JwtPayload,
    targetEmployeeId: string,
    ipAddress?: string,
  ): Promise<TokenResponseDto> {
    if (targetEmployeeId === actor.employeeId) {
      throw new BadRequestException('cannotImpersonateSelf');
    }
    const target = await this.employeeRepo.findOne({
      where: { id: targetEmployeeId },
    });
    if (!target) throw new NotFoundException('employeeNotFound');
    if (!target.active || !target.keycloakId) {
      throw new BadRequestException('employeeNotImpersonable');
    }
    if (target.scope === EmployeeScope.CLIENT) {
      throw new ForbiddenException('cannotImpersonateClientEmployee');
    }

    const tokens = await this.keycloak.impersonate(target.keycloakId);
    const enriched = await this.enrichTokens(tokens, target.email);

    if (enriched.permissions?.includes('company.manage')) {
      await this.keycloak.revokeRefreshToken(tokens.refreshToken);
      throw new ForbiddenException('cannotImpersonateSuperadmin');
    }

    await this.auditService.log({
      userId: actor.sub,
      userEmail: actor.email,
      action: 'IMPERSONATE_EMPLOYEE_START',
      entity: 'employee',
      entityId: targetEmployeeId,
      metadata: { targetEmail: target.email },
      ipAddress,
    });

    return enriched;
  }

  async logImpersonationStop(
    actor: JwtPayload,
    action: 'IMPERSONATE_EMPLOYEE_STOP',
    ipAddress?: string,
  ): Promise<void> {
    await this.auditService.log({
      userId: actor.sub,
      userEmail: actor.email,
      action,
      entity: 'employee',
      ipAddress,
    });
  }

  async startRoleImpersonation(
    actor: JwtPayload,
    targetRoleId: string,
    ipAddress?: string,
  ): Promise<AccessProfile> {
    if (!actor.employeeId) throw new UnauthorizedException();
    const employee = await this.employeeRepo.findOne({
      where: { id: actor.employeeId },
    });
    if (!employee) throw new UnauthorizedException();

    const access = await this.accessPolicy.resolveAsRole(
      employee,
      targetRoleId,
    );
    if (access.permissions.includes('company.manage')) {
      throw new ForbiddenException('cannotImpersonateSuperadminRole');
    }

    await this.redis.set(
      `${IMPERSONATE_ROLE_KEY_PREFIX}${employee.id}`,
      targetRoleId,
      IMPERSONATION_TTL_SECONDS,
    );
    await this.auditService.log({
      userId: actor.sub,
      userEmail: actor.email,
      action: 'IMPERSONATE_ROLE_START',
      entity: 'role',
      entityId: targetRoleId,
      ipAddress,
    });

    return access;
  }

  async stopRoleImpersonation(
    actor: JwtPayload,
    ipAddress?: string,
  ): Promise<AccessProfile | null> {
    if (!actor.employeeId) throw new UnauthorizedException();
    await this.redis.del(`${IMPERSONATE_ROLE_KEY_PREFIX}${actor.employeeId}`);
    await this.auditService.log({
      userId: actor.sub,
      userEmail: actor.email,
      action: 'IMPERSONATE_ROLE_STOP',
      entity: 'role',
      ipAddress,
    });
    const employee = await this.employeeRepo.findOne({
      where: { id: actor.employeeId },
      relations: ['additionalRoles'],
    });
    return employee ? this.accessPolicy.resolve(employee) : null;
  }

  // ── Signup: auto-inscription employé ─────────────────────────────────────
  async register(dto: RegisterDto): Promise<void> {
    const company = await this.companyRepo.findOne({
      where: { slug: dto.companySlug },
    });
    if (!company) throw new BadRequestException('companyCodeNotFound');

    const existing = await this.employeeRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new BadRequestException('emailAlreadyRegistered');

    const employee = this.employeeRepo.create({
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      firstNameAr: dto.firstNameAr,
      firstNameEn: dto.firstNameEn,
      lastNameAr: dto.lastNameAr,
      lastNameEn: dto.lastNameEn,
      companyId: company.id,
      branchId: null, // admin assigne la branche (et le département) à l'approbation
      departmentId: null,
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
    if (existing) throw new BadRequestException('emailAlreadyRegistered');

    // Filtrage backend (CLAUDE.md §4) : la branche et le rôle assignés
    // doivent appartenir à la société choisie dans le formulaire admin.
    const [branch, role] = await Promise.all([
      this.branchRepo.findOne({
        where: { id: dto.branchId, companyId: dto.companyId },
      }),
      this.roleRepo.findOne({ where: { id: dto.roleId } }),
    ]);
    if (!branch) throw new BadRequestException('branchNotFoundForCompany');
    if (!role || (role.companyId && role.companyId !== dto.companyId)) {
      throw new BadRequestException('roleNotFoundForCompany');
    }

    // Le scope (CLIENT/TARHIB) de l'employé suit celui du rôle assigné —
    // source unique de vérité, jamais un champ séparé fourni par le formulaire.
    let departmentId: string | null = null;
    if (role.scope === RoleScope.CLIENT) {
      if (!dto.departmentId) {
        throw new BadRequestException('departmentRequiredForClientRole');
      }
      const department = await this.departmentRepo.findOne({
        where: {
          id: dto.departmentId,
          branchId: dto.branchId,
          companyId: dto.companyId,
        },
      });
      if (!department) {
        throw new BadRequestException('departmentNotFoundForBranch');
      }
      departmentId = department.id;
    }

    const employee = this.employeeRepo.create({
      email: dto.email,
      phoneNumber: `+00${Date.now()}`, // placeholder
      firstNameAr: '',
      firstNameEn: '',
      lastNameAr: '',
      lastNameEn: '',
      companyId: dto.companyId,
      branchId: dto.branchId,
      departmentId,
      roleId: role.id,
      role: 'employee',
      scope:
        role.scope === RoleScope.CLIENT
          ? EmployeeScope.CLIENT
          : EmployeeScope.TARHIB,
      status: EmployeeStatus.INVITED,
      active: false,
    });
    await this.employeeRepo.save(employee);

    // Code court (saisie manuelle dans l'app mobile, pas de lien web — cf.
    // sendInviteEmail) plutôt que le token hexadécimal long de resetPassword.
    const code = generateInviteCode();
    await this.redis.set(
      `${INVITE_PREFIX}${code}`,
      employee.id,
      INVITE_TOKEN_TTL_SECONDS,
    );
    await this.email.sendInviteEmail(dto.email, code);
  }

  // ── Acceptation invitation ────────────────────────────────────────────────
  async acceptInvite(dto: AcceptInviteDto): Promise<TokenResponseDto> {
    // Code saisi manuellement (cf. generateInviteCode) : tolérant à la casse
    // et aux espaces (copier-coller depuis l'email).
    const key = `${INVITE_PREFIX}${dto.token.trim().toUpperCase()}`;
    const employeeId = await this.redis.get(key);
    if (!employeeId)
      throw new UnauthorizedException('inviteTokenInvalidOrExpired');

    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    await this.redis.del(key);

    // Create Keycloak account
    const keycloakId = await this.keycloak.createUser(
      employee.email,
      dto.password,
      dto.firstNameEn,
      dto.lastNameEn,
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

  async approveRegistration(
    id: string,
    dto: ApproveRegistrationDto,
  ): Promise<void> {
    const employee = await this.employeeRepo.findOne({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.status !== EmployeeStatus.PENDING) {
      throw new BadRequestException('employeeNotPending');
    }

    // Filtrage backend, jamais seulement le formulaire admin (CLAUDE.md §4) :
    // la branche/le département/le rôle assignés doivent appartenir à la
    // société de l'employé qui s'est auto-inscrit.
    const [branch, department, role] = await Promise.all([
      this.branchRepo.findOne({
        where: { id: dto.branchId, companyId: employee.companyId ?? undefined },
      }),
      this.departmentRepo.findOne({
        where: {
          id: dto.departmentId,
          branchId: dto.branchId,
          companyId: employee.companyId ?? undefined,
        },
      }),
      this.roleRepo.findOne({ where: { id: dto.roleId } }),
    ]);
    if (!branch) throw new BadRequestException('branchNotFoundForCompany');
    if (!department)
      throw new BadRequestException('departmentNotFoundForBranch');
    if (
      !role ||
      role.scope !== RoleScope.CLIENT ||
      (role.companyId && role.companyId !== employee.companyId)
    ) {
      throw new BadRequestException('roleNotFoundForCompany');
    }

    employee.branchId = dto.branchId;
    employee.departmentId = dto.departmentId;
    employee.roleId = dto.roleId;

    const tmpPassword = await this.redis.get(`pending_pwd:${id}`);
    if (tmpPassword) {
      const keycloakId = await this.keycloak.createUser(
        employee.email,
        tmpPassword,
        employee.firstNameEn,
        employee.lastNameEn,
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
