-- ============================================================
-- Tarhib — seed de test complet
-- Idempotent : ON CONFLICT DO NOTHING sur toutes les inserts
-- ============================================================

-- ── 1. Société ───────────────────────────────────────────────
INSERT INTO companies (id, name, slug, active)
VALUES ('11111111-0000-0000-0000-000000000001', 'Acme Corp', 'acme-corp', true)
ON CONFLICT DO NOTHING;

-- ── 2. Branche ───────────────────────────────────────────────
INSERT INTO branches (id, company_id, name_ar, name_en, active)
VALUES ('22222222-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000001',
        'المقر الرئيسي - الجزائر', 'Alger HQ', true)
ON CONFLICT DO NOTHING;

-- ── 3. Départements ──────────────────────────────────────────
INSERT INTO departments (id, company_id, branch_id, name_ar, name_en, active)
VALUES
  ('33333333-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   'قسم تقنية المعلومات', 'IT Department', true),
  ('33333333-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   'الإدارة العامة', 'General Management', true)
ON CONFLICT DO NOTHING;

-- ── 4. Employés de test ───────────────────────────────────────
-- Les keycloak_id correspondent aux user id du realm keycloak/tarhib-realm.json
INSERT INTO employees (id, keycloak_id, company_id, branch_id, department_id,
                       first_name_ar, first_name_en, last_name_ar, last_name_en,
                       email, phone_number, role, scope, active)
VALUES
  -- Sarah : employée normale, quotas généreux
  ('55555501-0000-4000-8000-000000000001',
   '00000001-0000-4000-8000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   '33333333-0000-0000-0000-000000000001',
   'سارة', 'Sarah', 'بنعلي', 'Benali',
   'sarah@acme.com', '+213600000001', 'EMPLOYEE', 'CLIENT', true),

  -- Omar : employée avec quotas serrés (pour tester rejet de quota)
  ('55555502-0000-4000-8000-000000000002',
   '00000002-0000-4000-8000-000000000002',
   '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   '33333333-0000-0000-0000-000000000001',
   'عمر', 'Omar', 'شريف', 'Cherif',
   'omar@acme.com', '+213600000002', 'EMPLOYEE', 'CLIENT', true),

  -- Yassine : agent d'hospitalité Tarhib (scope TARHIB = staff interne)
  ('55555503-0000-4000-8000-000000000003',
   '00000003-0000-4000-8000-000000000003',
   '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   '33333333-0000-0000-0000-000000000001',
   'ياسين', 'Yassine', 'عجنتلي', 'Agentali',
   'yassine@acme.com', '+213600000003', 'HOSPITALITY_AGENT', 'TARHIB', true),

  -- Karim : manager de département côté client
  ('55555504-0000-4000-8000-000000000004',
   '00000004-0000-4000-8000-000000000004',
   '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   '33333333-0000-0000-0000-000000000002',
   'كريم', 'Karim', 'مناجيري', 'Manageri',
   'karim@acme.com', '+213600000004', 'DEPARTMENT_MANAGER', 'CLIENT', true),

  -- Abdelraouf : développeur (ancien seed — conservé pour compatibilité)
  ('44444444-0000-0000-0000-000000000001',
   '3811af1b-9c1b-4472-ad94-5b914d02ff5e',
   '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   '33333333-0000-0000-0000-000000000001',
   'عبد الرؤوف', 'Abdelraouf', 'غتغوت', 'Ghatghut',
   'test@test.test', '+213600000000', 'EMPLOYEE', 'CLIENT', true),

  -- Admin Tarhib : superadmin pour le portail web admin
  ('55555510-0000-0000-0000-000000000001',
   '7bd2a70b-7a18-4f95-a7ae-a6ea3063afd1',
   '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   '33333333-0000-0000-0000-000000000001',
   'مدير النظام', 'Admin',
   'طرهيب', 'Tarhib',
   'admin@tarhib.com', '+21399900001', 'ADMIN', 'TARHIB', true)
ON CONFLICT DO NOTHING;

-- ── 5. Produits ───────────────────────────────────────────────
INSERT INTO products (id, name_ar, name_en, category, type, allowed_roles, active) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'قهوة عربية',       'Arabic Coffee',     'Cafe',     'COMMANDABLE', 'EMPLOYEE,DEPARTMENT_MANAGER', true),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'اسبريسو',           'Espresso',          'Cafe',     'COMMANDABLE', 'EMPLOYEE,DEPARTMENT_MANAGER', true),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'شاي بالنعناع',     'Mint Tea',          'Boissons', 'COMMANDABLE', 'EMPLOYEE,DEPARTMENT_MANAGER', true),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'عصير برتقال',      'Orange Juice',      'Boissons', 'COMMANDABLE', 'EMPLOYEE,DEPARTMENT_MANAGER', true),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'مياه معدنية',      'Mineral Water',     'Boissons', 'COMMANDABLE', 'EMPLOYEE,DEPARTMENT_MANAGER', true),
  ('aaaaaaaa-0000-0000-0000-000000000006', 'بسكويت شوكولاتة',  'Chocolate Cookie',  'Snacks',   'COMMANDABLE', 'EMPLOYEE,DEPARTMENT_MANAGER', true),
  ('aaaaaaaa-0000-0000-0000-000000000007', 'تمر',               'Dates',             'Snacks',   'COMMANDABLE', 'EMPLOYEE,DEPARTMENT_MANAGER', true),
  ('aaaaaaaa-0000-0000-0000-000000000008', 'لوز محمص',         'Roasted Almonds',   'Snacks',   'COMMANDABLE', 'EMPLOYEE,DEPARTMENT_MANAGER', true),
  ('aaaaaaaa-0000-0000-0000-000000000009', 'ساندويش دجاج',     'Chicken Sandwich',  'Repas',    'COMMANDABLE', 'EMPLOYEE,DEPARTMENT_MANAGER', true),
  ('aaaaaaaa-0000-0000-0000-000000000010', 'سلطة خضراء',       'Green Salad',       'Repas',    'COMMANDABLE', 'EMPLOYEE,DEPARTMENT_MANAGER', true),
  ('aaaaaaaa-0000-0000-0000-000000000011', 'كيك الشوكولاتة',   'Chocolate Cake',    'Desserts', 'COMMANDABLE', 'EMPLOYEE,DEPARTMENT_MANAGER', true),
  ('aaaaaaaa-0000-0000-0000-000000000012', 'فواكه موسمية',     'Seasonal Fruits',   'Desserts', 'COMMANDABLE', 'EMPLOYEE,DEPARTMENT_MANAGER', true)
