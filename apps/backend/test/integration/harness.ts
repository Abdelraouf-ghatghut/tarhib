import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * Harness de tests d'intégration/concurrence (PR-0.0).
 *
 * Réutilise un VRAI PostgreSQL 16 via DATABASE_URL (service CI, cf. ci.yml, ou
 * une base `tarhib_test` locale) — pas de Testcontainers : la CI fournit déjà
 * le service. Tout passe par du SQL brut (`ds.query`) : le harness reste
 * indépendant des entités TypeORM et prouve le comportement réel de la base
 * sous concurrence (verrous, contraintes, ON CONFLICT), ce que les tests
 * unitaires à repos mockés ne peuvent pas démontrer.
 */

let ds: DataSource | null = null;

export async function getTestDataSource(): Promise<DataSource> {
  if (ds?.isInitialized) return ds;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL requis pour les tests d'intégration (ex. postgresql://tarhib:tarhib_dev@localhost:5432/tarhib_test)",
    );
  }
  ds = new DataSource({
    type: 'postgres',
    url,
    synchronize: false,
    logging: false,
    // Les tests de concurrence lancent N opérations simultanées : le pool doit
    // pouvoir ouvrir autant de connexions que de participants à la barrière.
    extra: { max: 30 },
  });
  await ds.initialize();
  return ds;
}

export async function closeTestDataSource(): Promise<void> {
  if (ds?.isInitialized) await ds.destroy();
  ds = null;
}

/** Vide les tables listées (ordre indifférent grâce à CASCADE). */
export async function truncate(
  dataSource: DataSource,
  tables: string[],
): Promise<void> {
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t}"`).join(', ');
  await dataSource.query(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

/**
 * Barrière de synchronisation : chaque participant appelle `await arrive()`.
 * Quand les N participants sont arrivés, ils repartent TOUS ensemble — ce qui
 * maximise la contention réelle et expose les courses que des appels
 * séquentiels masqueraient.
 */
export function makeBarrier(n: number): () => Promise<void> {
  let arrived = 0;
  let open!: () => void;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  return async function arrive(): Promise<void> {
    arrived += 1;
    if (arrived >= n) open();
    await gate;
  };
}

/** Lance `task` (indexé 0..n-1) n fois, toutes relâchées ensemble par la barrière. */
export async function runConcurrently<T>(
  n: number,
  task: (index: number) => Promise<T>,
): Promise<Array<{ ok: true; value: T } | { ok: false; error: unknown }>> {
  const arrive = makeBarrier(n);
  return Promise.all(
    Array.from({ length: n }, async (_unused, index) => {
      await arrive();
      try {
        return { ok: true as const, value: await task(index) };
      } catch (error: unknown) {
        return { ok: false as const, error };
      }
    }),
  );
}

/** Lecteur d'état : compte scalaire. */
export async function count(
  dataSource: DataSource,
  sql: string,
  params: unknown[] = [],
): Promise<number> {
  const rows = await dataSource.query<Array<Record<string, unknown>>>(
    sql,
    params,
  );
  const first: Record<string, unknown> = rows[0] ?? {};
  return Number(Object.values(first)[0] ?? 0);
}
