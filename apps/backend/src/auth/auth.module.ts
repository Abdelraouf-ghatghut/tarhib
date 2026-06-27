import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { KeycloakService } from './keycloak/keycloak.service';
import { OtpService } from './otp/otp.service';
import { SmsService } from './sms/sms.service';
import { EmailService } from './email/email.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), HttpModule],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    KeycloakService,
    OtpService,
    SmsService,
    EmailService,
  ],
  controllers: [AuthController],
  exports: [JwtAuthGuard, RolesGuard, PassportModule],
})
export class AuthModule {}
