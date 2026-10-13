import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  HoraireFermeException,
  ProduitIndisponibleException,
  QuotaDepasseException,
  RoleNonAutoriseException,
  StockInsuffisantException,
} from './commandes.exceptions';
import { calculerDebutPeriode } from '../quotas/periode.util';

export interface LigneAValider {
  produit_id: string;
  quantite: number;
}

/**
 * Moteur de règles de validation automatique d'une commande, isolé du
 * contrôleur/service d'orchestration (cf. CLAUDE.md : la logique métier vit
 * dans des services dédiés). Les 5 vérifications s'exécutent strictement dans
 * l'ordre imposé par docs/schema.sql section 6 : la première qui échoue
 * lève l'exception correspondant à son code_refus, les suivantes ne sont pas
 * évaluées.
 */
@Injectable()
export class CommandeValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validerCommande(params: {
    roleId: string;
    siteId: string;
    lignes: LigneAValider[];
    serviceId: string | null;
    heureSouhaitee: Date | null;
    utilisateurId: string;
  }): Promise<void> {
    await this.verifierDisponibiliteProduits(params.lignes, params.siteId);
    await this.verifierStockSuffisant(params.lignes, params.siteId);
    await this.verifierQuotas(
      params.utilisateurId,
      params.roleId,
      params.lignes,
    );
    await this.verifierHorairesService(params.serviceId, params.heureSouhaitee);
    await this.verifierRoleAutorise(params.lignes, params.roleId);
  }

  /** Priorité de la commande = niveau_priorite du rôle du demandeur (1 = le plus prioritaire). */
  calculerPriorite(niveauPrioriteRole: number): number {
    return niveauPrioriteRole;
  }

  // 1. Disponibilité produit (actif + disponible sur le site demandeur)
  private async verifierDisponibiliteProduits(
    lignes: LigneAValider[],
    siteId: string,
  ): Promise<void> {
    const produits = await this.prisma.produit.findMany({
      where: { id: { in: lignes.map((l) => l.produit_id) } },
      include: {
        produits_sites: { where: { site_id: siteId, disponible: true } },
      },
    });

    for (const ligne of lignes) {
      const produit = produits.find((p) => p.id === ligne.produit_id);
      const disponible = !!produit?.actif && produit.produits_sites.length > 0;
      if (!disponible) {
        throw new ProduitIndisponibleException();
      }
    }
  }

  // 2. Stock suffisant (somme des emplacements du site demandeur, déduction simple)
  private async verifierStockSuffisant(
    lignes: LigneAValider[],
    siteId: string,
  ): Promise<void> {
    for (const ligne of lignes) {
      const stocks = await this.prisma.stock.findMany({
        where: {
          produit_id: ligne.produit_id,
          emplacement: { site_id: siteId },
        },
      });
      const quantiteDisponible = stocks.reduce(
        (total, stock) => total.plus(stock.quantite),
        new Prisma.Decimal(0),
      );
      if (quantiteDisponible.lessThan(ligne.quantite)) {
        throw new StockInsuffisantException();
      }
    }
  }

  // 3. Quota non dépassé (quotas applicables au rôle, globaux ou par produit)
  private async verifierQuotas(
    utilisateurId: string,
    roleId: string,
    lignes: LigneAValider[],
  ): Promise<void> {
    const quotas = await this.prisma.quota.findMany({
      where: { OR: [{ role_id: null }, { role_id: roleId }] },
    });

    if (quotas.length === 0) {
      return;
    }

    const maintenant = new Date();

    for (const quota of quotas) {
      const quantiteCommandee = quota.produit_id
        ? lignes
            .filter((l) => l.produit_id === quota.produit_id)
            .reduce((total, l) => total + l.quantite, 0)
        : lignes.reduce((total, l) => total + l.quantite, 0);

      if (quantiteCommandee === 0) {
        continue;
      }

      const periodeDebut = calculerDebutPeriode(quota.periode, maintenant);
      const consommation = await this.prisma.quotaConsommation.findUnique({
        where: {
          utilisateur_id_quota_id_periode_debut: {
            utilisateur_id: utilisateurId,
            quota_id: quota.id,
            periode_debut: periodeDebut,
          },
        },
      });

      const dejaConsomme = consommation?.valeur_consommee.toNumber() ?? 0;
      if (dejaConsomme + quantiteCommandee > quota.valeur_max.toNumber()) {
        throw new QuotaDepasseException();
      }
    }
  }

  // 4. Horaires du service ouverts (si un service est précisé et a des horaires définis)
  private async verifierHorairesService(
    serviceId: string | null,
    heureSouhaitee: Date | null,
  ): Promise<void> {
    if (!serviceId) {
      return;
    }

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service || !service.heure_ouverture || !service.heure_fermeture) {
      return; // pas d'horaires définis = pas de contrainte
    }

    const reference = heureSouhaitee ?? new Date();
    const minutesReference =
      reference.getUTCHours() * 60 + reference.getUTCMinutes();
    const minutesOuverture =
      service.heure_ouverture.getUTCHours() * 60 +
      service.heure_ouverture.getUTCMinutes();
    const minutesFermeture =
      service.heure_fermeture.getUTCHours() * 60 +
      service.heure_fermeture.getUTCMinutes();

    const ouvert =
      minutesOuverture <= minutesFermeture
        ? minutesReference >= minutesOuverture &&
          minutesReference <= minutesFermeture
        : minutesReference >= minutesOuverture ||
          minutesReference <= minutesFermeture; // service ouvert la nuit (ex: 22h-6h)

    if (!ouvert) {
      throw new HoraireFermeException();
    }
  }

  // 5. Rôle autorisé pour chaque produit (cf. produits_roles, même sémantique que le catalogue)
  private async verifierRoleAutorise(
    lignes: LigneAValider[],
    roleId: string,
  ): Promise<void> {
    const produits = await this.prisma.produit.findMany({
      where: { id: { in: lignes.map((l) => l.produit_id) } },
      include: { produits_roles: true },
    });

    for (const ligne of lignes) {
      const produit = produits.find((p) => p.id === ligne.produit_id);
      const restreint = (produit?.produits_roles.length ?? 0) > 0;
      const autorise =
        !restreint ||
        produit!.produits_roles.some((pr) => pr.role_id === roleId);
      if (!autorise) {
        throw new RoleNonAutoriseException();
      }
    }
  }
}
