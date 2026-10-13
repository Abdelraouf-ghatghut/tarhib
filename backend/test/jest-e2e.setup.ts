import { config } from 'dotenv';
import * as path from 'path';

// Charge .env.test AVANT que Nest/ConfigModule ne lisent process.env.DATABASE_URL,
// pour que les tests e2e tournent toujours sur la base de test dédiée (jamais sur .env de dev).
config({ path: path.resolve(__dirname, '../.env.test') });
