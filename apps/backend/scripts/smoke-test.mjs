/**
 * Smoke test de bout en bout (npm run smoke -w apps/backend) : rejoue les
 * parcours réels du web admin contre l'API en marche (localhost:3000) —
 * création d'employés interne/externe, rôle client avec quotas, doublons.
 * Prérequis : backend démarré + seed exécuté (npm run seed).
 */
const BASE = process.env.API_URL ?? "http://localhost:3000";
const PASSWORD = "Tarhib@2026!";
const ts = Date.now();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "✔" : "✘"} ${label}${ok ? "" : ` — ${detail}`}`);
  if (!ok) failures += 1;
}

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // réponses 204 sans corps
  }
  return { status: res.status, data };
}

// ── 1. Login superadmin ─────────────────────────────────────────────────────
const login = await call("POST", "/auth/login", {
  body: { email: "superadmin@tarhib.app", password: PASSWORD },
});
check(
  "Login superadmin (interne, sans affectation)",
  login.status === 200 && login.data.scope === "TARHIB" && !login.data.companyId,
  `status=${login.status} scope=${login.data?.scope}`,
);
const token = login.data.accessToken;

// ── Référentiel : société démo, branche, département, rôles, produits ──────
const companies = (await call("GET", "/companies", { token })).data;
const demo = companies.find((c) => c.slug === "al-aman-bank") ?? companies[0];
check("Société cliente seedée présente", !!demo, "al-aman-bank introuvable — lancer npm run seed");

if (!demo) process.exit(1);
const branches = (await call("GET", `/branches?companyId=${demo.id}`, { token })).data;
const departments = (
  await call("GET", `/departments?companyId=${demo.id}`, { token })
).data;
const roles = (await call("GET", "/roles", { token })).data;
const tarhibRole = roles.find((r) => r.scope === "TARHIB" && r.nameEn === "Cook");
let clientRole = roles.find(
  (r) => r.scope === "CLIENT" && r.companyId === demo.id && r.nameEn === "Employee",
);
const products = (await call("GET", "/products/admin", { token })).data.filter(
  (p) => p.type === "COMMANDABLE",
);
let temporaryClientRole = null;
if (!clientRole) {
  const created = await call("POST", "/roles", { token, body: { nameAr: `موظف اختبار ${ts}`, nameEn: `Smoke Employee ${ts}`, scope: "CLIENT", companyId: demo.id, slaPriority: "P3" } });
  if (created.status === 201) { clientRole = created.data; temporaryClientRole = created.data; }
}
check("Référentiel chargé (branche/département/rôles/produits)",
  branches.length > 0 && departments.length > 0 && !!tarhibRole && !!clientRole && products.length >= 2,
  `branches=${branches.length} depts=${departments.length} tarhibRole=${!!tarhibRole} clientRole=${!!clientRole} produits=${products.length}`,
);

// ── 2. Employé INTERNE : société+فرع (pas de قسم), rôle interne, mot de passe
const internEmail = `smoke-intern-${ts}@tarhib.app`;
const intern = await call("POST", "/employees", {
  token,
  body: {
    firstNameAr: "دخان", lastNameAr: "داخلي",
    firstNameEn: "Smoke", lastNameEn: "Internal",
    email: internEmail,
    phoneNumber: `+2135${String(ts).slice(-8)}`,
    password: PASSWORD,
    companyId: demo.id,
    branchId: branches[0].id,
    roleId: tarhibRole.id,
    scope: "TARHIB",
    active: true,
  },
});
check(
  "Création employé interne (201, roleId + scope persistés)",
  intern.status === 201 && intern.data.roleId === tarhibRole.id && intern.data.scope === "TARHIB",
  `status=${intern.status} roleId=${intern.data?.roleId} scope=${intern.data?.scope} msg=${JSON.stringify(intern.data?.message ?? "")}`,
);

// Le compte Keycloak doit fonctionner immédiatement
const internLogin = await call("POST", "/auth/login", {
  body: { email: internEmail, password: PASSWORD },
});
check(
  "Login du nouvel employé interne (compte Keycloak créé)",
  internLogin.status === 200 && internLogin.data.role === tarhibRole.nameEn,
  `status=${internLogin.status} role=${internLogin.data?.role}`,
);

// ── 3. Doublon d'email → 409 propre (plus de 500) ──────────────────────────
const dup = await call("POST", "/employees", {
  token,
  body: {
    firstNameAr: "م", lastNameAr: "كرر", firstNameEn: "Dup", lastNameEn: "Email",
    email: internEmail,
    phoneNumber: `+2136${String(ts).slice(-8)}`,
    scope: "TARHIB",
  },
});
check("Email en double → 409 Conflict (pas de 500)", dup.status === 409, `status=${dup.status}`);

// ── 4. Employé EXTERNE : société+فرع+قسم + rôle client de la société ───────
const externEmail = `smoke-extern-${ts}@al-aman-bank.dz`;
const extern = await call("POST", "/employees", {
  token,
  body: {
    firstNameAr: "دخان", lastNameAr: "خارجي",
    firstNameEn: "Smoke", lastNameEn: "External",
    email: externEmail,
    phoneNumber: `+2137${String(ts).slice(-8)}`,
    password: PASSWORD,
    companyId: demo.id,
    branchId: branches[0].id,
    departmentId: departments[0].id,
    roleId: clientRole.id,
    scope: "CLIENT",
  },
});
check(
  "Création employé externe (201, roleId présent dans la réponse)",
  extern.status === 201 && extern.data.roleId === clientRole.id && extern.data.scope === "CLIENT",
  `status=${extern.status} roleId=${extern.data?.roleId} scope=${extern.data?.scope}`,
);

// ── 5. Rôle client avec quotas sur des produits seedés ─────────────────────
const roleWithQuotas = await call("POST", "/roles", {
  token,
  body: {
    nameAr: `دور دخان ${ts}`,
    nameEn: `Smoke Role ${ts}`,
    scope: "CLIENT",
    companyId: demo.id,
    slaPriority: "P2",
    quotas: [
      { productId: products[0].id, periodType: "DAILY", maxQuantity: 3 },
      { productId: products[1].id, periodType: "MONTHLY", maxQuantity: 10 },
    ],
  },
});
check(
  "Création rôle client avec 2 quotas (ids produits seedés acceptés)",
  roleWithQuotas.status === 201 &&
    roleWithQuotas.data.quotas?.length === 2 &&
    roleWithQuotas.data.quotasEnabled === true,
  `status=${roleWithQuotas.status} msg=${JSON.stringify(roleWithQuotas.data?.message ?? roleWithQuotas.data).slice(0, 160)}`,
);

// ── 6. Champs optionnels vidés ("") → pas de faux 400 ──────────────────────
const emptyFields = await call("POST", "/employees", {
  token,
  body: {
    firstNameAr: "دخان", lastNameAr: "فارغ", firstNameEn: "Smoke", lastNameEn: "Empty",
    email: `smoke-empty-${ts}@tarhib.app`,
    phoneNumber: `+2138${String(ts).slice(-8)}`,
    companyId: "", branchId: "", departmentId: "", roleId: "",
    scope: "TARHIB",
  },
});
check(
  'Champs "" tolérés partout (création interne sans affectation)',
  emptyFields.status === 201 && emptyFields.data.companyId === null,
  `status=${emptyFields.status}`,
);

// ── Nettoyage ───────────────────────────────────────────────────────────────
if (roleWithQuotas.data?.id) {
  const del = await call("DELETE", `/roles/${roleWithQuotas.data.id}`, { token });
  check("Nettoyage : rôle de test supprimé", del.status === 200 || del.status === 204, `status=${del.status}`);
}
if (temporaryClientRole?.id) await call("DELETE", `/roles/${temporaryClientRole.id}`, { token });
for (const emp of [intern.data, extern.data, emptyFields.data]) {
  if (emp?.id) await call("DELETE", `/employees/${emp.id}`, { token });
}

console.log(failures === 0 ? "\nSMOKE OK — tous les parcours passent" : `\nSMOKE KO — ${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);
