import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
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
import { CompanyRegistrationService } from '../companies/company-registration.service.js';
import { CompanyRegistrationMode } from '../companies/entities/company.entity.js';
import { AccessCacheService } from '../access/access-cache.service.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
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
  private readonly logger = new Logger(AuthService.name);
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
    private readonly companyRegistration: CompanyRegistrationService,
    private readonly accessCache: AccessCacheService,
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
    // `sub` is the Keycloak user id, not the employees primary key. The JWT
    // strategy resolves and exposes the internal id as `employeeId`.
    const employee = await this.employeeRepo.findOne({
      where: payload.employeeId
        ? { id: payload.employeeId }
        : [{ keycloakId: payload.sub }, { email: payload.email }],
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
  //
  // D9 (fail-open borné) : le verrouillage anti-brute-force app-level ici
  // n'est jamais l'autorité, seulement une couche additionnelle au-dessus de
  // la protection brute-force native Keycloak (à activer dans le realm) — si
  // Redis est indisponible, le login mot de passe doit continuer de
  // fonctionner (D10), pas planter. Trouvé par un vrai test de panne Redis :
  // les 3 accès Redis ci-dessous plantaient la requête entière (500) avant
  // ce correctif, alors que Keycloak lui-même répondait normalement.
  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const blockedKey = `${LOGIN_BLOCKED_PREFIX}${dto.email}`;
    let isBlocked: string | null = null;
    try {
      isBlocked = await this.redis.get(blockedKey);
    } catch (err: unknown) {
      this.logger.warn(
        `Login lock check failed (fail-open, D9): ${String(err)}`,
      );
    }
    if (isBlocked) {
      let remaining = this.lockDurationSeconds;
      try {
        remaining = await this.redis.ttl(blockedKey);
      } catch {
        // best-effort — le message reste utile même avec un TTL approximatif
      }
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
      try {
        await this.redis.del(`${LOGIN_ATTEMPTS_PREFIX}${dto.email}`);
      } catch (err: unknown) {
        this.logger.warn(
          `Failed-attempts cleanup failed (fail-open, D9): ${String(err)}`,
        );
      }
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

  // D9 (fail-open) : si Redis est indisponible, le décompte de tentatives
  // est simplement perdu pour cette requête — jamais de crash de la réponse
  // "identifiants invalides" que login() renvoie juste après. Keycloak reste
  // le filet de sécurité brute-force pendant la panne.
  private async recordFailedAttempt(email: string): Promise<void> {
    try {
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
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.warn(
        `Failed-attempt tracking failed (fail-open, D9): ${String(err)}`,
      );
    }
  }

  // ── TARHIB-23: Réinitialisation mot de passe ─────────────────────────────
  async requestPasswordReset(dto: PasswordResetRequestDto): Promise<void> {
    const employee = await this.employeeRepo.findOne({
      where: { email: dto.email, active: true },
    });
    // Réponse publique identique, mais aucun email ni jeton pour une adresse
    // inconnue : évite l'énumération et l'utilisation du service comme relais.
    if (!employee?.keycloakId) return;
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

    const employee = await this.employeeRepo.findOne({ where: { email } });
    if (
      employee?.scope === EmployeeScope.TARHIB &&
      dto.newPassword.length < 12
    ) {
      throw new BadRequestException('operationsPasswordTooShort');
    }

    // Single-use: delete before calling Keycloak to prevent race conditions
    await this.redis.del(key);

    await this.keycloak.resetUserPassword(email, dto.newPassword);
    if (employee) {
      employee.mustChangePassword = false;
      await this.employeeRepo.save(employee);
      await this.accessCache.invalidate(employee.keycloakId);
    }
  }

  async changePassword(
    employeeId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, active: true },
    });
    if (!employee?.keycloakId) {
      throw new UnauthorizedException('employeeNotFound');
    }
    const verificationTokens = await this.keycloak.loginWithPassword(
      employee.email,
      dto.currentPassword,
    );
    await this.keycloak.revokeRefreshToken(verificationTokens.refreshToken);
    await this.keycloak.resetUserPassword(employee.email, dto.newPassword);
    employee.mustChangePassword = false;
    await this.employeeRepo.save(employee);
    await this.accessCache.invalidate(employee.keycloakId);
  }

  async requestAdminPasswordReset(
    targetId: string,
    actor: JwtPayload,
  ): Promise<void> {
    const employee = await this.employeeRepo.findOne({
      where: { id: targetId },
    });
    if (!employee?.keycloakId || !employee.active) {
      throw new NotFoundException('employeeNotFound');
    }
    if (
      actor.dataScope !== 'GLOBAL' &&
      (employee.companyId !== actor.companyId ||
        (actor.dataScope === 'BRANCH' && employee.branchId !== actor.branchId))
    ) {
      throw new ForbiddenException('crossTenantAccessDenied');
    }
    employee.mustChangePassword = true;
    await this.employeeRepo.save(employee);
    await this.accessCache.invalidate(employee.keycloakId);
    await this.keycloak.revokeUserSessions(employee.email);
    await this.requestPasswordReset({ email: employee.email });
    await this.auditService.log({
      userId: actor.employeeId ?? actor.sub,
      userEmail: actor.email,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'employees',
      entityId: employee.id,
      metadata: { targetEmail: employee.email },
    });
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
  async register(
    dto: RegisterDto,
  ): Promise<{ status: 'PENDING' | 'ACTIVATION_REQUIRED' }> {
    const { company, option, challengeKey } =
      await this.companyRegistration.validateSelection(
        dto.challenge,
        dto.registrationOptionId,
      );
    await this.companyRegistration.consumePhoneVerification(
      dto.phoneVerificationToken,
      dto.challenge,
      dto.phoneNumber,
    );

    const existing = await this.employeeRepo.findOne({
      where: [{ email: dto.email }, { phoneNumber: dto.phoneNumber }],
    });
    if (existing) throw new BadRequestException('registrationUnavailable');

    const employee = this.employeeRepo.create({
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      firstNameAr: dto.firstNameAr,
      firstNameEn: dto.firstNameEn,
      lastNameAr: dto.lastNameAr,
      lastNameEn: dto.lastNameEn,
      companyId: company.id,
      branchId: option.branchId,
      departmentId: option.departmentId,
      roleId: option.roleId,
      role: 'employee',
      scope: EmployeeScope.CLIENT,
      status:
        company.registrationMode === CompanyRegistrationMode.AUTO_APPROVED
          ? EmployeeStatus.INVITED
          : EmployeeStatus.PENDING,
      active: false,
    });
    await this.employeeRepo.save(employee);
    await this.companyRegistration.consumeChallenge(challengeKey);

    if (company.registrationMode === CompanyRegistrationMode.AUTO_APPROVED) {
      await this.issueActivationCode(employee);
      return { status: 'ACTIVATION_REQUIRED' };
    }
    return { status: 'PENDING' };
  }

  private async issueActivationCode(employee: Employee): Promise<void> {
    const code = generateInviteCode();
    await this.redis.set(
      `${INVITE_PREFIX}${code}`,
      employee.id,
      INVITE_TOKEN_TTL_SECONDS,
    );
    await this.email.sendInviteEmail(employee.email, code);
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
    await this.issueActivationCode(employee);
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
    employee.mustChangePassword = employee.scope === EmployeeScope.TARHIB;
    await this.employeeRepo.save(employee);

    return this.keycloak.loginWithPassword(employee.email, dto.password);
  }

  // ── Inscriptions en attente (admin) ──────────────────────────────────────
  async getPendingRegistrations(companyId?: string): Promise<Employee[]> {
    const where: Record<string, string> = { status: EmployeeStatus.PENDING };
    if (companyId) where['companyId'] = companyId;
    return this.employeeRepo.find({
      where,
      relations: {
        branch: true,
        department: true,
        dynamicRole: true,
      },
    });
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

    employee.status = EmployeeStatus.INVITED;
    employee.active = false;
    await this.employeeRepo.save(employee);
    await this.issueActivationCode(employee);
  }

  async rejectRegistration(id: string): Promise<void> {
    const employee = await this.employeeRepo.findOne({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');
    await this.employeeRepo.remove(employee);
  }

  async updateDeviceToken(employeeId: string, fcmToken: string): Promise<void> {
    await this.employeeRepo.update({ id: employeeId }, { fcmToken });
  }
}
