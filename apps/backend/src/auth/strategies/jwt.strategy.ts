import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const keycloakUrl = config.get<string>(
      'KEYCLOAK_ADMIN_URL',
      'http://localhost:8080',
    );
    const realm = config.get<string>('KEYCLOAK_REALM', 'tarhib');
    const jwksUri = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri,
      }),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    // Keycloak JWT may use non-standard claim names before mappers are configured
    const raw = payload as JwtPayload & Record<string, unknown>;
    return {
      sub: payload.sub,
      email: payload.email ?? (raw['preferred_username'] as string | undefined),
      role: payload.role ?? (raw['tarhib_role'] as string | undefined),
      companyId:
        payload.companyId ??
        (raw['tarhib_company_id'] as string | undefined) ??
        '',
      branchId:
        payload.branchId ??
        (raw['tarhib_branch_id'] as string | undefined) ??
        '',
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
