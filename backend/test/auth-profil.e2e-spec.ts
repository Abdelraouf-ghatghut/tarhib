import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { creerPrismaClientDeTest } from './utils/prisma-test-client';

describe('Flux login → profil (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;

  const fixtures = {
    entrepriseId: '',
    siteId: '',
    departementId: '',
    roleId: '',
    permissionCode: 'COMMANDE_CREER',
    utilisateurId: '',
    email: 'e2e.profil@test.com',
    motDePasse: 'password123',
  };

  beforeAll(async () => {
    prisma = creerPrismaClientDeTest();

    // Nettoyage défensif si une exécution précédente a échoué avant son afterAll.
    await prisma.utilisateur.deleteMany({ where: { email: fixtures.email } });
    await prisma.entreprise.deleteMany({ where: { nom: 'E2E Profil SA' } });

    const entreprise = await prisma.entreprise.create({
      data: { nom: 'E2E Profil SA' },
    });
    const site = await prisma.site.create({
      data: { entreprise_id: entreprise.id, nom: 'E2E Site' },
    });
    const departement = await prisma.departement.create({
      data: { site_id: site.id, nom: 'E2E Departement' },
    });
    const role = await prisma.role.create({
      data: { code: 'E2E_EMPLOYE', nom: 'E2E Employé', niveau_priorite: 4 },
    });
    const permission = await prisma.permission.create({
      data: { code: fixtures.permissionCode },
    });
    await prisma.rolePermission.create({
      data: { role_id: role.id, permission_id: permission.id },
    });

    const mot_de_passe_hash = await bcrypt.hash(fixtures.motDePasse, 12);
    const utilisateur = await prisma.utilisateur.create({
      data: {
        entreprise_id: entreprise.id,
        site_id: site.id,
        departement_id: departement.id,
        role_id: role.id,
        nom: 'Profil',
        prenom: 'E2E',
        email: fixtures.email,
        mot_de_passe_hash,
      },
    });

    fixtures.entrepriseId = entreprise.id;
    fixtures.siteId = site.id;
    fixtures.departementId = departement.id;
    fixtures.roleId = role.id;
    fixtures.utilisateurId = utilisateur.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: { utilisateur_id: fixtures.utilisateurId },
    });
    await prisma.utilisateur.deleteMany({
      where: { id: fixtures.utilisateurId },
    });
    await prisma.rolePermission.deleteMany({
      where: { role_id: fixtures.roleId },
    });
    await prisma.permission.deleteMany({
      where: { code: fixtures.permissionCode },
    });
    await prisma.role.deleteMany({ where: { id: fixtures.roleId } });
    await prisma.departement.deleteMany({
      where: { id: fixtures.departementId },
    });
    await prisma.site.deleteMany({ where: { id: fixtures.siteId } });
    await prisma.entreprise.deleteMany({
      where: { id: fixtures.entrepriseId },
    });

    await app.close();
    await prisma.$disconnect();
  });

  it('refuse le login avec un mauvais mot de passe', async () => {
    const reponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifiant: fixtures.email,
        mot_de_passe: 'mauvais-mot-de-passe',
      })
      .expect(401);

    expect(reponse.body).toMatchObject({ code: 'AUTH_IDENTIFIANT_INVALIDE' });
  });

  it('refuse GET /users/me sans token', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('refuse GET /users/me avec un token invalide', async () => {
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer un-token-invalide')
      .expect(401);
  });

  it('connecte l’utilisateur puis récupère son profil complet', async () => {
    const reponseLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifiant: fixtures.email, mot_de_passe: fixtures.motDePasse })
      .expect(200);

    const corpsLogin = reponseLogin.body as Record<string, unknown>;
    expect(typeof corpsLogin.access_token).toBe('string');
    expect(typeof corpsLogin.refresh_token).toBe('string');
    const accessToken = corpsLogin.access_token as string;

    const reponseProfil = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const corpsProfil = reponseProfil.body as { permissions: string[] };

    expect(corpsProfil).toMatchObject({
      id: fixtures.utilisateurId,
      nom: 'Profil',
      prenom: 'E2E',
      email: fixtures.email,
      actif: true,
      entreprise: { id: fixtures.entrepriseId, nom: 'E2E Profil SA' },
      site: { id: fixtures.siteId, nom: 'E2E Site' },
      departement: { id: fixtures.departementId, nom: 'E2E Departement' },
      role: { id: fixtures.roleId, code: 'E2E_EMPLOYE' },
    });
    expect(corpsProfil.permissions).toContain(fixtures.permissionCode);
  });
});
