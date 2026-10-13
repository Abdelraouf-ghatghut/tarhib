import { ConflictException } from '@nestjs/common';

/**
 * Le stock a pu changer entre la création de la commande et sa livraison
 * (autre commande livrée en premier, ajustement manuel...) : ce n'est pas un
 * des 5 refus de l'enum code_refus_commande (la commande a été validée à sa
 * création), c'est un conflit constaté au moment de la déduction réelle.
 */
export class StockInsuffisantPourLivraisonException extends ConflictException {
  constructor() {
    super({
      code: 'COMMANDE_STOCK_INSUFFISANT_LIVRAISON',
      message: 'Stock insuffisant pour livrer cette commande',
    });
  }
}
