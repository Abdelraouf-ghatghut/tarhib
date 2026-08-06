/**
 * Seed additionnel — PAS le seed applicatif (scripts/seed-users.ts), jamais
 * exécuté en prod/dev normal. Crée N employés client synthétiques (compte
 * Keycloak réel + ligne employees) répartis sur les branches déjà seedées,
 * pour que loadtest/k6-phase1.js puisse s'authentifier avec un pool réaliste
 * au lieu de réutiliser seulement les 7 employés client du seed normal —
 * ces 7 identités partagées sur 500 VUs surestiment la contention du verrou
 * par employé (LOCK→DECIDE→WRITE, E1) par rapport à un vrai parc.
 *
 * Usage : depuis apps/backend —
 *   npx ts-node -r ./scripts/register-js-ext.js -r tsconfig-paths/register loadtest/seed-loadtest-employees.ts [count]
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { KeycloakService } from '../src/auth/keycloak/keycloak.service';
import {
  Employee,
  EmployeeScope,
  EmployeeStatus,
} from '../src/employees/entities/employee.entity';
import { Role } from '../src/roles/entities/role.entity';

const PASSWORD = 'Tarhib@2026!';
const EMAIL_PREFIX = 'loadtest';
const EMAIL_DOMAIN = 'alwaha-bank.ly';

async function main(): Promise<void> {
  const logger = new Logger('SeedLoadtestEmployees');
  const count = parseInt(process.argv[2] || '80', 10);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });
  const dataSource = app.get(DataSource);
  const employeeRepo = dataSource.getRepository(Employee);
  const roleRepo = dataSource.getRepository(Role);
  const keycloak = app.get(KeycloakService);

  const role = await roleRepo.findOne({ where: { nameEn: 'Bank Officer' } });
  if (!role)
    throw new Error('Role "Bank Officer" not found — run npm run seed first');

  const branches: Array<{ id: string; company_id: string }> =
    await dataSource.query(
      `SELECT id, company_id FROM branches WHERE company_id = (
       SELECT id FROM companies WHERE name_en ILIKE '%waha%' OR name_ar ILIKE '%واحة%' LIMIT 1
     )`,
    );
  if (branches.length === 0)
    throw new Error('No branches found for the bank company');

  logger.log(
    `Seeding ${count} load-test employees across ${branches.length} branches...`,
  );

  let created = 0;
  let reused = 0;
  for (let i = 0; i < count; i++) {
    const email = `${EMAIL_PREFIX}${i}@${EMAIL_DOMAIN}`;
    const existing = await employeeRepo.findOne({ where: { email } });
    if (existing) {
      reused++;
      continue;
    }
    const branch = branches[i % branches.length];

    let keycloakId: string | null = null;
    try {
      keycloakId = await keycloak.createUser(
        email,
        PASSWORD,
        'Loadtest',
        `User${i}`,
      );
    } catch (err) {
      logger.warn(`Keycloak account not created for ${email}: ${String(err)}`);
      continue;
    }

    await employeeRepo.save(
      employeeRepo.create({
        email,
        phoneNumber: `+218-900-${String(i).padStart(6, '0')}`,
        firstNameAr: 'اختبار',
        lastNameAr: `الحمل ${i}`,
        firstNameEn: 'Loadtest',
        lastNameEn: `User${i}`,
        companyId: branch.company_id,
        branchId: branch.id,
        role: role.nameEn ?? 'Bank Officer',
        roleId: role.id,
        scope: EmployeeScope.CLIENT,
        active: true,
        status: EmployeeStatus.ACTIVE,
        keycloakId,
      }),
    );
    created++;
    if (created % 10 === 0) logger.log(`${created}/${count} created...`);
  }

  logger.log(`Done: ${created} created, ${reused} already existed.`);
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
