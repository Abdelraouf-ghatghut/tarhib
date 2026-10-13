import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
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
}
