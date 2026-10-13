import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { calculerDebutPeriode, calculerFinPeriode } from './periode.util';
import { QuotaConsommationResume } from './quotas.types';

/**
 * Lecture seule pour l'instant (pas de CRUD de `quotas` — hors périmètre
 * demandé, cf. CLAUDE.md). Même sémantique de résolution des quotas
 * applicables que `CommandeValidationService.verifierQuotas` : quotas
 * globaux au rôle (`role_id IS NULL`) ou spécifiques au rôle du demandeur.
 */
@Injectable()
export class QuotasService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuotasUtilisateur(
    utilisateur: AuthenticatedUser,
  ): Promise<QuotaConsommationResume[]> {
    const role = await this.prisma.role.findUnique({
      where: { code: utilisateur.role },
    });
    if (!role) {
      return [];
    }

    const quotas = await this.prisma.quota.findMany({
      where: { OR: [{ role_id: null }, { role_id: role.id }] },
      include: { produit: true },
    });

    const maintenant = new Date();

    return Promise.all(
      quotas.map(async (quota) => {
        const periodeDebut = calculerDebutPeriode(quota.periode, maintenant);
        const periodeFin = calculerFinPeriode(quota.periode, periodeDebut);

        const consommation = await this.prisma.quotaConsommation.findUnique({
          where: {
            utilisateur_id_quota_id_periode_debut: {
              utilisateur_id: utilisateur.sub,
              quota_id: quota.id,
              periode_debut: periodeDebut,
            },
          },
        });

        const valeurMax = quota.valeur_max.toNumber();
        const valeurConsommee = consommation?.valeur_consommee.toNumber() ?? 0;

        return {
          quota_id: quota.id,
          produit_id: quota.produit_id,
          produit: quota.produit
            ? {
                id: quota.produit.id,
                nom_ar: quota.produit.nom_ar,
                nom_en: quota.produit.nom_en,
              }
            : null,
          periode: quota.periode,
          periode_debut: periodeDebut,
          periode_fin: periodeFin,
          valeur_max: valeurMax,
          valeur_consommee: valeurConsommee,
          valeur_restante: Math.max(valeurMax - valeurConsommee, 0),
        };
      }),
    );
  }
}