ON CONFLICT DO NOTHING;

-- ── 6. Inventaire (stock branche) ────────────────────────────
INSERT INTO inventory_items (id, company_id, branch_id, product_id, quantity, min_threshold, max_threshold) VALUES
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 50, 5, 100),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 30, 5,  60),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 40, 5,  80),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', 25, 3,  50),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000005',  2, 10, 200),  -- ⚠ stock bas
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000006', 60, 5, 120),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000007', 80, 5, 150),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000008', 45, 5,  90),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000009', 20, 2,  40),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000010', 15, 2,  30),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000011', 12, 2,  24),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000012',  8, 2,  20)
ON CONFLICT DO NOTHING;

-- ── 7. Quotas (semaine courante) ──────────────────────────────
-- Sarah : quotas généreux, consommation normale
INSERT INTO quotas (id, employee_id, product_id, company_id, period_start, period_end, max_quantity, used_quantity)
VALUES
  (gen_random_uuid(), '55555501-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   date_trunc('week', CURRENT_DATE)::date,
   (date_trunc('week', CURRENT_DATE) + interval '6 days')::date, 10, 3),
  (gen_random_uuid(), '55555501-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000001',
   date_trunc('week', CURRENT_DATE)::date,
   (date_trunc('week', CURRENT_DATE) + interval '6 days')::date, 10, 2),
  (gen_random_uuid(), '55555501-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003',
   '11111111-0000-0000-0000-000000000001',
   date_trunc('week', CURRENT_DATE)::date,
   (date_trunc('week', CURRENT_DATE) + interval '6 days')::date, 14, 4),
  (gen_random_uuid(), '55555501-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000009',
   '11111111-0000-0000-0000-000000000001',
   date_trunc('week', CURRENT_DATE)::date,
   (date_trunc('week', CURRENT_DATE) + interval '6 days')::date, 5, 1)
ON CONFLICT DO NOTHING;

