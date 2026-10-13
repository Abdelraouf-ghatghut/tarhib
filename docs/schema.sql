-- =====================================================================
-- SCHEMA POSTGRESQL — PLATEFORME DE GESTION DES SERVICES D'HOSPITALITE
-- =====================================================================
-- Convention : tables et colonnes en snake_case, clés primaires en UUID,
-- horodatage systématique (created_at / updated_at), suppression logique
-- via colonne "actif" plutôt que DELETE physique sur les tables de
-- référence (entreprise, site, utilisateur, produit...).
--
-- MARCHE DE LANCEMENT : LIBYE.
-- - Encodage : la base doit être créée en UTF8 (`CREATE DATABASE ... ENCODING 'UTF8'`)
--   pour stocker correctement les noms de produits, sites, utilisateurs en arabe.
-- - Devise de référence : Dinar libyen (LYD) — un seul taux/devise pour l'instant,
--   pas de colonne devise dédiée tant qu'aucune autre devise n'est nécessaire.
-- - Téléphone (utilisateurs.telephone) : format attendu +218XXXXXXXXX, validation
--   à faire côté application/API (regex), pas en contrainte CHECK ici pour rester
--   flexible si le format évolue.
-- - Le tri alphabétique de colonnes texte arabe (ex. ORDER BY nom) utilise la
--   collation par défaut de la base ; si un tri linguistique précis est requis,
--   prévoir une collation ICU dédiée (ex. `und-x-icu` ou `ar-x-icu`) au niveau
--   colonne plutôt qu'au niveau base.
-- =====================================================================

-- ---------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- TYPES ENUMERES
-- ---------------------------------------------------------------------
CREATE TYPE statut_commande AS ENUM (
    'en_attente',
    'en_attente_approbation',
    'validee',
    'refusee',
    'en_preparation',
    'en_livraison',
    'livree',
    'annulee'
);

CREATE TYPE type_mouvement_stock AS ENUM (
    'entree',
    'sortie',
    'ajustement'
);

CREATE TYPE type_emplacement_stock AS ENUM (
    'cuisine',
    'stockage_site',
    'entrepot_general'
);

CREATE TYPE type_notification AS ENUM (
    'nouvelle_commande',
    'validation',
    'refus',
    'preparation',
    'livraison',
    'quota_depasse',
    'rupture_stock',
    'reapprovisionnement'
);

CREATE TYPE periode_quota AS ENUM (
    'jour',
    'semaine',
    'mois'
);

CREATE TYPE code_refus_commande AS ENUM (
    'produit_indisponible',
    'stock_insuffisant',
    'quota_depasse',
    'horaire_ferme',
    'role_non_autorise'
);

CREATE TYPE statut_commande_fournisseur AS ENUM (
    'brouillon',
    'envoyee',
    'partiellement_recue',
    'recue',
    'annulee'
);

-- ---------------------------------------------------------------------
-- FONCTION UTILITAIRE : mise à jour automatique de updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 1. ORGANISATION : ENTREPRISE > SITE > DEPARTEMENT > SERVICE
-- =====================================================================

CREATE TABLE entreprises (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom             VARCHAR(150) NOT NULL,
    identifiant_legal VARCHAR(50),            -- ex: SIRET
    adresse         VARCHAR(255),
    actif           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id   UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    nom             VARCHAR(150) NOT NULL,
    adresse         VARCHAR(255),
    actif           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (entreprise_id, nom)
);
CREATE INDEX idx_sites_entreprise ON sites(entreprise_id);

CREATE TABLE departements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    nom             VARCHAR(150) NOT NULL,
    actif           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (site_id, nom)
);
CREATE INDEX idx_departements_site ON departements(site_id);

CREATE TABLE services (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departement_id      UUID NOT NULL REFERENCES departements(id) ON DELETE CASCADE,
    nom                 VARCHAR(150) NOT NULL,
    heure_ouverture      TIME,
    heure_fermeture      TIME,
    actif               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (departement_id, nom)
);
CREATE INDEX idx_services_departement ON services(departement_id);

-- =====================================================================
-- 2. ROLES, PERMISSIONS, UTILISATEURS, AUTHENTIFICATION
-- =====================================================================

CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50) NOT NULL UNIQUE,   -- EMPLOYE, AGENT, RESPONSABLE, ADMIN, VISITEUR
    nom             VARCHAR(100) NOT NULL,
    niveau_priorite SMALLINT NOT NULL DEFAULT 4,    -- 1 = priorité la plus haute (Direction)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(100) NOT NULL UNIQUE,   -- ex: COMMANDE_CREER, STOCK_AJUSTER
    description     VARCHAR(255)
);

