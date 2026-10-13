import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CompteInactifException,
  IdentifiantOuMotDePasseInvalideException,
  RefreshTokenExpireException,
  RefreshTokenInvalideException,
} from './auth.exceptions';
import { AccessTokenPayload, RefreshTokenPayload } from './auth.types';
import { dureeEnMs } from './duration.util';
import { comparerMotDePasse, hashMotDePasse } from './password.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUtilisateur(identifiant: string, motDePasse: string) {
    const utilisateur = await this.prisma.utilisateur.findFirst({
      where: { OR: [{ email: identifiant }, { telephone: identifiant }] },
      include: { role: true },
    });

    if (!utilisateur) {
      throw new IdentifiantOuMotDePasseInvalideException();
    }

    const motDePasseValide = await comparerMotDePasse(
      motDePasse,
      utilisateur.mot_de_passe_hash,
    );
    if (!motDePasseValide) {
      throw new IdentifiantOuMotDePasseInvalideException();
    }

    if (!utilisateur.actif) {
      throw new CompteInactifException();
    }

    await this.prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { derniere_connexion: new Date() },
    });

    return utilisateur;
  }

  async login(utilisateur: {
    id: string;
    entreprise_id: string;
    site_id: string | null;
    departement_id: string | null;
    role: { code: string };
  }) {
    return this.emettreTokens(utilisateur);
  }

  async refresh(refreshToken: string) {
    const payload = this.verifierRefreshToken(refreshToken);

    const tokenStocke = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });

    if (
      !tokenStocke ||
      tokenStocke.utilisateur_id !== payload.sub ||
      tokenStocke.revoque
    ) {
      throw new RefreshTokenInvalideException();
    }

    if (tokenStocke.expire_at.getTime() < Date.now()) {
      throw new RefreshTokenExpireException();
    }

    const secretValide = await comparerMotDePasse(
      payload.rt,
      tokenStocke.token_hash,
    );
    if (!secretValide) {
      throw new RefreshTokenInvalideException();
    }

    // Rotation : le refresh token utilisé est révoqué, un nouveau couple est émis.
    await this.prisma.refreshToken.update({
      where: { id: tokenStocke.id },
      data: { revoque: true },
    });

    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!utilisateur) {
      throw new RefreshTokenInvalideException();
    }

    if (!utilisateur.actif) {
      throw new CompteInactifException();
    }

    return this.emettreTokens(utilisateur);
  }

  async logout(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.decode(refreshToken);
    } catch {
      return; // logout idempotent : un token déjà invalide ne doit pas faire échouer la déconnexion
    }

    if (!payload?.jti || !payload?.sub) {
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: { id: payload.jti, utilisateur_id: payload.sub },
      data: { revoque: true },
    });
  }

  private async emettreTokens(utilisateur: {
    id: string;
    entreprise_id: string;
    site_id: string | null;
    departement_id: string | null;
    role: { code: string };
  }) {
    const accessPayload: AccessTokenPayload = {
      sub: utilisateur.id,
      role: utilisateur.role.code,
      entreprise_id: utilisateur.entreprise_id,
      site_id: utilisateur.site_id,
      departement_id: utilisateur.departement_id,
    };

    const access_token = await this.jwtService.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn:
        dureeEnMs(this.config.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN')) /
        1000,
    });

    const dureeRefresh = this.config.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );
    const secretBrut = crypto.randomBytes(32).toString('hex');
    const tokenHash = await hashMotDePasse(secretBrut);

    const refreshTokenRow = await this.prisma.refreshToken.create({
      data: {
        utilisateur_id: utilisateur.id,
        token_hash: tokenHash,
        expire_at: new Date(Date.now() + dureeEnMs(dureeRefresh)),
      },
    });

    const refreshPayload: RefreshTokenPayload = {
      sub: utilisateur.id,
      jti: refreshTokenRow.id,
      rt: secretBrut,
    };

    const refresh_token = await this.jwtService.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: dureeEnMs(dureeRefresh) / 1000,
    });

    return { access_token, refresh_token };
  }

  private verifierRefreshToken(refreshToken: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'TokenExpiredError') {
        throw new RefreshTokenExpireException();
      }
      throw new RefreshTokenInvalideException();
    }
  }
}
