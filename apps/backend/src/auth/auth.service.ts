import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { KeycloakService } from './keycloak/keycloak.service';
import { EmailService } from './email/email.service';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import type { LoginDto } from './dto/login.dto';
import type { TokenResponseDto } from './dto/token-response.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import type { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import type { PasswordResetDto } from './dto/password-reset.dto';

const LOGIN_ATTEMPTS_PREFIX = 'login_attempts:';
const LOGIN_BLOCKED_PREFIX = 'login_blocked:';
const PWD_RESET_PREFIX = 'pwd_reset:';
const MAX_LOGIN_ATTEMPTS = 5;
const RESET_TOKEN_TTL_SECONDS = 3600; // 1 hour

@Injectable()
export class AuthService {
  private readonly lockDurationSeconds: number;

  constructor(
    private readonly keycloak: KeycloakService,
    private readonly redis: RedisService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
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
      return tokens;
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
}