CREATE TABLE roles_permissions (
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE utilisateurs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id   UUID NOT NULL REFERENCES entreprises(id) ON DELETE RESTRICT,
    site_id         UUID REFERENCES sites(id) ON DELETE SET NULL,
    departement_id  UUID REFERENCES departements(id) ON DELETE SET NULL,
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    nom             VARCHAR(100) NOT NULL,
    prenom          VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE,
    telephone       VARCHAR(30) UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    actif           BOOLEAN NOT NULL DEFAULT TRUE,
    derniere_connexion TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_identifiant CHECK (email IS NOT NULL OR telephone IS NOT NULL)
);
CREATE INDEX idx_utilisateurs_entreprise ON utilisateurs(entreprise_id);
CREATE INDEX idx_utilisateurs_site ON utilisateurs(site_id);
CREATE INDEX idx_utilisateurs_role ON utilisateurs(role_id);

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id  UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    expire_at       TIMESTAMPTZ NOT NULL,
    revoque         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_utilisateur ON refresh_tokens(utilisateur_id);

-- =====================================================================
-- 3. CATALOGUE PRODUITS
-- =====================================================================

CREATE TABLE categories_produits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom_ar          VARCHAR(100) NOT NULL,
    nom_en          VARCHAR(100) NOT NULL,
    description_ar  VARCHAR(255),
    description_en  VARCHAR(255),
    UNIQUE (nom_ar),
    UNIQUE (nom_en)
);

CREATE TABLE produits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categorie_id    UUID REFERENCES categories_produits(id) ON DELETE SET NULL,
    nom_ar          VARCHAR(150) NOT NULL,
    nom_en          VARCHAR(150) NOT NULL,
    description_ar  VARCHAR(255),
    description_en  VARCHAR(255),
    unite_mesure    VARCHAR(20) NOT NULL DEFAULT 'unite',   -- unite, kg, l, plateau...
    prix_unitaire   NUMERIC(10,2) NOT NULL DEFAULT 0,
    image_url       VARCHAR(255),
    actif           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- nom_en NOT NULL n'empêche pas une chaîne vide/blanche : sans ce CHECK, un produit
    -- sans traduction anglaise passe inaperçu jusqu'au test de l'app (cf. règle bilinguisme).
    CONSTRAINT chk_produits_nom_en_non_vide CHECK (btrim(nom_en) <> '')
);
CREATE INDEX idx_produits_categorie ON produits(categorie_id);

-- Autorisation d'un produit par rôle (ex: "Plateaux VIP" réservé Direction)
CREATE TABLE produits_roles (
    produit_id      UUID NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (produit_id, role_id)
);


-- Disponibilité d'un produit par site (catalogue propre à chaque site)
CREATE TABLE produits_sites (
    produit_id      UUID NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
    site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    disponible      BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (produit_id, site_id)
);

-- =====================================================================
-- 4. STOCKS ET MOUVEMENTS
-- =====================================================================

