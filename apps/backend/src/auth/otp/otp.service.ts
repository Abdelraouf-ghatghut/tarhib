import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { KeycloakService } from '../keycloak/keycloak.service';
import { RedisService } from '../../redis/redis.service';
import { SmsService } from '../sms/sms.service';
import type { TokenResponseDto } from '../dto/token-response.dto';

const OTP_TTL_SECONDS = 300; // 5 minutes
const MAX_OTP_ATTEMPTS = 3;
const OTP_KEY_PREFIX = 'otp:';

interface OtpRecord {
  code: string;
  attempts: number;
}

@Injectable()
export class OtpService {
  constructor(
    private readonly redis: RedisService,
    private readonly sms: SmsService,
    private readonly keycloak: KeycloakService,
  ) {}

  async requestOtp(phoneNumber: string): Promise<void> {
    const code = this.generateCode();
    const record: OtpRecord = { code, attempts: 0 };

    // Overrides any existing OTP for this number (one active at a time)
    await this.redis.set(
      `${OTP_KEY_PREFIX}${phoneNumber}`,
      JSON.stringify(record),
      OTP_TTL_SECONDS,
    );

    await this.sms.send(
      phoneNumber,
      `Tarhib — Your verification code is: ${code}. Valid for 5 minutes.`,
    );
  }

  async verifyOtp(
    phoneNumber: string,
    code: string,
  ): Promise<TokenResponseDto> {
    const key = `${OTP_KEY_PREFIX}${phoneNumber}`;
    const raw = await this.redis.get(key);

    if (!raw) {
      throw new UnauthorizedException('otpExpiredOrNotRequested');
    }

    const record: OtpRecord = JSON.parse(raw) as OtpRecord;
    record.attempts += 1;

    if (record.attempts > MAX_OTP_ATTEMPTS) {
      await this.redis.del(key);
      throw new BadRequestException('tooManyOtpAttempts');
    }

    if (record.code !== code) {
      // Persist updated attempt count
      await this.redis.set(key, JSON.stringify(record), OTP_TTL_SECONDS);
      throw new UnauthorizedException('invalidOtpCode');
    }

    // Code is correct — consume it
    await this.redis.del(key);

    // Exchange phone number for tokens via Keycloak OTP grant
    return this.keycloak.loginWithPhoneOtp(phoneNumber);
  }

  private generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
}
