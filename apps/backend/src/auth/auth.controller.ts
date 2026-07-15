import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RequirePermission } from './decorators/require-permission.decorator';
import { Public } from './decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

/** Cookie HttpOnly portant le refresh token pour le Web Admin (anti-XSS). */
const REFRESH_COOKIE = 'tarhib_rt';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      // Limité aux routes /auth : le cookie n'accompagne jamais les appels API
      path: '/auth',
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  }

  private refreshTokenFrom(req: Request, dto?: RefreshRequestDto): string {
    const cookies = req.cookies as Record<string, string> | undefined;
    const token = cookies?.[REFRESH_COOKIE] ?? dto?.refreshToken;
    if (!token) throw new UnauthorizedException('missingRefreshToken');
    return token;
  }

  // ── TARHIB-21 ────────────────────────────────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ type: TokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiTooManyRequestsResponse({ description: 'Account temporarily locked' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const tokens = await this.authService.login(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  // ── TARHIB-22 ────────────────────────────────────────────────────────────
  @Public()
  @Post('otp/request')
  @HttpCode(204)
  @ApiOperation({ summary: 'Request an OTP code by SMS' })
  @ApiNoContentResponse({
    description: 'SMS sent (or phone not found — same response)',
  })
  async requestOtp(@Body() dto: OtpRequestDto): Promise<void> {
    await this.otpService.requestOtp(dto.phoneNumber, dto.channel, dto.appMode);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify OTP code and obtain tokens' })
  @ApiOkResponse({ type: TokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired OTP' })
  verifyOtp(@Body() dto: OtpVerifyDto): Promise<TokenResponseDto> {
    return this.otpService.verifyOtp(dto.phoneNumber, dto.code, dto.appMode);
  }

  // ── TARHIB-23 ────────────────────────────────────────────────────────────
  @Public()
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

  @Public()
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
  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Renew access token using a refresh token (HttpOnly cookie or body)',
  })
  @ApiOkResponse({ type: TokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalid or expired' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto?: RefreshRequestDto,
  ): Promise<TokenResponseDto> {
    const refreshToken = this.refreshTokenFrom(req, dto);
    const tokens = await this.authService.refresh({ refreshToken });
    // Rotation : le nouveau refresh token remplace l'ancien dans le cookie
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke the refresh token (logout)' })
  @ApiNoContentResponse({ description: 'Session revoked' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto?: RefreshRequestDto,
  ): Promise<void> {
    this.clearRefreshCookie(res);
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.[REFRESH_COOKIE] ?? dto?.refreshToken;
    if (refreshToken) await this.authService.logout({ refreshToken });
  }

  // ── Public ───────────────────────────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the authenticated user from the JWT' })
  @ApiOkResponse({ type: CurrentUserDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getCurrentUser(user);
  }

  // ── Signup ────────────────────────────────────────────────────────────────
  @Public()
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

  @Public()
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

  @Patch('device-token')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Enregistrer le token FCM de l'appareil" })
  @ApiNoContentResponse({ description: 'Token enregistré' })
  async updateDeviceToken(
    @Body() body: { token: string },
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.authService.updateDeviceToken(user.sub, body.token);
  }
}
