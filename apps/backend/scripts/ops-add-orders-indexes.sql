-- PR-1.2 — Index de lecture sur `orders`, mesurés sur jeu synthétique
-- (voir bench-seed-orders.sql). Script d'ops, PAS une migration TypeORM
-- (R2) : CREATE INDEX CONCURRENTLY ne peut pas tourner dans une transaction,
-- or TypeORM exécute chaque migration dans une transaction. À exécuter
-- manuellement en prod (psql direct), hors fenêtre de déploiement bloquante.
--
-- IF NOT EXISTS : script ré-exécutable sans erreur si une passe précédente
-- a déjà créé un des index (ex. reprise après échec partiel).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_company_branch_created
  ON orders (company_id, branch_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_employee_created
  ON orders (employee_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_company_created
  ON orders (company_id, created_at DESC);
