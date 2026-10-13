import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

export class IdentifiantOuMotDePasseInvalideException extends UnauthorizedException {
  constructor() {
    super({
      code: 'AUTH_IDENTIFIANT_INVALIDE',
      message: 'Identifiant ou mot de passe invalide',
    });
  }
}

export class CompteInactifException extends UnauthorizedException {
  constructor() {
    super({
      code: 'AUTH_COMPTE_INACTIF',
      message: 'Ce compte a été désactivé',
    });
  }
}

export class RefreshTokenInvalideException extends UnauthorizedException {
  constructor() {
    super({
      code: 'AUTH_REFRESH_TOKEN_INVALIDE',
      message: 'Refresh token invalide ou révoqué',
    });
  }
}

export class RefreshTokenExpireException extends UnauthorizedException {
  constructor() {
    super({
      code: 'AUTH_REFRESH_TOKEN_EXPIRE',
      message: 'Refresh token expiré',
    });
  }
}

export class RoleInsuffisantException extends ForbiddenException {
  constructor() {
    super({
      code: 'AUTH_ROLE_INSUFFISANT',
      message: 'Rôle insuffisant pour cette action',
    });
  }
}

export class PermissionInsuffisanteException extends ForbiddenException {
  constructor() {
    super({
      code: 'AUTH_PERMISSION_INSUFFISANTE',
      message: 'Permission insuffisante pour cette action',
    });
  }
}
