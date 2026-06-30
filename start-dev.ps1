# start-dev.ps1 — Lance la stack Tarhib complète (dev)
# Usage : ./start-dev.ps1  depuis le dossier racine du repo

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

Write-Host ""
Write-Host "  ████████╗ █████╗ ██████╗ ██╗  ██╗██╗██████╗ " -ForegroundColor Cyan
Write-Host "     ██╔══╝██╔══██╗██╔══██╗██║  ██║██║██╔══██╗" -ForegroundColor Cyan
Write-Host "     ██║   ███████║██████╔╝███████║██║██████╔╝" -ForegroundColor Cyan
Write-Host "     ██║   ██╔══██║██╔══██╗██╔══██║██║██╔══██╗" -ForegroundColor Cyan
Write-Host "     ██║   ██║  ██║██║  ██║██║  ██║██║██████╔╝" -ForegroundColor Cyan
Write-Host "     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═════╝ " -ForegroundColor Cyan
Write-Host "     Dev Stack Launcher" -ForegroundColor DarkCyan
Write-Host ""

# ── Étape 1 : Docker Compose ─────────────────────────────────
Write-Host "▶ [1/5] Démarrage des containers Docker..." -ForegroundColor Yellow
Set-Location $root
docker compose up -d
if (-not $?) { Write-Error "docker compose up a échoué. Docker est-il lancé ?" }

# ── Étape 2 : Attendre PostgreSQL ────────────────────────────
Write-Host "▶ [2/5] Attente de PostgreSQL..." -ForegroundColor Yellow
$retries = 0
do {
    Start-Sleep -Seconds 2
    $retries++
    $result = docker exec tarhib-postgres pg_isready -U tarhib 2>&1
} while ($LASTEXITCODE -ne 0 -and $retries -lt 20)

if ($LASTEXITCODE -ne 0) { Write-Error "PostgreSQL n'a pas démarré à temps." }
Write-Host "  ✓ PostgreSQL prêt" -ForegroundColor Green

# ── Étape 3 : Attendre Keycloak ──────────────────────────────
Write-Host "▶ [3/5] Attente de Keycloak (peut prendre 30-60s)..." -ForegroundColor Yellow
$retries = 0
$kcReady = $false
do {
    Start-Sleep -Seconds 3
    $retries++
    try {
        $r = Invoke-WebRequest "http://localhost:8080/realms/tarhib" -UseBasicParsing -TimeoutSec 4 -ErrorAction SilentlyContinue
        if ($r.StatusCode -eq 200) { $kcReady = $true }
    } catch { }
} while (-not $kcReady -and $retries -lt 40)

if (-not $kcReady) {
    Write-Warning "Keycloak n'a pas répondu dans les temps. Vérifiez docker logs tarhib-keycloak"
} else {
    Write-Host "  ✓ Keycloak prêt (realm 'tarhib' importé)" -ForegroundColor Green
}

# ── Étape 4 : Lancer le backend dans une nouvelle fenêtre ────
Write-Host "▶ [4/5] Lancement du backend NestJS..." -ForegroundColor Yellow
$backendPath = Join-Path $root "apps\backend"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Write-Host 'Backend Tarhib' -ForegroundColor Cyan; Set-Location '$backendPath'; npm run start:dev"
)

# Attendre que le backend soit prêt sur :3000
Write-Host "   En attente du backend sur :3000..." -ForegroundColor DarkGray
$retries = 0
$backendReady = $false
do {
    Start-Sleep -Seconds 3
    $retries++
    try {
        $r = Invoke-WebRequest "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        $backendReady = $true
    } catch {
        # 404 ou autre erreur HTTP = le serveur répond
        if ($_.Exception.Response -ne $null) { $backendReady = $true }
    }
} while (-not $backendReady -and $retries -lt 20)

if ($backendReady) {
    Write-Host "  ✓ Backend prêt sur http://localhost:3000" -ForegroundColor Green
} else {
    Write-Warning "Backend pas encore prêt. Le seed sera quand même tenté."
}

# ── Étape 5 : Seed de la base ────────────────────────────────
Write-Host "▶ [5/5] Injection des données de test..." -ForegroundColor Yellow
$seedFile = Join-Path $root "seed.sql"

# Nettoyer les tables avant de seeder (ON CONFLICT DO NOTHING ne met pas à jour les données corrompues)
docker exec tarhib-postgres psql -U tarhib -d tarhib_dev -c @'
TRUNCATE TABLE room_bookings, quotas, employee_quota_usage, role_quotas,
  order_lines, orders, inventory_items, meeting_rooms, employees,
  departments, branches, products, companies CASCADE;
'@

# Copier le fichier dans le container pour préserver l'encodage UTF-8 (CRLF sous Windows corrompt l'arabe)
docker cp $seedFile tarhib-postgres:/tmp/seed.sql
docker exec tarhib-postgres bash -c "PGCLIENTENCODING=UTF8 psql -U tarhib -d tarhib_dev -f /tmp/seed.sql"

Write-Host "  ✓ Seed appliqué (UTF-8 natif via docker cp)" -ForegroundColor Green

# ── Résumé ───────────────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
Write-Host "  ✅  Stack prête !" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  🌐 Backend   : http://localhost:3000"
Write-Host "  🔐 Keycloak  : http://localhost:8080  (admin / tarhibnewapp1234)"
Write-Host "  🗄️  DB        : localhost:5432  (tarhib / tarhib_dev)"
Write-Host ""
Write-Host "  📱 App mobile (dans un autre terminal) :"
Write-Host "     cd apps/mobile"
Write-Host "     flutter run" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🔑 Utilisateurs de test (mot de passe : Test1234! pour tous) :"
Write-Host ""
Write-Host "  App MOBILE CLIENT  : sarah@acme.com / omar@acme.com  (EMPLOYEE)"
Write-Host "  App MOBILE AGENT   : yassine@acme.com               (HOSPITALITY_AGENT)"
Write-Host "  App MOBILE MANAGER : karim@acme.com                 (DEPARTMENT_MANAGER)"
Write-Host "  WEB ADMIN          : admin@tarhib.com               (ADMIN / superadmin)"
Write-Host "    -> username Keycloak pour admin : admin.tarhib" -ForegroundColor DarkGray
Write-Host ""
