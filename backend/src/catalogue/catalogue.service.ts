import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { ProduitCatalogue } from './catalogue.types';

const INCLUSION_CATALOGUE = {
  categorie: true,
} satisfies Prisma.ProduitInclude;

type ProduitAvecCategorie = Prisma.ProduitGetPayload<{
  include: typeof INCLUSION_CATALOGUE;
}>;

@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalogue(
    utilisateur: AuthenticatedUser,
  ): Promise<ProduitCatalogue[]> {
    // Le catalogue est propre à chaque site (produits_sites) : un utilisateur sans
    // site rattaché n'a pas de catalogue à consulter.
    if (!utilisateur.site_id) {
      return [];
    }

    const role = await this.prisma.role.findUnique({
      where: { code: utilisateur.role },
    });
    if (!role) {
      return [];
    }

    const produits = await this.prisma.produit.findMany({
      where: {
        actif: true,
        produits_sites: {
          some: { site_id: utilisateur.site_id, disponible: true },
        },
        OR: [
          // Aucune entrée dans produits_roles = produit ouvert à tous les rôles.
          { produits_roles: { none: {} } },
          // Sinon, le rôle de l'utilisateur doit figurer explicitement dans les rôles autorisés.
          { produits_roles: { some: { role_id: role.id } } },
        ],
      },
      include: INCLUSION_CATALOGUE,
      orderBy: { nom_ar: 'asc' },
    });

    return produits.map((produit) => this.versProduitCatalogue(produit));
  }

  private versProduitCatalogue(
    produit: ProduitAvecCategorie,
  ): ProduitCatalogue {
    return {
      id: produit.id,
      nom_ar: produit.nom_ar,
      nom_en: produit.nom_en,
      description_ar: produit.description_ar,
      description_en: produit.description_en,
      unite_mesure: produit.unite_mesure,
      prix_unitaire: produit.prix_unitaire.toNumber(),
      image_url: produit.image_url,
      categorie: produit.categorie
        ? {
            id: produit.categorie.id,
            nom_ar: produit.categorie.nom_ar,
            nom_en: produit.categorie.nom_en,
          }
        : null,
    };
  }
}
