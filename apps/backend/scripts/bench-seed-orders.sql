-- Jeu de données synthétique pour PR-1.2 (mesure d'index) — PAS un seed
-- applicatif, jamais exécuté en prod/dev normal. Distribution CONCENTRÉE
-- (5 grosses sociétés × 4 branches, ~24k commandes/société) plutôt
-- qu'uniforme sur 50 sociétés : représente mieux le cas réel où quelques
-- gros clients dominent le volume — sans ça le coût par requête reste
-- trivial (<1ms) et le bénéfice d'un index n'est pas mesurable.

DROP TABLE IF EXISTS bench_branches;
CREATE TEMP TABLE bench_branches AS
SELECT
  row_number() OVER () AS n,
  gen_random_uuid() AS branch_id,
  company_id
FROM (
  SELECT gen_random_uuid() AS company_id
  FROM generate_series(1, 5)
) c
CROSS JOIN generate_series(1, 4);

DROP TABLE IF EXISTS bench_employees;
CREATE TEMP TABLE bench_employees AS
SELECT row_number() OVER () AS n, gen_random_uuid() AS employee_id
FROM generate_series(1, 1000);

DROP TABLE IF EXISTS bench_picks;
CREATE TEMP TABLE bench_picks AS
SELECT
  g,
  1 + floor(random() * 20)::int AS branch_n,
  1 + floor(random() * 1000)::int AS employee_n,
  (ARRAY['DELIVERED','DELIVERED','DELIVERED','DELIVERED','APPROVED','IN_PROGRESS','READY','REJECTED','PENDING'])[1 + floor(random()*9)::int] AS status,
  (ARRAY['P1','P2','P3','P4','P5'])[1 + floor(random()*5)::int] AS priority,
  now() - (random() * interval '60 days') AS created_at
FROM generate_series(1, 120000) g;

INSERT INTO orders (
  id, employee_id, branch_id, company_id, order_number, status, priority,
  sla_deadline, created_at
)
SELECT
  gen_random_uuid(),
  e.employee_id,
  b.branch_id,
  b.company_id,
  row_number() OVER (PARTITION BY b.company_id ORDER BY p.g),
  p.status,
  p.priority,
  p.created_at + interval '1 hour',
  p.created_at
FROM bench_picks p
JOIN bench_branches b ON b.n = p.branch_n
JOIN bench_employees e ON e.n = p.employee_n;

ANALYZE orders;
