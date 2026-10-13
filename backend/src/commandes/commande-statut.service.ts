import { Injectable } from '@nestjs/common';
import { Prisma, StatutCommande } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculerDebutPeriode,
  calculerFinPeriode,
} from '../quotas/periode.util';
import { StocksService } from '../stocks/stocks.service';
import { TransitionStatutInvalideException } from './commandes.exceptions';

type CommandeAvecLignes = Prisma.CommandeGetPayload<{
  include: {
    lignes_commande: { include: { produit: true } };
    utilisateur: { select: { role_id: true } };
  };
}>;

/**
 * Transitions de statut autorisées (machine à états explicite, cf. CLAUDE.md :
 * "ne jamais autoriser un changement de statut arbitraire"). Tout statut absent
 * de cette table (refusee, annulee, en_attente_approbation...) n'est pas géré
 * par cet endpoint pour l'instant — hors périmètre demandé.
 */
const TRANSITIONS_AUTORISEES: Partial<
  Record<StatutCommande, StatutCommande[]>
> = {
  en_attente: ['validee'],
  validee: ['en_preparation'],
  en_preparation: ['en_livraison'],
  en_livraison: ['livree'],
};

@Injectable()
export class CommandeStatutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stocksService: StocksService,
  ) {}

  async changerStatut(
    commande: CommandeAvecLignes,
    nouveauStatut: StatutCommande,
    utilisateurId: string,
  ): Promise<CommandeAvecLignes> {
    const transitionsPermises = TRANSITIONS_AUTORISEES[commande.statut] ?? [];
    if (!transitionsPermises.includes(nouveauStatut)) {
      throw new TransitionStatutInvalideException();
    }

    if (nouveauStatut === 'livree') {
      return this.livrer(commande, utilisateurId);
    }

    const data: Prisma.CommandeUpdateInput = { statut: nouveauStatut };
    if (nouveauStatut === 'validee') {
      data.date_validation = new Date();
      data.valide_par = { connect: { id: utilisateurId } };
    } else if (nouveauStatut === 'en_preparation') {
      data.date_preparation = new Date();
      data.agent = { connect: { id: utilisateurId } };
    }

    return this.prisma.commande.update({
      where: { id: commande.id },
      data,
      include: {
        lignes_commande: { include: { produit: true } },
        utilisateur: { select: { role_id: true } },
      },
    });
  }

  /**
   * Effets de bord de la transition vers "livrée" : déduction de stock,
   * incrémentation des quotas, audit, notification — tous appliqués dans la
   * même transaction que le changement de statut.
   */
  private async livrer(
    commande: CommandeAvecLignes,
    utilisateurId: string,
  ): Promise<CommandeAvecLignes> {
    const maintenant = new Date();

    return this.prisma.$transaction(async (tx) => {
      for (const ligne of commande.lignes_commande) {
        await this.stocksService.deduireStockPourLivraison(tx, {
          produitId: ligne.produit_id,
          siteId: commande.site_id,
          quantite: ligne.quantite,
          utilisateurId,
          commandeId: commande.id,
        });
      }

      const quotas = await tx.quota.findMany({
        where: {
          OR: [{ role_id: null }, { role_id: commande.utilisateur.role_id }],
        },
      });

      for (const quota of quotas) {
        const quantiteLivree = quota.produit_id
          ? commande.lignes_commande
              .filter((l) => l.produit_id === quota.produit_id)
              .reduce(
                (total, l) => total.plus(l.quantite),
                new Prisma.Decimal(0),
              )
          : commande.lignes_commande.reduce(
              (total, l) => total.plus(l.quantite),
              new Prisma.Decimal(0),
            );

        if (quantiteLivree.lessThanOrEqualTo(0)) {
          continue;
        }

        const periodeDebut = calculerDebutPeriode(quota.periode, maintenant);
        const periodeFin = calculerFinPeriode(quota.periode, periodeDebut);

        await tx.quotaConsommation.upsert({
          where: {
            utilisateur_id_quota_id_periode_debut: {
              utilisateur_id: commande.utilisateur_id,
              quota_id: quota.id,
              periode_debut: periodeDebut,
            },
          },
          create: {
            utilisateur_id: commande.utilisateur_id,
            quota_id: quota.id,
            periode_debut: periodeDebut,
            periode_fin: periodeFin,
            valeur_consommee: quantiteLivree,
          },
          update: {
            valeur_consommee: { increment: quantiteLivree.toNumber() },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          utilisateur_id: utilisateurId,
          action: 'LIVRAISON_COMMANDE',
          entite: 'commande',
          entite_id: commande.id,
          valeurs_avant: { statut: commande.statut },
          valeurs_apres: { statut: 'livree' },
        },
      });

      await tx.notification.create({
        data: {
          utilisateur_id: commande.utilisateur_id,
          type: 'livraison',
          commande_id: commande.id,
          donnees: {
            lignes: commande.lignes_commande.map((l) => ({
              produit_id: l.produit_id,
              quantite: l.quantite.toNumber(),
            })),
          },
        },
      });

      return tx.commande.update({
        where: { id: commande.id },
        data: { statut: 'livree', date_livraison: maintenant },
        include: {
          lignes_commande: { include: { produit: true } },
          utilisateur: { select: { role_id: true } },
        },
      });
    });
  }
}
