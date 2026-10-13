import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Client Prisma utilisé UNIQUEMENT par les tests e2e pour préparer/nettoyer leurs
 * propres fixtures. À n'utiliser qu'après le chargement de .env.test (cf. jest-e2e.setup.ts),
 * sous peine de pointer vers la base de développement.
 */
export function creerPrismaClientDeTest(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? '';

  // Garde-fou : ce client effectue des suppressions de données dans les tests.
  // S'assurer qu'on ne pointe jamais accidentellement vers la base de développement.
  if (!connectionString.includes('tarhib_test')) {
    throw new Error(
      `DATABASE_URL ne pointe pas vers la base de test (tarhib_test) : "${connectionString}". Arrêt par sécurité.`,
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
