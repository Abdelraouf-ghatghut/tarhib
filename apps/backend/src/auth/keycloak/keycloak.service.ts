import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { TokenResponseDto } from '../dto/token-response.dto';

interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private readonly tokenUrl: string;
  private readonly logoutUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const base = config.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
    const realm = config.get<string>('KEYCLOAK_REALM', 'tarhib');
    this.tokenUrl = `${base}/realms/${realm}/protocol/openid-connect/token`;
    this.logoutUrl = `${base}/realms/${realm}/protocol/openid-connect/logout`;
    this.clientId = config.get<string>('KEYCLOAK_CLIENT_ID', 'tarhib-backend');
    this.clientSecret = config.get<string>('KEYCLOAK_CLIENT_SECRET', '');
  }

  async loginWithPassword(
    email: string,
    password: string,
  ): Promise<TokenResponseDto> {
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: email,
      password,
    });

    try {
      const { data } = await firstValueFrom(
        this.http.post<KeycloakTokenResponse>(
          this.tokenUrl,
          params.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    } catch (err: unknown) {
      const status =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'status' in err.response
          ? (err.response as { status: number }).status
          : 0;

      if (status === 401 || status === 400) {
        throw new UnauthorizedException();
      }
      this.logger.error('Keycloak login error', err);
      throw new InternalServerErrorException();
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResponseDto> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });

    try {
      const { data } = await firstValueFrom(
        this.http.post<KeycloakTokenResponse>(
          this.tokenUrl,
          params.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * TARHIB-22: After OTP is verified in-app, we authenticate the user in Keycloak
   * using a custom grant or the resource-owner flow with phone as username.
   * The phone number must match the Keycloak username or a mapped attribute.
   */
  async loginWithPhoneOtp(phoneNumber: string): Promise<TokenResponseDto> {
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: phoneNumber,
      // Keycloak receives a one-time internal marker; real OTP already verified by OtpService
      password: `__otp_verified__${Date.now()}`,
    });

    try {
      const { data } = await firstValueFrom(
        this.http.post<KeycloakTokenResponse>(
          this.tokenUrl,
          params.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    } catch {
      throw new UnauthorizedException('OTP authentication failed in Keycloak');
    }
  }

  /**
   * TARHIB-23: Reset password and revoke all active sessions via Keycloak Admin API.
   * Requires KEYCLOAK_ADMIN_URL + admin credentials in env.
   */
  async resetUserPassword(email: string, newPassword: string): Promise<void> {
    const adminBase = this.config.get<string>(
      'KEYCLOAK_ADMIN_URL',
      'http://localhost:8080',
    );
    const realm = this.config.get<string>('KEYCLOAK_REALM', 'tarhib');

    // 1. Get admin token
    const adminToken = await this.getAdminToken(adminBase);

    // 2. Find user by email
    const searchUrl = `${adminBase}/admin/realms/${realm}/users?email=${encodeURIComponent(email)}&exact=true`;
    const { data: users } = await firstValueFrom(
      this.http.get<{ id: string }[]>(searchUrl, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );

    if (!users.length) {
      // Silently succeed — same as requestPasswordReset (no user enumeration)
      return;
    }

    const userId = users[0].id;

    // 3. Reset password
    await firstValueFrom(
      this.http.put(
        `${adminBase}/admin/realms/${realm}/users/${userId}/reset-password`,
        { type: 'password', value: newPassword, temporary: false },
        { headers: { Authorization: `Bearer ${adminToken}` } },
      ),
    );

    // 4. Revoke all sessions (TARHIB-23 requirement)
    await firstValueFrom(
      this.http.delete(
        `${adminBase}/admin/realms/${realm}/users/${userId}/sessions`,
        { headers: { Authorization: `Bearer ${adminToken}` } },
      ),
    );
  }

  private async getAdminToken(adminBase: string): Promise<string> {
    const adminUser = this.config.get<string>('KEYCLOAK_ADMIN_USER', 'admin');
    const adminPass = this.config.get<string>('KEYCLOAK_ADMIN_PASSWORD', '');
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: adminUser,
      password: adminPass,
    });
    const { data } = await firstValueFrom(
      this.http.post<KeycloakTokenResponse>(
        `${adminBase}/realms/master/protocol/openid-connect/token`,
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    );
    return data.access_token;
  }

  /**
   * TARHIB-32: Révoque toutes les sessions actives d'un utilisateur via l'Admin API Keycloak.
   * Appelé lors de la désactivation d'un compte employé.
   * Non-fatal : l'employé est déjà désactivé en DB si cette méthode échoue.
   */
  async revokeUserSessions(email: string): Promise<void> {
    const adminBase = this.config.get<string>(
      'KEYCLOAK_ADMIN_URL',
      'http://localhost:8080',
    );
    const realm = this.config.get<string>('KEYCLOAK_REALM', 'tarhib');

    try {
      const adminToken = await this.getAdminToken(adminBase);

      const { data: users } = await firstValueFrom(
        this.http.get<{ id: string }[]>(
          `${adminBase}/admin/realms/${realm}/users?email=${encodeURIComponent(email)}&exact=true`,
          { headers: { Authorization: `Bearer ${adminToken}` } },
        ),
      );

      if (!users.length) {
        this.logger.warn(
          `revokeUserSessions: no Keycloak user found for ${email}`,
        );
        return;
      }

      await firstValueFrom(
        this.http.delete(
          `${adminBase}/admin/realms/${realm}/users/${users[0].id}/sessions`,
          { headers: { Authorization: `Bearer ${adminToken}` } },
        ),
      );

      this.logger.log(`All Keycloak sessions revoked for ${email}`);
    } catch (err) {
      this.logger.error(`revokeUserSessions failed for ${email}`, err);
    }
  }

  /** Create a new user in Keycloak and return the keycloakId (UUID). */
  async createUser(email: string, password: string): Promise<string> {
    const adminBase = this.config.get<string>(
      'KEYCLOAK_ADMIN_URL',
      'http://localhost:8080',
    );
    const realm = this.config.get<string>('KEYCLOAK_REALM', 'tarhib');

    const adminToken = await this.getAdminToken(adminBase);

    const createUrl = `${adminBase}/admin/realms/${realm}/users`;
    const response = await firstValueFrom(
      this.http.post(
        createUrl,
        {
          username: email,
          email,
          enabled: true,
          credentials: [
            { type: 'password', value: password, temporary: false },
          ],
        },
        { headers: { Authorization: `Bearer ${adminToken}` } },
      ),
    );

    // Keycloak returns the new user URL in the Location header
    const location: string =
      (response.headers as Record<string, string>)['location'] ?? '';
    const keycloakId = location.split('/').pop() ?? email;
    return keycloakId;
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });

    try {
      await firstValueFrom(
        this.http.post(this.logoutUrl, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
    } catch (err) {
      this.logger.warn('Keycloak logout error (non-fatal)', err);
    }
  }
}
