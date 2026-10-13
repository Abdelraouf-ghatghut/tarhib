// Script de seed pour environnement de développement/test manuel.
// Idempotent (relançable sans dupliquer les données) : `npm run seed`.
// Crée une entreprise/site/département, un rôle EMPLOYE et un rôle AGENT
// avec les permissions utilisées par l'API, un utilisateur de chaque rôle,
// un produit avec stock disponible sur le site, et un quota journalier
// pour pouvoir tester le dashboard Employé sans passer par le Web Admin
// (hors périmètre MVP, cf. CLAUDE.md).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const MOT_DE_PASSE_DEMO = 'password123';

async function main() {
  const entreprise =
    (await prisma.entreprise.findFirst({ where: { nom: 'Tarhib Demo' } })) ??
    (await prisma.entreprise.create({ data: { nom: 'Tarhib Demo' } }));

  const site =
    (await prisma.site.findFirst({
      where: { entreprise_id: entreprise.id, nom: 'Siège' },
    })) ??
    (await prisma.site.create({
      data: { entreprise_id: entreprise.id, nom: 'Siège' },
    }));

  const departement =
    (await prisma.departement.findFirst({
      where: { site_id: site.id, nom: 'Direction' },
    })) ??
    (await prisma.departement.create({
      data: { site_id: site.id, nom: 'Direction' },
    }));

  const roleEmploye = await prisma.role.upsert({
    where: { code: 'EMPLOYE' },
    update: {},
    create: { code: 'EMPLOYE', nom: 'Employé', niveau_priorite: 4 },
  });

  const roleAgent = await prisma.role.upsert({
    where: { code: 'AGENT' },
    update: {},
    create: { code: 'AGENT', nom: "Agent d'hospitalité", niveau_priorite: 2 },
  });

  const codesPermissions = [
    'COMMANDE_CREER',
    'COMMANDE_GERER_STATUT',
    'UTILISATEUR_CREER',
    'UTILISATEUR_LISTER',
    'UTILISATEUR_MODIFIER',
    'UTILISATEUR_DESACTIVER',
  ];
  const permissions = new Map<string, string>();
  for (const code of codesPermissions) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code },
    });
    permissions.set(code, permission.id);
  }

  async function accorder(roleId: string, codes: string[]) {
    for (const code of codes) {
      await prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: {
            role_id: roleId,
            permission_id: permissions.get(code)!,
          },
        },
        update: {},
        create: { role_id: roleId, permission_id: permissions.get(code)! },
      });
    }
  }

  await accorder(roleEmploye.id, ['COMMANDE_CREER']);
  // L'Agent reçoit aussi les permissions UTILISATEUR_* : pas réaliste pour
  // la production (pas de notion d'admin dans le schéma MVP), mais pratique
  // ici pour pouvoir tester manuellement le CRUD utilisateurs sans Web Admin.
  await accorder(roleAgent.id, [
    'COMMANDE_GERER_STATUT',
    'UTILISATEUR_CREER',
    'UTILISATEUR_LISTER',
    'UTILISATEUR_MODIFIER',
    'UTILISATEUR_DESACTIVER',
  ]);

  const mot_de_passe_hash = await bcrypt.hash(MOT_DE_PASSE_DEMO, 12);

  await prisma.utilisateur.upsert({
    where: { email: 'employe@tarhib.ly' },
    update: {},
    create: {
      entreprise_id: entreprise.id,
      site_id: site.id,
      departement_id: departement.id,
      role_id: roleEmploye.id,
      nom: 'Ben Salem',
      prenom: 'Amina',
      email: 'employe@tarhib.ly',
      mot_de_passe_hash,
    },
  });

  await prisma.utilisateur.upsert({
    where: { email: 'agent@tarhib.ly' },
    update: {},
    create: {
      entreprise_id: entreprise.id,
      site_id: site.id,
      departement_id: departement.id,
      role_id: roleAgent.id,
      nom: 'Trabelsi',
      prenom: 'Khaled',
      email: 'agent@tarhib.ly',
      mot_de_passe_hash,
    },
  });

  const categorie = await prisma.categorieProduit.upsert({
    where: { nom_ar: 'مشروبات' },
    update: {},
    create: { nom_ar: 'مشروبات', nom_en: 'Beverages' },
  });

  const produit =
    (await prisma.produit.findFirst({
      where: { nom_en: 'Arabic Coffee' },
    })) ??
    (await prisma.produit.create({
      data: {
        categorie_id: categorie.id,
        nom_ar: 'قهوة عربية',
        nom_en: 'Arabic Coffee',
        unite_mesure: 'tasse',
        prix_unitaire: 2.5,
      },
    }));

  await prisma.produitSite.upsert({
    where: { produit_id_site_id: { produit_id: produit.id, site_id: site.id } },
    update: { disponible: true },
    create: { produit_id: produit.id, site_id: site.id, disponible: true },
  });

  const emplacement =
    (await prisma.emplacementStock.findFirst({
      where: { site_id: site.id, type: 'cuisine' },
    })) ??
    (await prisma.emplacementStock.create({
      data: {
        entreprise_id: entreprise.id,
        site_id: site.id,
        type: 'cuisine',
        nom: 'Cuisine Siège',
      },
    }));

  await prisma.stock.upsert({
    where: {
      emplacement_id_produit_id: {
        emplacement_id: emplacement.id,
        produit_id: produit.id,
      },
    },
    update: { quantite: 100 },
    create: {
      emplacement_id: emplacement.id,
      produit_id: produit.id,
      quantite: 100,
      seuil_minimal: 10,
    },
  });

  const quotaExistant = await prisma.quota.findFirst({
    where: { role_id: roleEmploye.id, produit_id: null, periode: 'jour' },
  });
  if (!quotaExistant) {
    await prisma.quota.create({
      data: {
        role_id: roleEmploye.id,
        produit_id: null,
        periode: 'jour',
        valeur_max: 10,
      },
    });
  }

  console.log('Seed terminé.');
  console.log(`  Employé : employe@tarhib.ly / ${MOT_DE_PASSE_DEMO}`);
  console.log(`  Agent   : agent@tarhib.ly / ${MOT_DE_PASSE_DEMO}`);
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
