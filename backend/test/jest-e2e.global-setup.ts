import { config } from 'dotenv';
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Exécuté une seule fois avant l'ensemble des tests e2e : applique les migrations
 * Prisma sur la base de test dédiée (jamais sur la base de dev), pour que la suite
 * soit reproductible sur une base fraîchement créée (ex: CI).
 */
export default function globalSetup() {
  const racineBackend = path.resolve(__dirname, '..');
  config({ path: path.join(racineBackend, '.env.test') });

  execSync('npx prisma migrate deploy --schema prisma/schema.prisma', {
    cwd: racineBackend,
    env: { ...process.env, NODE_OPTIONS: '--use-system-ca' },
    stdio: 'inherit',
  });
}
