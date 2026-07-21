import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, Col, DatePicker, Row, Segmented, Space, Statistic, Typography } from "antd";
import dayjs from "dayjs";
import { financeApi } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type PeriodPreset = "month" | "year" | "custom";

function presetRange(preset: PeriodPreset): [string, string] | null {
  const now = dayjs();
  if (preset === "month")
    return [now.startOf("month").toISOString(), now.endOf("month").toISOString()];
  if (preset === "year")
    return [now.startOf("year").toISOString(), now.endOf("year").toISOString()];
  return null;
}

interface FinanceOverview {
  activeContractsRevenue: number;
  totalExpenses: number;
  totalDebtRemaining: number;
  totalAccountsBalance: number;
  payrollMass: number;
}

export function FinanceOverviewPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  // Masse salariale : donnée sensible, jamais affichée (ni même agrégée dans
  // "Total dépenses") sans ce droit — filtrage déjà appliqué côté backend,
  // ce n'est qu'un affichage cohérent côté UI.
  const canViewSalary = hasPermission("employee.salary.manage") || hasPermission("company.manage");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("month");
  const [customRange, setCustomRange] = useState<[string, string] | null>(null);
  const dateRange = periodPreset === "custom" ? customRange : presetRange(periodPreset);

  const params: Record<string, string> = dateRange ? { from: dateRange[0], to: dateRange[1] } : {};

  const { data, isPending } = useQuery({
    queryKey: ["finance", "overview", params],
    queryFn: () => financeApi.overview(params).then((r) => r.data as FinanceOverview),
  });

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>{t("financeOverview")}</Title>

      <Space wrap style={{ marginBlockEnd: 24 }}>
        <Segmented
          value={periodPreset}
          onChange={(v) => setPeriodPreset(v as PeriodPreset)}
          options={[
            { label: t("thisMonth"), value: "month" },
            { label: t("thisYear"), value: "year" },
            { label: t("custom"), value: "custom" },
          ]}
        />
        {periodPreset === "custom" && (
          <RangePicker onChange={(_, s) => setCustomRange(s[0] && s[1] ? [s[0], s[1]] : null)} />
        )}
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isPending}>
            <Statistic
              title={t("activeContractsRevenue")}
              value={data?.activeContractsRevenue ?? 0}
              precision={2}
              suffix={t("currencyUnit")}
              valueStyle={{ color: "var(--fg-success)" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isPending}>
            <Statistic
              title={t("totalExpenses")}
              value={data?.totalExpenses ?? 0}
              precision={2}
              suffix={t("currencyUnit")}
            />
            {canViewSalary && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("payrollIncludedNote")}
              </Text>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isPending}>
            <Statistic
              title={t("totalDebtRemaining")}
              value={data?.totalDebtRemaining ?? 0}
              precision={2}
              suffix={t("currencyUnit")}
              valueStyle={data?.totalDebtRemaining ? { color: "var(--fg-danger)" } : undefined}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isPending}>
            <Statistic
              title={t("totalAccountsBalance")}
              value={data?.totalAccountsBalance ?? 0}
              precision={2}
              suffix={t("currencyUnit")}
            />
          </Card>
        </Col>
        {canViewSalary && (
          <Col xs={24} sm={12} lg={6}>
            <Card loading={isPending}>
              <Statistic
                title={t("payrollMass")}
                value={data?.payrollMass ?? 0}
                precision={2}
                suffix={t("currencyUnit")}
              />
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}

export default FinanceOverviewPage;
