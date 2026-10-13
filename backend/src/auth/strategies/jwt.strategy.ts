import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload, AuthenticatedUser } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  // Le payload est déjà vérifié (signature + expiration) par passport-jwt à ce stade.
  // Aucune requête DB ici : le rôle/site/entreprise viennent du token, revérifiés
  // explicitement par les guards et par chaque endpoint métier (cf. CLAUDE.md).
  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return payload;
  }
}
