-- PR-2.2 — requêtes de diagnostic à lancer à la main (psql) pendant un
-- incident ou une revue de perf périodique. Pas un script à exécuter tel
-- quel : copier/coller la section pertinente. Nécessite pg_stat_statements
-- (migration PgStatStatements1782500800000 + shared_preload_libraries côté
-- serveur — voir cette migration pour le détail).

-- ── Requêtes les plus coûteuses en cumulé (candidates à indexer/optimiser) ──
SELECT
  substring(query, 1, 120) AS query_excerpt,
  calls,
  round(total_exec_time::numeric, 1) AS total_ms,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round(max_exec_time::numeric, 1) AS max_ms,
  rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- ── Requêtes les plus lentes en moyenne (au moins 5 appels, pour éviter le
--    bruit d'une requête ponctuelle de migration/maintenance) ──
SELECT
  substring(query, 1, 120) AS query_excerpt,
  calls,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round(max_exec_time::numeric, 1) AS max_ms
FROM pg_stat_statements
WHERE calls >= 5
ORDER BY mean_exec_time DESC
LIMIT 20;

-- ── Remet les compteurs à zéro (après un déploiement, pour repartir propre) ──
-- SELECT pg_stat_statements_reset();

-- ── Sessions actuellement bloquées, et qui les bloque ──
SELECT
  blocked.pid AS blocked_pid,
  blocked.usename AS blocked_user,
  blocked.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.usename AS blocking_user,
  blocking.query AS blocking_query,
  now() - blocked.query_start AS blocked_duration
FROM pg_stat_activity blocked
JOIN pg_locks blocked_locks ON blocked_locks.pid = blocked.pid AND NOT blocked_locks.granted
JOIN pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.pid != blocked_locks.pid
  AND blocking_locks.granted
JOIN pg_stat_activity blocking ON blocking.pid = blocking_locks.pid
ORDER BY blocked_duration DESC;

-- ── Compteur de deadlocks depuis le dernier redémarrage/reset (par base) ──
SELECT datname, deadlocks, conflicts, temp_files, temp_bytes
FROM pg_stat_database
WHERE datname = current_database();

-- ── Connexions actives par état (repère une saturation du pool PR-1.1, max:18) ──
SELECT state, count(*) FROM pg_stat_activity WHERE datname = current_database() GROUP BY state;

-- ── Transactions ouvertes depuis longtemps (candidates à un idle-in-transaction
--    oublié — le pool a idle_in_transaction_session_timeout:10s, ceci ne
--    devrait normalement rien retourner en fonctionnement sain) ──
SELECT pid, usename, state, now() - xact_start AS transaction_age, query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_start ASC
LIMIT 10;