-- Un emplacement de stock : cuisine ou stockage d'un site, ou entrepôt
-- général (site_id NULL = stock global de l'entreprise).
CREATE TABLE emplacements_stock (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id   UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    site_id         UUID REFERENCES sites(id) ON DELETE CASCADE,
    type            type_emplacement_stock NOT NULL,
    nom             VARCHAR(100) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_site_coherent CHECK (
        (type = 'entrepot_general' AND site_id IS NULL)
        OR (type IN ('cuisine', 'stockage_site') AND site_id IS NOT NULL)
    )
);
CREATE INDEX idx_emplacements_site ON emplacements_stock(site_id);

CREATE TABLE stocks (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emplacement_id              UUID NOT NULL REFERENCES emplacements_stock(id) ON DELETE CASCADE,
    produit_id                  UUID NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
    quantite                    NUMERIC(12,2) NOT NULL DEFAULT 0,
    seuil_minimal                NUMERIC(12,2) NOT NULL DEFAULT 0,
    seuil_reapprovisionnement    NUMERIC(12,2),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (emplacement_id, produit_id),
    CONSTRAINT chk_quantite_positive CHECK (quantite >= 0)
);
CREATE INDEX idx_stocks_produit ON stocks(produit_id);

CREATE TABLE mouvements_stock (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id        UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    type            type_mouvement_stock NOT NULL,
    quantite        NUMERIC(12,2) NOT NULL,
    motif           VARCHAR(255),
    utilisateur_id  UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    commande_id     UUID,                    -- référence ajoutée plus bas via FK différée
    date_mouvement  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mouvements_stock_stock ON mouvements_stock(stock_id);
CREATE INDEX idx_mouvements_stock_date ON mouvements_stock(date_mouvement);

-- =====================================================================
-- 5. QUOTAS
-- =====================================================================

CREATE TABLE quotas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id         UUID REFERENCES roles(id) ON DELETE CASCADE,
    produit_id      UUID REFERENCES produits(id) ON DELETE CASCADE,  -- NULL = quota global toutes catégories
    periode         periode_quota NOT NULL,
    valeur_max      NUMERIC(10,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quotas_consommation (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id      UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    quota_id            UUID NOT NULL REFERENCES quotas(id) ON DELETE CASCADE,
    periode_debut       DATE NOT NULL,
    periode_fin         DATE NOT NULL,
    valeur_consommee    NUMERIC(10,2) NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (utilisateur_id, quota_id, periode_debut)
);
CREATE INDEX idx_quotas_conso_utilisateur ON quotas_consommation(utilisateur_id);

-- =====================================================================
-- 6. COMMANDES
-- =====================================================================

CREATE TABLE commandes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id      UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE RESTRICT,  -- demandeur
    site_id             UUID NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    departement_id      UUID REFERENCES departements(id) ON DELETE SET NULL,
    service_id          UUID REFERENCES services(id) ON DELETE SET NULL,
    lieu_livraison       VARCHAR(150),
    salle               VARCHAR(100),
    heure_souhaitee      TIMESTAMPTZ,
    commentaire         VARCHAR(500),
    statut              statut_commande NOT NULL DEFAULT 'en_attente',
    priorite            SMALLINT NOT NULL DEFAULT 4,
    code_refus           code_refus_commande,   -- traduit côté app (arabe/anglais), jamais de texte ici
    valide_par_id        UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    agent_id             UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,  -- agent d'hospitalité assigné
    date_validation       TIMESTAMPTZ,
    date_preparation      TIMESTAMPTZ,
    date_livraison        TIMESTAMPTZ,
    date_confirmation     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_commandes_utilisateur ON commandes(utilisateur_id);
CREATE INDEX idx_commandes_site ON commandes(site_id);
CREATE INDEX idx_commandes_statut ON commandes(statut);
CREATE INDEX idx_commandes_agent ON commandes(agent_id);

CREATE TABLE lignes_commande (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commande_id             UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
    produit_id              UUID NOT NULL REFERENCES produits(id) ON DELETE RESTRICT,
    quantite                NUMERIC(10,2) NOT NULL CHECK (quantite > 0),
    prix_unitaire_snapshot   NUMERIC(10,2) NOT NULL
);
CREATE INDEX idx_lignes_commande_commande ON lignes_commande(commande_id);
CREATE INDEX idx_lignes_commande_produit ON lignes_commande(produit_id);

-- Ajout de la FK différée mouvements_stock.commande_id maintenant que
-- la table commandes existe.
ALTER TABLE mouvements_stock
    ADD CONSTRAINT fk_mouvements_commande
    FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE SET NULL;

-- =====================================================================
-- 7. FOURNISSEURS ET REAPPROVISIONNEMENT
-- =====================================================================

CREATE TABLE fournisseurs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id   UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    nom             VARCHAR(150) NOT NULL,
    contact         VARCHAR(150),
    email           VARCHAR(150),
    telephone       VARCHAR(30),
    actif           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE commandes_fournisseur (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fournisseur_id      UUID NOT NULL REFERENCES fournisseurs(id) ON DELETE RESTRICT,
    emplacement_id      UUID NOT NULL REFERENCES emplacements_stock(id) ON DELETE RESTRICT,
    statut              statut_commande_fournisseur NOT NULL DEFAULT 'brouillon',
    cree_par_id         UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    date_creation        TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_reception        TIMESTAMPTZ
);

CREATE TABLE lignes_commande_fournisseur (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commande_fournisseur_id      UUID NOT NULL REFERENCES commandes_fournisseur(id) ON DELETE CASCADE,
    produit_id                  UUID NOT NULL REFERENCES produits(id) ON DELETE RESTRICT,
    quantite_commandee           NUMERIC(12,2) NOT NULL CHECK (quantite_commandee > 0),
    quantite_recue               NUMERIC(12,2) NOT NULL DEFAULT 0
);
CREATE INDEX idx_lignes_cf_commande ON lignes_commande_fournisseur(commande_fournisseur_id);

-- =====================================================================
-- 8. NOTIFICATIONS
-- =====================================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id  UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    type            type_notification NOT NULL,   -- détermine le template de traduction côté app (ar/en)
    donnees         JSONB,                        -- paramètres du message (ex: {"produit_id": "...", "quantite": 2})
    commande_id     UUID REFERENCES commandes(id) ON DELETE SET NULL,
    lue             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_utilisateur ON notifications(utilisateur_id, lue);

-- =====================================================================
-- 9. AUDIT ET TRACABILITE
-- =====================================================================

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id  UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,        -- ex: CREATION_COMMANDE, VALIDATION, LIVRAISON
    entite          VARCHAR(100) NOT NULL,        -- ex: commande, produit, stock
    entite_id       UUID,
    valeurs_avant    JSONB,
    valeurs_apres    JSONB,
    adresse_ip       VARCHAR(45),
    user_agent      VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_entite ON audit_logs(entite, entite_id);
CREATE INDEX idx_audit_logs_utilisateur ON audit_logs(utilisateur_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);

-- =====================================================================
-- 10. TRIGGERS updated_at
-- =====================================================================

CREATE TRIGGER trg_entreprises_updated_at BEFORE UPDATE ON entreprises
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_departements_updated_at BEFORE UPDATE ON departements
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_utilisateurs_updated_at BEFORE UPDATE ON utilisateurs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_produits_updated_at BEFORE UPDATE ON produits
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_stocks_updated_at BEFORE UPDATE ON stocks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_quotas_conso_updated_at BEFORE UPDATE ON quotas_consommation
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_commandes_updated_at BEFORE UPDATE ON commandes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- FIN DU SCHEMA
-- =====================================================================