import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly appUrl: string;
  private readonly from: string;
  /** Sans SMTP_HOST configuré : stub logger (dev/local), aucun envoi réel. */
  private readonly transporter: Transporter | null;

  constructor(config: ConfigService) {
    this.appUrl = config.get<string>('APP_URL', 'http://localhost:3000');
    this.from = config.get<string>('EMAIL_FROM', 'no-reply@tarhib.app');

    const host = config.get<string>('SMTP_HOST');
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: config.get<number>('SMTP_PORT', 587),
          // STARTTLS sur 587 (Brevo, la plupart des hébergeurs) ; SSL direct sur 465.
          secure: config.get<number>('SMTP_PORT', 587) === 465,
          auth: {
            user: config.get<string>('SMTP_USER'),
            pass: config.get<string>('SMTP_PASS'),
          },
        })
      : null;
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[Email:stub] to=${to} | subject=${subject}\n${text}`);
      return;
    }
    await this.transporter.sendMail({ to, from: this.from, subject, text });
  }

  sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.appUrl}/auth/password/reset?token=${resetToken}`;
    // Email body must contain both AR and EN content (CLAUDE.md — bilingue obligatoire)
    return this.send(
      to,
      'إعادة تعيين كلمة المرور / Password reset — Tarhib',
      `اضغط على الرابط التالي لإعادة تعيين كلمة المرور (صالح لمدة ساعة):\n${resetUrl}\n\n` +
        `Click the link below to reset your password (valid for 1 hour):\n${resetUrl}`,
    );
  }

  /**
   * L'employé invité n'a pas de lien web à ouvrir (compte mobile uniquement,
   * CLAUDE.md §internalOnlyAccess) — il saisit ce code manuellement dans
   * l'app via "لديك رمز دعوة؟" (écran AcceptInvite).
   */
  sendInviteEmail(to: string, code: string): Promise<void> {
    return this.send(
      to,
      'دعوة للانضمام إلى ترحيب / Invitation to join Tarhib',
      `تمت دعوتك للانضمام إلى ترحيب. افتح تطبيق ترحيب على جوالك، اضغط على ` +
        `"لديك رمز دعوة؟" ثم أدخل الرمز التالي (صالح لمدة 7 أيام):\n${code}\n\n` +
        `You've been invited to join Tarhib. Open the Tarhib app on your phone, ` +
        `tap "Have an invite code?" and enter the code below (valid for 7 days):\n${code}`,
    );
  }
}
