import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CommandeValidationService } from './commande-validation.service';
import {
  HoraireFermeException,
  ProduitIndisponibleException,
  QuotaDepasseException,
  RoleNonAutoriseException,
  StockInsuffisantException,
} from './commandes.exceptions';

const PRODUIT_ID = '11111111-1111-1111-1111-111111111111';
const SITE_ID = '22222222-2222-2222-2222-222222222222';
const ROLE_ID = '33333333-3333-3333-3333-333333333333';
const AUTRE_ROLE_ID = '44444444-4444-4444-4444-444444444444';
const UTILISATEUR_ID = '55555555-5555-5555-5555-555555555555';
const SERVICE_ID = '66666666-6666-6666-6666-666666666666';

/** Produit disponible, sans restriction de rôle, par défaut — chaque test ne surcharge que ce qu'il teste. */
function produitDisponible(overrides: {
  actif?: boolean;
  produits_sites?: unknown[];
  produits_roles?: unknown[];
}) {
  return {
    id: PRODUIT_ID,
    actif: overrides.actif ?? true,
    produits_sites: overrides.produits_sites ?? [
      { site_id: SITE_ID, disponible: true },
    ],
    produits_roles: overrides.produits_roles ?? [],
  };
}

/** Heure UTC du jour courant, pour fabriquer des bornes d'horaires de service déterministes. */
function heureUtcAujourdhui(heures: number, minutes = 0): Date {
  const reference = new Date();
  return new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate(),
      heures,
      minutes,
    ),
  );
}

/** Capture l'exception levée par `promise` (sans dépendre du global `fail`, absent de jest-circus). */
async function capturerErreur(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (erreur) {
    return erreur;
  }
  throw new Error("Une exception était attendue mais aucune n'a été levée");
}

describe('CommandeValidationService', () => {
  let prisma: {
    produit: { findMany: jest.Mock };
    stock: { findMany: jest.Mock };
    quota: { findMany: jest.Mock };
    quotaConsommation: { findUnique: jest.Mock };
    service: { findUnique: jest.Mock };
  };
  let service: CommandeValidationService;

  beforeEach(() => {
    prisma = {
      produit: { findMany: jest.fn() },
      stock: { findMany: jest.fn() },
      quota: { findMany: jest.fn() },
      quotaConsommation: { findUnique: jest.fn() },
      service: { findUnique: jest.fn() },
    };
    // Valeurs par défaut « tout passe » : chaque test ne surcharge que le mock du refus visé.
    prisma.produit.findMany.mockResolvedValue([produitDisponible({})]);
    prisma.stock.findMany.mockResolvedValue([
      { quantite: new Prisma.Decimal(100) },
    ]);
    prisma.quota.findMany.mockResolvedValue([]);
    prisma.service.findUnique.mockResolvedValue(null);

    service = new CommandeValidationService(prisma as unknown as PrismaService);
  });

  function valider(overrides?: {
    serviceId?: string | null;
    heureSouhaitee?: Date | null;
    quantite?: number;
  }) {
    return service.validerCommande({
      roleId: ROLE_ID,
      siteId: SITE_ID,
      utilisateurId: UTILISATEUR_ID,
      serviceId: overrides?.serviceId ?? null,
      heureSouhaitee: overrides?.heureSouhaitee ?? null,
      lignes: [{ produit_id: PRODUIT_ID, quantite: overrides?.quantite ?? 2 }],
    });
  }

  it('valide une commande qui respecte les 5 règles', async () => {
    await expect(valider()).resolves.toBeUndefined();
  });

  it('refuse avec code_refus=produit_indisponible si le produit est inactif ou absent du site', async () => {
    prisma.produit.findMany.mockResolvedValue([
      produitDisponible({ actif: false }),
    ]);

    const erreur = await capturerErreur(valider());

    expect(erreur).toBeInstanceOf(ProduitIndisponibleException);
    expect((erreur as ProduitIndisponibleException).getResponse()).toEqual({
      code_refus: 'produit_indisponible',
    });
  });

  it('refuse avec code_refus=stock_insuffisant si la quantité demandée dépasse le stock du site', async () => {
    prisma.stock.findMany.mockResolvedValue([
      { quantite: new Prisma.Decimal(1) },
    ]);

    const erreur = await capturerErreur(valider({ quantite: 5 }));

    expect(erreur).toBeInstanceOf(StockInsuffisantException);
    expect((erreur as StockInsuffisantException).getResponse()).toEqual({
      code_refus: 'stock_insuffisant',
    });
  });

  it('refuse avec code_refus=quota_depasse si la consommation cumulée dépasse le plafond du rôle', async () => {
    prisma.quota.findMany.mockResolvedValue([
      {
        id: 'quota-1',
        role_id: ROLE_ID,
        produit_id: null,
        periode: 'jour',
        valeur_max: new Prisma.Decimal(5),
      },
    ]);
    prisma.quotaConsommation.findUnique.mockResolvedValue({
      valeur_consommee: new Prisma.Decimal(3),
    });

    // 3 déjà consommés + 5 commandés > 5 (valeur_max)
    const erreur = await capturerErreur(valider({ quantite: 5 }));

    expect(erreur).toBeInstanceOf(QuotaDepasseException);
    expect((erreur as QuotaDepasseException).getResponse()).toEqual({
      code_refus: 'quota_depasse',
    });
  });

  it('refuse avec code_refus=horaire_ferme si heure_souhaitee est hors des horaires du service', async () => {
    prisma.service.findUnique.mockResolvedValue({
      id: SERVICE_ID,
      heure_ouverture: heureUtcAujourdhui(8, 0),
      heure_fermeture: heureUtcAujourdhui(17, 0),
    });

    const erreur = await capturerErreur(
      valider({
        serviceId: SERVICE_ID,
        heureSouhaitee: heureUtcAujourdhui(20, 0),
      }),
    );

    expect(erreur).toBeInstanceOf(HoraireFermeException);
    expect((erreur as HoraireFermeException).getResponse()).toEqual({
      code_refus: 'horaire_ferme',
    });
  });

  it("refuse avec code_refus=role_non_autorise si le produit est restreint à d'autres rôles", async () => {
    prisma.produit.findMany.mockResolvedValue([
      produitDisponible({ produits_roles: [{ role_id: AUTRE_ROLE_ID }] }),
    ]);

    const erreur = await capturerErreur(valider());

    expect(erreur).toBeInstanceOf(RoleNonAutoriseException);
    expect((erreur as RoleNonAutoriseException).getResponse()).toEqual({
      code_refus: 'role_non_autorise',
    });
  });
});
