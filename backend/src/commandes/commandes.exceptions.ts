import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Les 5 refus métier ci-dessous correspondent 1:1 à l'enum `code_refus_commande`
 * du schéma. Le corps de réponse ne contient JAMAIS de texte libre : c'est
 * l'app Flutter qui traduit `code_refus` (ar/en) à partir de ce code seul.
 * Ne pas ajouter de champ `message` ici — cf. règle bilinguisme de CLAUDE.md.
 */
export class ProduitIndisponibleException extends UnprocessableEntityException {
  constructor() {
    super({ code_refus: 'produit_indisponible' });
  }
}

export class StockInsuffisantException extends UnprocessableEntityException {
  constructor() {
    super({ code_refus: 'stock_insuffisant' });
  }
}

export class QuotaDepasseException extends UnprocessableEntityException {
  constructor() {
    super({ code_refus: 'quota_depasse' });
  }
}

export class HoraireFermeException extends UnprocessableEntityException {
  constructor() {
    super({ code_refus: 'horaire_ferme' });
  }
}

export class RoleNonAutoriseException extends UnprocessableEntityException {
  constructor() {
    super({ code_refus: 'role_non_autorise' });
  }
}

/**
 * Erreurs d'intégrité de la requête : distinctes des 5 refus métier ci-dessus,
 * elles ne font pas partie de l'enum code_refus_commande (la requête elle-même
 * est invalide, ce n'est pas un refus de règle de gestion).
 */
export class UtilisateurSansSiteException extends BadRequestException {
  constructor() {
    super({
      code: 'COMMANDE_UTILISATEUR_SANS_SITE',
      message: 'Vous devez être rattaché à un site pour passer une commande',
    });
  }
}

export class DepartementInvalidePourCommandeException extends BadRequestException {
  constructor() {
    super({
      code: 'COMMANDE_DEPARTEMENT_INVALIDE',
      message: "Département invalide ou n'appartenant pas à votre site",
    });
  }
}

export class ServiceInvalidePourCommandeException extends BadRequestException {
  constructor() {
    super({
      code: 'COMMANDE_SERVICE_INVALIDE',
      message: "Service invalide ou n'appartenant pas à votre site",
    });
  }
}

export class CommandeIntrouvableException extends NotFoundException {
  constructor() {
    super({ code: 'COMMANDE_INTROUVABLE', message: 'Commande introuvable' });
  }
}

export class TransitionStatutInvalideException extends BadRequestException {
  constructor() {
    super({
      code: 'COMMANDE_TRANSITION_INVALIDE',
      message: "Cette transition de statut n'est pas autorisée",
    });
  }
}
