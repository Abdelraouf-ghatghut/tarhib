import { Injectable } from '@nestjs/common';
import { StatutCommande } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CommandeStatutService } from './commande-statut.service';
import { CommandeValidationService } from './commande-validation.service';
import { CreateCommandeDto } from './dto/create-commande.dto';
import {
  CommandeIntrouvableException,
  DepartementInvalidePourCommandeException,
  RoleNonAutoriseException,
  ServiceInvalidePourCommandeException,
  UtilisateurSansSiteException,
} from './commandes.exceptions';
import { CommandeDetail } from './commandes.types';

@Injectable()
export class CommandesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commandeValidationService: CommandeValidationService,
    private readonly commandeStatutService: CommandeStatutService,
  ) {}

  async creer(
    utilisateur: AuthenticatedUser,
    dto: CreateCommandeDto,
  ): Promise<CommandeDetail> {
    if (!utilisateur.site_id) {
      throw new UtilisateurSansSiteException();
    }

    const role = await this.prisma.role.findUnique({
      where: { code: utilisateur.role },
    });
    if (!role) {
      throw new RoleNonAutoriseException();
    }

    if (dto.departement_id) {
      const departement = await this.prisma.departement.findUnique({
        where: { id: dto.departement_id },
      });
      if (!departement || departement.site_id !== utilisateur.site_id) {
        throw new DepartementInvalidePourCommandeException();
      }
    }

    if (dto.service_id) {
      const service = await this.prisma.service.findUnique({
        where: { id: dto.service_id },
        include: { departement: true },
      });
      const serviceValide =
        !!service &&
        service.departement.site_id === utilisateur.site_id &&
        (!dto.departement_id || service.departement_id === dto.departement_id);
      if (!serviceValide) {
        throw new ServiceInvalidePourCommandeException();
      }
    }

    const heureSouhaitee = dto.heure_souhaitee
      ? new Date(dto.heure_souhaitee)
      : null;

    await this.commandeValidationService.validerCommande({
      roleId: role.id,
      siteId: utilisateur.site_id,
      lignes: dto.lignes,
      serviceId: dto.service_id ?? null,
      heureSouhaitee,
      utilisateurId: utilisateur.sub,
    });

    const priorite = this.commandeValidationService.calculerPriorite(
      role.niveau_priorite,
    );

    const produits = await this.prisma.produit.findMany({
      where: { id: { in: dto.lignes.map((l) => l.produit_id) } },
    });

    const commande = await this.prisma.commande.create({
      data: {
        utilisateur_id: utilisateur.sub,
        site_id: utilisateur.site_id,
        departement_id: dto.departement_id ?? null,
        service_id: dto.service_id ?? null,
        lieu_livraison: dto.lieu_livraison ?? null,
        salle: dto.salle ?? null,
        heure_souhaitee: heureSouhaitee,
        commentaire: dto.commentaire ?? null,
        priorite,
        lignes_commande: {
          create: dto.lignes.map((ligne) => ({
            produit_id: ligne.produit_id,
            quantite: ligne.quantite,
            prix_unitaire_snapshot: produits.find(
              (p) => p.id === ligne.produit_id,
            )!.prix_unitaire,
          })),
        },
      },
      include: { lignes_commande: { include: { produit: true } } },
    });

    return this.versCommandeDetail(commande);
  }

  async changerStatut(
    utilisateur: AuthenticatedUser,
    commandeId: string,
    nouveauStatut: StatutCommande,
  ): Promise<CommandeDetail> {
    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      include: {
        lignes_commande: { include: { produit: true } },
        utilisateur: { select: { role_id: true } },
      },
    });

    if (!commande || commande.site_id !== utilisateur.site_id) {
      throw new CommandeIntrouvableException();
    }

    const commandeMiseAJour = await this.commandeStatutService.changerStatut(
      commande,
      nouveauStatut,
      utilisateur.sub,
    );

    return this.versCommandeDetail(commandeMiseAJour);
  }

  async obtenirParId(
    utilisateur: AuthenticatedUser,
    commandeId: string,
  ): Promise<CommandeDetail> {
    const commande = await this.prisma.commande.findUnique({
      where: { id: commandeId },
      include: { lignes_commande: { include: { produit: true } } },
    });

    // Scopé au demandeur (comme listerMesCommandes) : un Employé ne consulte
    // que le suivi de ses propres commandes. 404 plutôt que 403 — ne pas
    // confirmer l'existence d'une commande d'un autre utilisateur.
    if (!commande || commande.utilisateur_id !== utilisateur.sub) {
      throw new CommandeIntrouvableException();
    }

    return this.versCommandeDetail(commande);
  }

  async listerMesCommandes(
    utilisateur: AuthenticatedUser,
  ): Promise<CommandeDetail[]> {
    const commandes = await this.prisma.commande.findMany({
      where: { utilisateur_id: utilisateur.sub },
      include: { lignes_commande: { include: { produit: true } } },
      orderBy: { created_at: 'desc' },
    });

    return commandes.map((commande) => this.versCommandeDetail(commande));
  }

  private versCommandeDetail(commande: {
    id: string;
    statut: string;
    priorite: number;
    site_id: string;
    departement_id: string | null;
    service_id: string | null;
    lieu_livraison: string | null;
    salle: string | null;
    heure_souhaitee: Date | null;
    commentaire: string | null;
    created_at: Date;
    lignes_commande: {
      id: string;
      produit_id: string;
      quantite: { toNumber(): number };
      prix_unitaire_snapshot: { toNumber(): number };
      produit: { nom_ar: string; nom_en: string };
    }[];
  }): CommandeDetail {
    return {
      id: commande.id,
      statut: commande.statut,
      priorite: commande.priorite,
      site_id: commande.site_id,
      departement_id: commande.departement_id,
      service_id: commande.service_id,
      lieu_livraison: commande.lieu_livraison,
      salle: commande.salle,
      heure_souhaitee: commande.heure_souhaitee,
      commentaire: commande.commentaire,
      created_at: commande.created_at,
      lignes: commande.lignes_commande.map((ligne) => ({
        id: ligne.id,
        produit_id: ligne.produit_id,
        nom_ar: ligne.produit.nom_ar,
        nom_en: ligne.produit.nom_en,
        quantite: ligne.quantite.toNumber(),
        prix_unitaire_snapshot: ligne.prix_unitaire_snapshot.toNumber(),
      })),
    };
  }
}
