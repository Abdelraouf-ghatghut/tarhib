import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentUserDto } from './dto/current-user.dto';
import { LoginDto } from './dto/login.dto';
import { OtpRequestDto } from './dto/otp-request.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RequirePermission } from './decorators/require-permission.decorator';
import { RegisterDto } from './dto/register.dto';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  // ── TARHIB-21 ────────────────────────────────────────────────────────────
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ type: TokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiTooManyRequestsResponse({ description: 'Account temporarily locked' })
  login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(dto);
  }

  // ── TARHIB-22 ────────────────────────────────────────────────────────────
  @Post('otp/request')
  @HttpCode(204)
  @ApiOperation({ summary: 'Request an OTP code by SMS' })
  @ApiNoContentResponse({
    description: 'SMS sent (or phone not found — same response)',
  })
  async requestOtp(@Body() dto: OtpRequestDto): Promise<void> {
    await this.otpService.requestOtp(dto.phoneNumber);
  }

  @Post('otp/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify OTP code and obtain tokens' })
  @ApiOkResponse({ type: TokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired OTP' })
  verifyOtp(@Body() dto: OtpVerifyDto): Promise<TokenResponseDto> {
    return this.otpService.verifyOtp(dto.phoneNumber, dto.code);
  }

  // ── TARHIB-23 ────────────────────────────────────────────────────────────
  @Post('password/reset-request')
  @HttpCode(204)
  @ApiOperation({ summary: 'Request password reset link by email' })
  @ApiNoContentResponse({
    description: 'Email sent (same response whether email exists)',
  })
  async requestPasswordReset(
    @Body() dto: PasswordResetRequestDto,
  ): Promise<void> {
    await this.authService.requestPasswordReset(dto);
  }

  @Post('password/reset')
  @HttpCode(204)
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  @ApiNoContentResponse({
    description: 'Password updated and all sessions revoked',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired reset token' })
  async resetPassword(@Body() dto: PasswordResetDto): Promise<void> {
    await this.authService.resetPassword(dto);
  }

  // ── TARHIB-24 ────────────────────────────────────────────────────────────
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renew access token using a refresh token' })
  @ApiOkResponse({ type: TokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalid or expired' })
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke the refresh token (logout)' })
  @ApiNoContentResponse({ description: 'Session revoked' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto);
  }

  // ── Public ───────────────────────────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the authenticated user from the JWT' })
  @ApiOkResponse({ type: CurrentUserDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  getMe(@CurrentUser() user: JwtPayload): JwtPayload {
    return this.authService.getCurrentUser(user);
  }

  // ── Signup ────────────────────────────────────────────────────────────────
  @Post('register')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Self-register as employee (pending admin approval)',
  })
  @ApiNoContentResponse({
    description: 'Registration submitted — awaiting approval',
  })
  async register(@Body() dto: RegisterDto): Promise<void> {
    await this.authService.register(dto);
  }

  @Post('invite')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('employee.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite an employee by email (admin)' })
  @ApiNoContentResponse({ description: 'Invitation sent' })
  async inviteEmployee(@Body() dto: InviteEmployeeDto): Promise<void> {
    await this.authService.inviteEmployee(dto);
  }

  @Post('accept-invite')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept invitation and set up account' })
  @ApiOkResponse({ type: TokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token invalid or expired' })
  acceptInvite(@Body() dto: AcceptInviteDto): Promise<TokenResponseDto> {
    return this.authService.acceptInvite(dto);
  }

  @Get('pending-registrations')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('employee.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending self-registrations (admin)' })
  getPendingRegistrations(@Query('companyId') companyId?: string) {
    return this.authService.getPendingRegistrations(companyId);
  }

  @Patch('registrations/:id/approve')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('employee.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a pending registration' })
  @ApiNoContentResponse({ description: 'Approved' })
  async approveRegistration(@Param('id') id: string): Promise<void> {
    await this.authService.approveRegistration(id);
  }

  @Patch('registrations/:id/reject')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('employee.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject and delete a pending registration' })
  @ApiNoContentResponse({ description: 'Rejected' })
  async rejectRegistration(@Param('id') id: string): Promise<void> {
    await this.authService.rejectRegistration(id);
  }
}
