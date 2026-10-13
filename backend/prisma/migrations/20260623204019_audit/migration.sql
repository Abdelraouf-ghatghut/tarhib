-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "utilisateur_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entite" VARCHAR(100) NOT NULL,
    "entite_id" UUID,
    "valeurs_avant" JSONB,
    "valeurs_apres" JSONB,
    "adresse_ip" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_audit_logs_entite" ON "audit_logs"("entite", "entite_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_utilisateur" ON "audit_logs"("utilisateur_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_date" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL;
