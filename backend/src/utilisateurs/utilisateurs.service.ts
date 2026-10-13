import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hashMotDePasse } from '../auth/password.util';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { ListUtilisateursQueryDto } from './dto/list-utilisateurs-query.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import {
  DepartementInvalideException,
  DesactivationDeSoiMemeInterditeException,
  EmailDejaUtiliseException,
  EmailOuTelephoneRequisException,
  RoleInvalideException,
  SiteInvalideException,
  TelephoneDejaUtiliseException,
  UtilisateurIntrouvableException,
} from './utilisateurs.exceptions';
import { ProfilUtilisateur, UtilisateurResume } from './utilisateurs.types';

const INCLUSION_RESUME = {
  entreprise: true,
  site: true,
  departement: true,
  role: true,
} satisfies Prisma.UtilisateurInclude;

type UtilisateurAvecRelationsResume = Prisma.UtilisateurGetPayload<{
  include: typeof INCLUSION_RESUME;
}>;

@Injectable()
export class UtilisateursService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfilComplet(utilisateurId: string): Promise<ProfilUtilisateur> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      include: {
        entreprise: true,
        site: true,
        departement: true,
        role: {
          include: {
            roles_permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!utilisateur) {
      throw new UtilisateurIntrouvableException();
    }

    return {
      id: utilisateur.id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      email: utilisateur.email,
      telephone: utilisateur.telephone,
      actif: utilisateur.actif,
      derniere_connexion: utilisateur.derniere_connexion,
      entreprise: {
        id: utilisateur.entreprise.id,
        nom: utilisateur.entreprise.nom,
      },
      site: utilisateur.site
        ? { id: utilisateur.site.id, nom: utilisateur.site.nom }
        : null,
      departement: utilisateur.departement
        ? { id: utilisateur.departement.id, nom: utilisateur.departement.nom }
        : null,
      role: {
        id: utilisateur.role.id,
        code: utilisateur.role.code,
        nom: utilisateur.role.nom,
        niveau_priorite: utilisateur.role.niveau_priorite,
      },
      permissions: utilisateur.role.roles_permissions.map(
        (rp) => rp.permission.code,
      ),
    };
  }

  async creer(
    acteur: AuthenticatedUser,
    dto: CreateUtilisateurDto,
  ): Promise<UtilisateurResume> {
    if (!dto.email && !dto.telephone) {
      throw new EmailOuTelephoneRequisException();
    }

    await this.validerRole(dto.role_id);
    await this.validerSiteEtDepartement(
      acteur.entreprise_id,
      dto.site_id,
      dto.departement_id,
    );

    const mot_de_passe_hash = await hashMotDePasse(dto.mot_de_passe);

    try {
      const utilisateur = await this.prisma.utilisateur.create({
        data: {
          entreprise_id: acteur.entreprise_id,
          site_id: dto.site_id ?? null,
          departement_id: dto.departement_id ?? null,
          role_id: dto.role_id,
          nom: dto.nom,
          prenom: dto.prenom,
          email: dto.email ?? null,
          telephone: dto.telephone ?? null,
          mot_de_passe_hash,
        },
        include: INCLUSION_RESUME,
      });

      return this.versResume(utilisateur);
    } catch (erreur) {
      throw this.convertirErreurUnicite(erreur);
    }
  }

  async lister(
    acteur: AuthenticatedUser,
    query: ListUtilisateursQueryDto,
  ): Promise<UtilisateurResume[]> {
    const utilisateurs = await this.prisma.utilisateur.findMany({
      where: {
        entreprise_id: acteur.entreprise_id,
        ...(query.actif !== undefined ? { actif: query.actif === 'true' } : {}),
        ...(query.site_id ? { site_id: query.site_id } : {}),
        ...(query.role_code ? { role: { code: query.role_code } } : {}),
      },
      include: INCLUSION_RESUME,
      orderBy: { nom: 'asc' },
    });

    return utilisateurs.map((u) => this.versResume(u));
  }

  async obtenirParId(
    acteur: AuthenticatedUser,
    id: string,
  ): Promise<UtilisateurResume> {
    const utilisateur = await this.trouverDansLEntreprise(
      acteur.entreprise_id,
      id,
    );
    return this.versResume(utilisateur);
  }