-- Omar : quotas serrés — café presque épuisé, snacks épuisés
INSERT INTO quotas (id, employee_id, product_id, company_id, period_start, period_end, max_quantity, used_quantity)
VALUES
  -- Café : max 3, déjà consommé 2 → il reste 1 (facile à épuiser)
  (gen_random_uuid(), '55555502-0000-4000-8000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   date_trunc('week', CURRENT_DATE)::date,
   (date_trunc('week', CURRENT_DATE) + interval '6 days')::date, 3, 2),
  -- Espresso : max 2, déjà consommé 2 → quota ÉPUISÉ
  (gen_random_uuid(), '55555502-0000-4000-8000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000001',
   date_trunc('week', CURRENT_DATE)::date,
   (date_trunc('week', CURRENT_DATE) + interval '6 days')::date, 2, 2),
  -- Eau : pas de quota (pas d'entrée) → commande libre
  -- Snack cookie : max 3, consommé 3 → quota ÉPUISÉ
  (gen_random_uuid(), '55555502-0000-4000-8000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000006',
   '11111111-0000-0000-0000-000000000001',
   date_trunc('week', CURRENT_DATE)::date,
   (date_trunc('week', CURRENT_DATE) + interval '6 days')::date, 3, 3),
  -- Sandwich : max 3, consommé 1
  (gen_random_uuid(), '55555502-0000-4000-8000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000009',
   '11111111-0000-0000-0000-000000000001',
   date_trunc('week', CURRENT_DATE)::date,
   (date_trunc('week', CURRENT_DATE) + interval '6 days')::date, 3, 1)
ON CONFLICT DO NOTHING;

-- Karim (manager) : quotas élevés
INSERT INTO quotas (id, employee_id, product_id, company_id, period_start, period_end, max_quantity, used_quantity)
VALUES
  (gen_random_uuid(), '55555504-0000-4000-8000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   date_trunc('week', CURRENT_DATE)::date,
   (date_trunc('week', CURRENT_DATE) + interval '6 days')::date, 20, 5),
  (gen_random_uuid(), '55555504-0000-4000-8000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000009',
   '11111111-0000-0000-0000-000000000001',
   date_trunc('week', CURRENT_DATE)::date,
   (date_trunc('week', CURRENT_DATE) + interval '6 days')::date, 10, 2)
ON CONFLICT DO NOTHING;

-- ── 8. Commandes exemples ────────────────────────────────────
-- Commande 1 : Sarah → PENDING (attente approbation manager)
INSERT INTO orders (id, employee_id, branch_id, company_id, status, priority, sla_deadline, created_at)
VALUES ('cc000001-0000-4000-8000-000000000001',
        '55555501-0000-4000-8000-000000000001',
        '22222222-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000001',
        'PENDING', 'P3',
        NOW() + interval '25 minutes',
        NOW() - interval '5 minutes')
ON CONFLICT DO NOTHING;

INSERT INTO order_lines (id, order_id, product_id, quantity, validation_status) VALUES
  (gen_random_uuid(), 'cc000001-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 2, 'APPROVED'),
  (gen_random_uuid(), 'cc000001-0000-4000-8000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000007', 1, 'APPROVED')
ON CONFLICT DO NOTHING;

-- Commande 2 : Sarah → APPROVED (prête pour l'agent)
INSERT INTO orders (id, employee_id, branch_id, company_id, status, priority, sla_deadline, created_at)
VALUES ('cc000002-0000-4000-8000-000000000002',
        '55555501-0000-4000-8000-000000000001',
        '22222222-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000001',
        'APPROVED', 'P2',
        NOW() + interval '15 minutes',
        NOW() - interval '3 minutes')
ON CONFLICT DO NOTHING;

INSERT INTO order_lines (id, order_id, product_id, quantity, validation_status) VALUES
  (gen_random_uuid(), 'cc000002-0000-4000-8000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 1, 'APPROVED'),
  (gen_random_uuid(), 'cc000002-0000-4000-8000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000005', 2, 'APPROVED')
ON CONFLICT DO NOTHING;

-- Commande 3 : Omar → IN_PROGRESS (agent en route)
INSERT INTO orders (id, employee_id, branch_id, company_id, status, priority, sla_deadline, created_at)
VALUES ('cc000003-0000-4000-8000-000000000003',
        '55555502-0000-4000-8000-000000000002',
        '22222222-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000001',
        'IN_PROGRESS', 'P3',
        NOW() + interval '8 minutes',
        NOW() - interval '12 minutes')
ON CONFLICT DO NOTHING;

INSERT INTO order_lines (id, order_id, product_id, quantity, validation_status) VALUES
  (gen_random_uuid(), 'cc000003-0000-4000-8000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003', 1, 'APPROVED'),
  (gen_random_uuid(), 'cc000003-0000-4000-8000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000009', 1, 'APPROVED')
ON CONFLICT DO NOTHING;

-- Commande 4 : Sarah → DELIVERED (livrée hier, pour tester "recommander")
INSERT INTO orders (id, employee_id, branch_id, company_id, status, priority, sla_deadline, created_at)
VALUES ('cc000004-0000-4000-8000-000000000004',
        '55555501-0000-4000-8000-000000000001',
        '22222222-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000001',
        'DELIVERED', 'P4',
        NOW() - interval '20 hours',
        NOW() - interval '22 hours')
ON CONFLICT DO NOTHING;

INSERT INTO order_lines (id, order_id, product_id, quantity, validation_status) VALUES
  (gen_random_uuid(), 'cc000004-0000-4000-8000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 1, 'APPROVED'),
  (gen_random_uuid(), 'cc000004-0000-4000-8000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000010', 1, 'APPROVED')
ON CONFLICT DO NOTHING;

-- Commande 5 : Omar → REJECTED (quota épuisé sur espresso)
INSERT INTO orders (id, employee_id, branch_id, company_id, status, priority, sla_deadline, created_at)
VALUES ('cc000005-0000-4000-8000-000000000005',
        '55555502-0000-4000-8000-000000000002',
        '22222222-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000001',
        'REJECTED', 'P5',
        NOW() - interval '3 hours',
        NOW() - interval '4 hours')
ON CONFLICT DO NOTHING;

INSERT INTO order_lines (id, order_id, product_id, quantity, validation_status, rejection_reason) VALUES
  (gen_random_uuid(), 'cc000005-0000-4000-8000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000002', 3,
   'REJECTED', 'QUOTA_EXCEEDED')
ON CONFLICT DO NOTHING;

-- Commande 6 : Karim (manager) → PENDING (priorité P1 — VIP)
INSERT INTO orders (id, employee_id, branch_id, company_id, status, priority, sla_deadline, created_at)
VALUES ('cc000006-0000-4000-8000-000000000006',
        '55555504-0000-4000-8000-000000000004',
        '22222222-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000001',
        'PENDING', 'P1',
        NOW() + interval '10 minutes',
        NOW() - interval '2 minutes')
ON CONFLICT DO NOTHING;

INSERT INTO order_lines (id, order_id, product_id, quantity, validation_status) VALUES
  (gen_random_uuid(), 'cc000006-0000-4000-8000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 2, 'APPROVED'),
  (gen_random_uuid(), 'cc000006-0000-4000-8000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000011', 1, 'APPROVED')
ON CONFLICT DO NOTHING;

-- Commande 7 : Sarah → APPROVED (dans la file agent, urgente P1)
INSERT INTO orders (id, employee_id, branch_id, company_id, status, priority, sla_deadline, created_at)
VALUES ('cc000007-0000-4000-8000-000000000007',
        '55555501-0000-4000-8000-000000000001',
        '22222222-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000001',
        'APPROVED', 'P1',
        NOW() + interval '5 minutes',
        NOW() - interval '1 minute')
ON CONFLICT DO NOTHING;

INSERT INTO order_lines (id, order_id, product_id, quantity, validation_status) VALUES
  (gen_random_uuid(), 'cc000007-0000-4000-8000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000009', 1, 'APPROVED'),
  (gen_random_uuid(), 'cc000007-0000-4000-8000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000004', 1, 'APPROVED')
ON CONFLICT DO NOTHING;

-- ── 9. Salles de réunion ──────────────────────────────────────
INSERT INTO meeting_rooms (id, company_id, branch_id, name_ar, name_en, capacity, amenities, active)
VALUES
  ('dd000001-0000-4000-8000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   'قاعة الاجتماعات - الطابق الأول', 'Board Room - Floor 1',
   12, '["Projecteur", "Tableau blanc", "Visio", "Climatisation"]', true),

  ('dd000002-0000-4000-8000-000000000002',
   '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   'غرفة المناقشة - A', 'Meeting Room A',
   6, '["Écran TV", "Tableau blanc"]', true),

  ('dd000003-0000-4000-8000-000000000003',
   '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   'غرفة المناقشة - B', 'Meeting Room B',
   4, '["Écran TV"]', true)
ON CONFLICT DO NOTHING;

-- ── 10. Réservation de démo (Karim réunit son équipe à 14h) ──
INSERT INTO room_bookings (id, room_id, employee_id, company_id, start_time, end_time, status)
VALUES
  ('ee000001-0000-4000-8000-000000000001',
   'dd000001-0000-4000-8000-000000000001',
   '55555504-0000-4000-8000-000000000004',
   '11111111-0000-0000-0000-000000000001',
   (CURRENT_DATE + interval '14 hours'),
   (CURRENT_DATE + interval '16 hours'),
   'CONFIRMED')
ON CONFLICT DO NOTHING;
