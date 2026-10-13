import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class UtilisateurIntrouvableException extends NotFoundException {
  constructor() {
    super({
      code: 'UTILISATEUR_INTROUVABLE',
      message: 'Utilisateur introuvable',
    });
  }
}

export class EmailOuTelephoneRequisException extends BadRequestException {
  constructor() {
    super({
      code: 'UTILISATEUR_IDENTIFIANT_REQUIS',
      message: 'Email ou téléphone requis',
    });
  }
}

export class EmailDejaUtiliseException extends ConflictException {
  constructor() {
    super({
      code: 'UTILISATEUR_EMAIL_DEJA_UTILISE',
      message: 'Cet email est déjà utilisé',
    });
  }
}

export class TelephoneDejaUtiliseException extends ConflictException {
  constructor() {
    super({
      code: 'UTILISATEUR_TELEPHONE_DEJA_UTILISE',
      message: 'Ce téléphone est déjà utilisé',
    });
  }
}

export class RoleInvalideException extends BadRequestException {
  constructor() {
    super({ code: 'UTILISATEUR_ROLE_INVALIDE', message: 'Rôle invalide' });
  }
}

export class SiteInvalideException extends BadRequestException {
  constructor() {
    super({
      code: 'UTILISATEUR_SITE_INVALIDE',
      message: "Site invalide ou n'appartenant pas à votre entreprise",
    });
  }
}

export class DepartementInvalideException extends BadRequestException {
  constructor() {
    super({
      code: 'UTILISATEUR_DEPARTEMENT_INVALIDE',
      message:
        "Département invalide, n'appartenant pas au site indiqué ou à votre entreprise",
    });
  }
}

export class DesactivationDeSoiMemeInterditeException extends ForbiddenException {
  constructor() {
    super({
      code: 'UTILISATEUR_DESACTIVATION_SOI_MEME_INTERDITE',
      message: 'Vous ne pouvez pas désactiver votre propre compte',
    });
  }
}
