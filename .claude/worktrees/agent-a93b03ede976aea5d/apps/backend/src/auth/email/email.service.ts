import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly appUrl: string;

  constructor(config: ConfigService) {
    this.appUrl = config.get<string>('APP_URL', 'http://localhost:3000');
  }

  sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.appUrl}/auth/password/reset?token=${resetToken}`;
    // Production: replace with SendGrid/SES call
    // Email body must contain both AR and EN content (CLAUDE.md — bilingue obligatoire)
    this.logger.log(`[Email] Password reset | to=${to} | url=${resetUrl}`);
    return Promise.resolve();
  }
}
