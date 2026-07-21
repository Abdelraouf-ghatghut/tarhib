import { DatePicker, Segmented, Select, Space, Tabs, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import dayjs from "dayjs";
import { useAuth } from "../../hooks/useAuth";
import { bilingualName } from "../../lib/bilingualName";
import { useReportLookups } from "./useReportLookups";
import { OverviewReportTab } from "./tabs/OverviewReportTab";
import { OrdersReportTab } from "./tabs/OrdersReportTab";
import { InventoryReportTab } from "./tabs/InventoryReportTab";
import { QuotasReportTab } from "./tabs/QuotasReportTab";
import { ActivityReportTab } from "./tabs/ActivityReportTab";
import { MeetingRoomsReportTab } from "./tabs/MeetingRoomsReportTab";
import { PurchasingReportTab } from "./tabs/PurchasingReportTab";

const { Title } = Typography;
const { RangePicker } = DatePicker;

type PeriodPreset = "today" | "week" | "month" | "year" | "custom";

function presetRange(preset: PeriodPreset): [string, string] | null {
  const now = dayjs();
  switch (preset) {
    case "today":
      return [now.startOf("day").toISOString(), now.endOf("day").toISOString()];
    case "week":
      return [now.startOf("week").toISOString(), now.endOf("week").toISOString()];
    case "month":
      return [now.startOf("month").toISOString(), now.endOf("month").toISOString()];
    case "year":
      return [now.startOf("year").toISOString(), now.endOf("year").toISOString()];
    default:
      return null;
  }
}

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const { companyId: authCompanyId, isSuperadmin, hasPermission } = useAuth();
  // Achats/valeur de stock : données monétaires, permission dédiée distincte
  // de report.view (§4 CLAUDE.md — filtrage backend, pas seulement UI).
  const canViewCosts = hasPermission("procurement.cost.view") || hasPermission("company.manage");

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("month");
  const [customRange, setCustomRange] = useState<[string, string] | null>(null);
  const dateRange = periodPreset === "custom" ? customRange : presetRange(periodPreset);
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>(
    isSuperadmin ? undefined : (authCompanyId ?? undefined),
  );
  const [filterBranchId, setFilterBranchId] = useState<string | undefined>(undefined);

  const params: Record<string, string> = {
    ...(filterCompanyId ? { companyId: filterCompanyId } : {}),
    ...(filterBranchId ? { branchId: filterBranchId } : {}),
    ...(dateRange ? { from: dateRange[0], to: dateRange[1] } : {}),
  };

  const isAr = i18n.language === "ar";
  const { companies, branches } = useReportLookups(filterCompanyId);

  const filters = (
    <Space wrap style={{ marginBlockEnd: 24 }}>
      {isSuperadmin && (
        <Select
          allowClear
          placeholder={t("filterByCompany")}
          style={{ minWidth: 200 }}
          value={filterCompanyId}
          onChange={(v) => {
            setFilterCompanyId(v);
            setFilterBranchId(undefined);
          }}
          options={companies?.map((c) => ({
            value: c.id,
            label: bilingualName(c.nameAr, c.nameEn, isAr),
          }))}
        />
      )}
      <Select
        allowClear
        placeholder={t("filterByBranch")}
        style={{ minWidth: 180 }}
        value={filterBranchId}
        onChange={setFilterBranchId}
        options={branches?.map((b) => ({
          value: b.id,
          label: bilingualName(b.nameAr, b.nameEn, isAr),
        }))}
        disabled={!filterCompanyId}
      />
      <Segmented
        value={periodPreset}
        onChange={(v) => setPeriodPreset(v as PeriodPreset)}
        options={[
          { label: t("today"), value: "today" },
          { label: t("thisWeek"), value: "week" },
          { label: t("thisMonth"), value: "month" },
          { label: t("thisYear"), value: "year" },
          { label: t("custom"), value: "custom" },
        ]}
      />
      {periodPreset === "custom" && (
        <RangePicker onChange={(_, s) => setCustomRange(s[0] && s[1] ? [s[0], s[1]] : null)} />
      )}
    </Space>
  );

  return (
    <>
      <Title level={4}>{t("reports")}</Title>
      {filters}
      <Tabs
        items={[
          {
            key: "overview",
            label: t("overview"),
            children: (
              <OverviewReportTab
                params={params}
                filterCompanyId={filterCompanyId}
                canViewCosts={canViewCosts}
                isSuperadmin={isSuperadmin}
              />
            ),
          },
          {
            key: "orders",
            label: t("ordersReport"),
            children: <OrdersReportTab params={params} />,
          },
          {
            key: "inventory",
            label: t("inventoryReport"),
            children: (
              <InventoryReportTab
                params={params}
                filterCompanyId={filterCompanyId}
                canViewCosts={canViewCosts}
              />
            ),
          },
          {
            key: "quotas",
            label: t("quotas"),
            children: <QuotasReportTab params={params} filterCompanyId={filterCompanyId} />,
          },
          {
            key: "activity",
            label: t("activityReport"),
            children: <ActivityReportTab params={params} filterCompanyId={filterCompanyId} />,
          },
          {
            key: "meeting-rooms",
            label: t("meetingRoomsReport"),
            children: <MeetingRoomsReportTab params={params} filterCompanyId={filterCompanyId} />,
          },
          ...(canViewCosts
            ? [
                {
                  key: "purchasing",
                  label: t("purchasingReport"),
                  children: (
                    <PurchasingReportTab params={params} filterCompanyId={filterCompanyId} />
                  ),
                },
              ]
            : []),
        ]}
      />
    </>
  );
}
