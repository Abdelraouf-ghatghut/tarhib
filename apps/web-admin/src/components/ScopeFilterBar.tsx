import type { CSSProperties } from "react";
import { Select, Space } from "antd";
import { BankOutlined, BranchesOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { useScope } from "../contexts/ScopeContext";
import { companiesApi, branchesApi } from "../lib/api";
import { bilingualName } from "../lib/bilingualName";

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
}

/**
 * Filtres Société / Branche liés au ScopeContext. Retirés du header global :
 * chaque page où le filtrage par entreprise a du sens affiche cette barre.
 * Le sélecteur de société n'apparaît que pour le superadmin (les autres sont
 * déjà cantonnés à leur société).
 */
export function ScopeFilterBar({
  showBranch = true,
  style,
}: {
  showBranch?: boolean;
  style?: CSSProperties;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const { hasPermission } = useAuth();
  const { companyId, branchId, setCompanyId, setBranchId } = useScope();

  // Aligné sur le guard backend de GET /companies : la permission suffit,
  // pas besoin d'être superadmin
  const canPickCompany = hasPermission("company.manage");

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
    enabled: canPickCompany,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: () => branchesApi.list(companyId ?? undefined).then((r) => r.data as NamedEntity[]),
    enabled: !!companyId && showBranch,
  });

  const label = (e: NamedEntity) => bilingualName(e.nameAr, e.nameEn, isAr);

  if (!canPickCompany && !showBranch) return null;

  return (
    <Space wrap style={{ marginBlockEnd: 16, ...style }}>
      {canPickCompany && (
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          prefix={<BankOutlined style={{ color: "var(--fg-body-subtle)" }} />}
          placeholder={t("allCompanies")}
          style={{ minInlineSize: 200 }}
          value={companyId ?? undefined}
          onChange={(v: string | undefined) => setCompanyId(v ?? null)}
          options={companies.map((c) => ({ value: c.id, label: label(c) }))}
        />
      )}
      {showBranch && (
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          prefix={<BranchesOutlined style={{ color: "var(--fg-body-subtle)" }} />}
          placeholder={t("allBranches")}
          style={{ minInlineSize: 200 }}
          value={branchId ?? undefined}
          onChange={(v: string | undefined) => setBranchId(v ?? null)}
          options={branches.map((b) => ({ value: b.id, label: label(b) }))}
          disabled={!companyId}
        />
      )}
    </Space>
  );
}
