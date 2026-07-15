import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { Company } from '../companies/entities/company.entity';
import { Role } from '../roles/entities/role.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { KeycloakService } from './keycloak/keycloak.service';
import { OtpService } from './otp/otp.service';
import { OtpDeliveryService } from './sms/sms.service';
import { EmailService } from './email/email.service';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    HttpModule,
    AccessModule,
    TypeOrmModule.forFeature([Employee, Company, Role]),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    KeycloakService,
    OtpService,
    OtpDeliveryService,
    EmailService,
  ],
  controllers: [AuthController],
  exports: [
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    PassportModule,
    KeycloakService,
  ],
})
export class AuthModule {}