  async modifier(
    acteur: AuthenticatedUser,
    id: string,
    dto: UpdateUtilisateurDto,
  ): Promise<UtilisateurResume> {
    const existant = await this.trouverDansLEntreprise(
      acteur.entreprise_id,
      id,
    );

    if (dto.role_id) {
      await this.validerRole(dto.role_id);
    }
    if (dto.site_id !== undefined || dto.departement_id !== undefined) {
      await this.validerSiteEtDepartement(
        acteur.entreprise_id,
        dto.site_id ?? existant.site_id ?? undefined,
        dto.departement_id ?? undefined,
      );
    }

    const data: Prisma.UtilisateurUpdateInput = {
      ...(dto.nom !== undefined ? { nom: dto.nom } : {}),
      ...(dto.prenom !== undefined ? { prenom: dto.prenom } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.telephone !== undefined ? { telephone: dto.telephone } : {}),
      ...(dto.role_id !== undefined
        ? { role: { connect: { id: dto.role_id } } }
        : {}),
      ...(dto.site_id !== undefined
        ? { site: { connect: { id: dto.site_id } } }
        : {}),
      ...(dto.departement_id !== undefined
        ? { departement: { connect: { id: dto.departement_id } } }
        : {}),
      ...(dto.actif !== undefined ? { actif: dto.actif } : {}),
    };

    if (dto.mot_de_passe) {
      data.mot_de_passe_hash = await hashMotDePasse(dto.mot_de_passe);
    }

    const futurEmail = dto.email !== undefined ? dto.email : existant.email;
    const futurTelephone =
      dto.telephone !== undefined ? dto.telephone : existant.telephone;
    if (!futurEmail && !futurTelephone) {
      throw new EmailOuTelephoneRequisException();
    }

    try {
      const utilisateur = await this.prisma.utilisateur.update({
        where: { id },
        data,
        include: INCLUSION_RESUME,
      });

      return this.versResume(utilisateur);
    } catch (erreur) {
      throw this.convertirErreurUnicite(erreur);
    }
  }

  async desactiver(acteur: AuthenticatedUser, id: string): Promise<void> {
    if (id === acteur.sub) {
      throw new DesactivationDeSoiMemeInterditeException();
    }

    await this.trouverDansLEntreprise(acteur.entreprise_id, id);

    await this.prisma.$transaction([
      this.prisma.utilisateur.update({ where: { id }, data: { actif: false } }),
      this.prisma.refreshToken.updateMany({
        where: { utilisateur_id: id, revoque: false },
        data: { revoque: true },
      }),
    ]);
  }

  private async trouverDansLEntreprise(
    entrepriseId: string,
    id: string,
  ): Promise<UtilisateurAvecRelationsResume> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id },
      include: INCLUSION_RESUME,
    });

    if (!utilisateur || utilisateur.entreprise_id !== entrepriseId) {
      throw new UtilisateurIntrouvableException();
    }

    return utilisateur;
  }

  private async validerRole(roleId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new RoleInvalideException();
    }
  }

  private async validerSiteEtDepartement(
    entrepriseId: string,
    siteId: string | undefined,
    departementId: string | undefined,
  ): Promise<void> {
    if (siteId) {
      const site = await this.prisma.site.findUnique({ where: { id: siteId } });
      if (!site || site.entreprise_id !== entrepriseId) {
        throw new SiteInvalideException();
      }
    }

    if (departementId) {
      const departement = await this.prisma.departement.findUnique({
        where: { id: departementId },
        include: { site: true },
      });
      if (!departement || departement.site.entreprise_id !== entrepriseId) {
        throw new DepartementInvalideException();
      }
      if (siteId && departement.site_id !== siteId) {
        throw new DepartementInvalideException();
      }
    }
  }

  private convertirErreurUnicite(erreur: unknown): unknown {
    if (erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === 'P2002') {
      const cibles = this.extraireChampsEnConflit(erreur.meta);
      if (cibles.includes('email')) {
        return new EmailDejaUtiliseException();
      }
      if (cibles.includes('telephone')) {
        return new TelephoneDejaUtiliseException();
      }
    }
    return erreur;
  }

  /**
   * Le driver adapter pg de Prisma 7 n'expose pas `meta.target` comme l'ancien moteur :
   * les champs en conflit sont sous `meta.driverAdapterError.cause.constraint.fields`.
   * On gère les deux formats pour rester robuste à une éventuelle évolution de Prisma.
   */
  private extraireChampsEnConflit(meta: Record<string, unknown> | undefined): string[] {
    if (!meta) {
      return [];
    }
    if (Array.isArray(meta.target)) {
      return meta.target as string[];
    }
    const driverAdapterError = meta.driverAdapterError as { cause?: { constraint?: { fields?: string[] } } } | undefined;
    return driverAdapterError?.cause?.constraint?.fields ?? [];
  }

  private versResume(
    utilisateur: UtilisateurAvecRelationsResume,
  ): UtilisateurResume {
    return {
      id: utilisateur.id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      email: utilisateur.email,
      telephone: utilisateur.telephone,
      actif: utilisateur.actif,
      derniere_connexion: utilisateur.derniere_connexion,
      entreprise: {
        id: utilisateur.entreprise.id,
        nom: utilisateur.entreprise.nom,
      },
      site: utilisateur.site
        ? { id: utilisateur.site.id, nom: utilisateur.site.nom }
        : null,
      departement: utilisateur.departement
        ? { id: utilisateur.departement.id, nom: utilisateur.departement.nom }
        : null,
      role: {
        id: utilisateur.role.id,
        code: utilisateur.role.code,
        nom: utilisateur.role.nom,
      },
    };
  }
}
