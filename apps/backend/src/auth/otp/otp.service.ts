import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Employee,
  EmployeeScope,
  EmployeeStatus,
} from '../../employees/entities/employee.entity';
import { RedisService } from '../../redis/redis.service';
import type { TokenResponseDto } from '../dto/token-response.dto';
import { OtpAppMode, OtpChannel } from '../dto/otp-request.dto';
import { KeycloakService } from '../keycloak/keycloak.service';
import {
  OtpDeliveryService,
  type OtpDeliveryChallenge,
} from '../sms/sms.service';

const OTP_SESSION_PREFIX = 'otp:session:';
const OTP_COOLDOWN_PREFIX = 'otp:cooldown:';
const OTP_HOURLY_PREFIX = 'otp:hour:';

interface OtpSession {
  employeeId: string;
  keycloakId: string;
  appMode: OtpAppMode;
  attempts: number;
  challenge: OtpDeliveryChallenge;
}

@Injectable()
export class OtpService {
  private readonly ttlSeconds: number;
  private readonly resendSeconds: number;
  private readonly maxAttempts: number;
  private readonly maxRequestsPerHour: number;
  private readonly smsEnabled: boolean;
  private readonly whatsappEnabled: boolean;

  constructor(
    private readonly redis: RedisService,
    private readonly delivery: OtpDeliveryService,
    private readonly keycloak: KeycloakService,
    private readonly config: ConfigService,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {
    this.ttlSeconds = this.positiveInt('OTP_TTL_SECONDS', 300);
    this.resendSeconds = this.positiveInt('OTP_RESEND_SECONDS', 60);
    this.maxAttempts = this.positiveInt('OTP_MAX_ATTEMPTS', 3);
    this.maxRequestsPerHour = this.positiveInt('OTP_MAX_REQUESTS_PER_HOUR', 5);
    this.smsEnabled = this.flag('OTP_SMS_ENABLED', true);
    this.whatsappEnabled = this.flag('OTP_WHATSAPP_ENABLED', true);
  }

  async requestOtp(
    phoneNumber: string,
    channel: OtpChannel,
    appMode: OtpAppMode,
  ): Promise<void> {
    this.assertChannelEnabled(channel);
    await this.assertRequestAllowed(phoneNumber);
    // Apply the same cooldown even when the account is unknown or ineligible;
    // otherwise a second request could be used to enumerate registered phones.
    await this.redis.set(
      `${OTP_COOLDOWN_PREFIX}${phoneNumber}`,
      '1',
      this.resendSeconds,
    );

    const employee = await this.employeeRepo.findOne({
      where: { phoneNumber },
    });

    // Keep the public response identical for unknown, inactive and wrong-scope
    // accounts. This prevents phone-number enumeration and avoids paid sends.
    if (!employee || !this.isEligible(employee, appMode)) return;

    const challenge = await this.delivery.send(phoneNumber, channel);

    const session: OtpSession = {
      employeeId: employee.id,
      keycloakId: employee.keycloakId!,
      appMode,
      attempts: 0,
      challenge,
    };
    await this.redis.set(
      `${OTP_SESSION_PREFIX}${phoneNumber}`,
      JSON.stringify(session),
      this.ttlSeconds,
    );
  }

  async verifyOtp(
    phoneNumber: string,
    code: string,
    appMode: OtpAppMode,
  ): Promise<TokenResponseDto> {
    const key = `${OTP_SESSION_PREFIX}${phoneNumber}`;
    const raw = await this.redis.get(key);
    if (!raw) throw new UnauthorizedException('otpExpiredOrNotRequested');

    const session = JSON.parse(raw) as OtpSession;
    if (session.appMode !== appMode || !session.challenge) {
      throw new UnauthorizedException('invalidOtpContext');
    }

    session.attempts += 1;
    const approved = await this.delivery.check(
      phoneNumber,
      code,
      session.challenge,
    );
    if (!approved) {
      if (session.attempts >= this.maxAttempts) {
        await this.redis.del(key);
        throw new BadRequestException('tooManyOtpAttempts');
      }

      const remainingTtl = await this.redis.ttl(key);
      if (remainingTtl <= 0) {
        await this.redis.del(key);
        throw new UnauthorizedException('otpExpiredOrNotRequested');
      }
      await this.redis.set(key, JSON.stringify(session), remainingTtl);
      throw new UnauthorizedException('invalidOtpCode');
    }

    const employee = await this.employeeRepo.findOne({
      where: { id: session.employeeId },
    });
    if (!employee || !this.isEligible(employee, appMode)) {
      await this.redis.del(key);
      throw new UnauthorizedException('otpAccountUnavailable');
    }

    await this.redis.del(key);
    return this.keycloak.loginWithPhoneOtp(employee.keycloakId!);
  }

  private isEligible(employee: Employee, appMode: OtpAppMode): boolean {
    const expectedScope =
      appMode === OtpAppMode.EMPLOYEE
        ? EmployeeScope.CLIENT
        : EmployeeScope.TARHIB;
    return (
      employee.active &&
      employee.status === EmployeeStatus.ACTIVE &&
      !!employee.keycloakId &&
      employee.scope === expectedScope
    );
  }

  private async assertRequestAllowed(phoneNumber: string): Promise<void> {
    if (await this.redis.get(`${OTP_COOLDOWN_PREFIX}${phoneNumber}`)) {
      throw new HttpException('otpResendTooSoon', HttpStatus.TOO_MANY_REQUESTS);
    }

    const hourlyKey = `${OTP_HOURLY_PREFIX}${phoneNumber}`;
    const count = await this.redis.incr(hourlyKey);
    if (count === 1) await this.redis.expire(hourlyKey, 3600);
    if (count > this.maxRequestsPerHour) {
      throw new HttpException('otpRateLimited', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private assertChannelEnabled(channel: OtpChannel): void {
    if (
      (channel === OtpChannel.SMS && !this.smsEnabled) ||
      (channel === OtpChannel.WHATSAPP && !this.whatsappEnabled)
    ) {
      throw new BadRequestException('otpChannelUnavailable');
    }
  }

  private positiveInt(key: string, fallback: number): number {
    const value = Number(this.config.get<string>(key, String(fallback)));
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private flag(key: string, fallback: boolean): boolean {
    return this.config.get<string>(key, String(fallback)) === 'true';
  }
}
