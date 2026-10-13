import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StockInsuffisantPourLivraisonException } from './stocks.exceptions';

export interface DeduireStockParams {
  produitId: string;
  siteId: string;
  quantite: Prisma.Decimal | number;
  utilisateurId: string;
  commandeId: string;
}

/**
 * Logique de mutation du stock à la livraison, isolée du cycle de vie de la
 * commande (cf. CLAUDE.md : logique métier dans des services dédiés). Utilisée
 * à l'intérieur de la transaction Prisma de `CommandeStatutService` — reçoit
 * donc le client de transaction (`tx`) plutôt que `PrismaService` directement.
 */
@Injectable()
export class StocksService {
  async deduireStockPourLivraison(
    tx: Prisma.TransactionClient,
    params: DeduireStockParams,
  ): Promise<void> {
    const stocks = await tx.stock.findMany({
      where: {
        produit_id: params.produitId,
        emplacement: { site_id: params.siteId },
      },
      orderBy: { emplacement: { type: 'asc' } },
    });

    const quantiteADeduire = new Prisma.Decimal(params.quantite);
    const quantiteDisponible = stocks.reduce(
      (total, stock) => total.plus(stock.quantite),
      new Prisma.Decimal(0),
    );
    if (quantiteDisponible.lessThan(quantiteADeduire)) {
      throw new StockInsuffisantPourLivraisonException();
    }

    let resteADeduire = quantiteADeduire;
    for (const stock of stocks) {
      if (resteADeduire.lessThanOrEqualTo(0)) {
        break;
      }

      const quantitePrelevee = Prisma.Decimal.min(
        stock.quantite,
        resteADeduire,
      );
      const nouvelleQuantite = stock.quantite.minus(quantitePrelevee);

      await tx.stock.update({
        where: { id: stock.id },
        data: { quantite: nouvelleQuantite },
      });

      await tx.mouvementStock.create({
        data: {
          stock_id: stock.id,
          type: 'sortie',
          quantite: quantitePrelevee,
          motif: 'Livraison commande',
          utilisateur_id: params.utilisateurId,
          commande_id: params.commandeId,
        },
      });

      if (nouvelleQuantite.lessThan(stock.seuil_minimal)) {
        await tx.notification.create({
          data: {
            utilisateur_id: params.utilisateurId,
            type: 'rupture_stock',
            donnees: { produit_id: params.produitId },
          },
        });
      }

      resteADeduire = resteADeduire.minus(quantitePrelevee);
    }
  }
}
