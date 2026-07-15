import {
  Card,
  Col,
  DatePicker,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import dayjs from "dayjs";
import {
  companiesApi,
  branchesApi,
  reportingApi,
  suppliersApi,
  productsAdminApi,
} from "../../lib/api";

import { useAuth } from "../../hooks/useAuth";
import { bilingualName } from "../../lib/bilingualName";

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

interface OrdersReport {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

interface InventoryReport {
  total: number;
  belowThreshold: number;
  outOfStock: number;
}

interface SlaReport {
  total: number;
  onTime: number;
  late: number;
  complianceRate: number;
}

interface UserActivityReport {
  total: number;
  topEmployees: {
    employeeId: string;
    nameAr: string;
    nameEn: string;
    orderCount: number;
  }[];
  ordersByBranch: {
    branchId: string;
    nameAr: string;
    nameEn: string;
    orderCount: number;
  }[];
}

interface MeetingRoomsReport {
  totalBookings: number;
  confirmed: number;
  cancelled: number;
  cancellationRate: number;
  mostBookedRoomId: string | null;
  avgDurationMinutes: number;
}

interface PurchasingReport {
  totalSpend: number;
  byProductSupplier: Array<{
    productId: string;
    supplierId: string;
    quantity: number;
    totalCost: number;
  }>;
  bySupplier: Array<{ supplierId: string; quantity: number; totalCost: number }>;
  byProduct: Array<{ productId: string; quantity: number; totalCost: number }>;
}

interface InventoryDetailRow {
  productId: string;
  branchId: string;
  zone: string;
  locationName: string | null;
  quantity: number;
  minThreshold: number;
  maxThreshold: number | null;
  unitCost: number | null;
  stockValue: number;
}

interface InventoryDetailReport {
  totalQuantity: number;
  totalStockValue: number;
  byProduct: Array<{ productId: string; quantity: number; stockValue: number }>;
  byProductBranch: Array<{
    productId: string;
    branchId: string;
    quantity: number;
    stockValue: number;
  }>;
  rows: InventoryDetailRow[];
}

interface Company {
  id: string;
  nameAr: string;
  nameEn: string;
}
interface Branch {
  id: string;
  companyId: string;
  nameAr: string;
  nameEn: string;
}
interface Supplier {
  id: string;
  nameAr: string;
  nameEn: string;
}
interface ProductAdmin {
  id: string;
  nameAr: string;
  nameEn: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "orange",
  APPROVED: "blue",
  IN_PROGRESS: "processing",
  DELIVERED: "green",
  REJECTED: "red",
};

const STATUS_KEY: Record<string, string> = {
  PENDING: "pending",
  APPROVED: "approved",
  IN_PROGRESS: "inProgress",
  DELIVERED: "delivered",
  REJECTED: "rejected",
};

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const { companyId: authCompanyId, isSuperadmin } = useAuth();

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("month");
  const [customRange, setCustomRange] = useState<[string, string] | null>(null);
  const dateRange = periodPreset === "custom" ? customRange : presetRange(periodPreset);
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>(
    isSuperadmin ? undefined : (authCompanyId ?? undefined),
  );
  const [filterBranchId, setFilterBranchId] = useState<string | undefined>(undefined);

  const params = {
    ...(filterCompanyId ? { companyId: filterCompanyId } : {}),
    ...(filterBranchId ? { branchId: filterBranchId } : {}),
    ...(dateRange ? { from: dateRange[0], to: dateRange[1] } : {}),
  };

  // Toujours chargées (pas seulement pour les superadmins) : nécessaires
  // pour résoudre nom de branche + société sur les lignes de rapport, quel
  // que soit le filtre société actif.
  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as Company[]),
  });

  const { data: allBranches = [] } = useQuery({
    queryKey: ["branches-all"],
    queryFn: () => branchesApi.list().then((r) => r.data as Branch[]),
  });

  const { data: branches } = useQuery({
    queryKey: ["branches", filterCompanyId],
    queryFn: () => branchesApi.list(filterCompanyId).then((r) => r.data as Branch[]),
    enabled: !!filterCompanyId,
  });

  const { data: ordersData, isPending: loadingOrders } = useQuery({
    queryKey: ["reports", "orders", params],
    queryFn: () =>
      reportingApi.orders(params as Record<string, string>).then((r) => r.data as OrdersReport),
  });

  const { data: slaData, isPending: loadingSla } = useQuery({
    queryKey: ["reports", "sla", params],
    queryFn: () =>
      reportingApi.sla(params as Record<string, string>).then((r) => r.data as SlaReport),
  });

  const { data: inventoryData, isPending: loadingInv } = useQuery({
    queryKey: ["reports", "inventory", params],
    queryFn: () =>
      reportingApi
        .inventory(params as Record<string, string>)
        .then((r) => r.data as InventoryReport),
  });

  // Filtres propres à l'onglet stock — locaux à l'onglet, pour ne pas
  // surcharger la page avec le détail complet par emplacement.
  const [invProductId, setInvProductId] = useState<string | undefined>();
  const [invZone, setInvZone] = useState<string | undefined>();
  const [invBelowThresholdOnly, setInvBelowThresholdOnly] = useState(false);

  const inventoryDetailParams = {
    ...params,
    ...(invProductId ? { productId: invProductId } : {}),
    ...(invZone ? { zone: invZone } : {}),
    ...(invBelowThresholdOnly ? { belowThresholdOnly: "true" } : {}),
  };

  const { data: inventoryDetailData, isPending: loadingInvDetail } = useQuery({
    queryKey: ["reports", "inventory-detail", inventoryDetailParams],
    queryFn: () =>
      reportingApi
        .inventoryDetail(inventoryDetailParams as Record<string, string>)
        .then((r) => r.data as InventoryDetailReport),
  });

  const { data: activityData, isPending: loadingActivity } = useQuery({
    queryKey: ["reports", "user-activity", params],
    queryFn: () =>
      reportingApi
        .userActivity(params as Record<string, string>)
        .then((r) => r.data as UserActivityReport),
  });

  const { data: meetingData, isPending: loadingMeeting } = useQuery({
    queryKey: ["reports", "meeting-rooms", params],
    queryFn: () =>
      reportingApi
        .meetingRooms(params as Record<string, string>)
        .then((r) => r.data as MeetingRoomsReport),
  });

  // Achats : ressource Tarhib globale — companyId/branchId filtrent ici sur
  // le LIEU DE LIVRAISON du bon de commande, jamais un scope obligatoire.
  // Fournisseur/produit sont des filtres propres à cet onglet.
  const [purchasingSupplierId, setPurchasingSupplierId] = useState<string | undefined>();
  const [purchasingProductId, setPurchasingProductId] = useState<string | undefined>();

  const purchasingParams = {
    ...params,
    ...(purchasingSupplierId ? { supplierId: purchasingSupplierId } : {}),
    ...(purchasingProductId ? { productId: purchasingProductId } : {}),
  };

  const { data: purchasingData, isPending: loadingPurchasing } = useQuery({
    queryKey: ["reports", "purchasing", purchasingParams],
    queryFn: () =>
      reportingApi
        .purchasing(purchasingParams as Record<string, string>)
        .then((r) => r.data as PurchasingReport),
  });

  const { data: suppliersList = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => suppliersApi.list().then((r) => r.data as Supplier[]),
  });

  const { data: productsList = [] } = useQuery({
    queryKey: ["products-admin"],
    queryFn: () => productsAdminApi.list().then((r) => r.data as ProductAdmin[]),
  });

  const isAr = i18n.language === "ar";
  const supplierName = (id: string) => {
    const s = suppliersList.find((x) => x.id === id);
    return s ? bilingualName(s.nameAr, s.nameEn, isAr) : id.slice(0, 8);
  };
  const productName = (id: string) => {
    const p = productsList.find((x) => x.id === id);
    return p ? bilingualName(p.nameAr, p.nameEn, isAr) : id.slice(0, 8);
  };
  const companyName = (id: string) => {
    const c = companies?.find((x) => x.id === id);
    return c ? bilingualName(c.nameAr, c.nameEn, isAr) : null;
  };
  const branchName = (id: string) => {
    const b = allBranches.find((x) => x.id === id);
    if (!b) return id.slice(0, 8);
    const name = bilingualName(b.nameAr, b.nameEn, isAr);
    const company = companyName(b.companyId);
    return company ? `${name} (${company})` : name;
  };

  const complianceRate = Math.round(slaData?.complianceRate ?? 0);

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

  const ordersTab = (
    <>
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 24 }}>
        <Col xs={24} sm={8}>
          <Card loading={loadingOrders}>
            <Statistic title={t("totalOrders")} value={ordersData?.total ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loadingSla}>
            <Statistic
              title={t("onTime")}
              value={slaData?.onTime ?? 0}
              valueStyle={{ color: "var(--fg-success)" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loadingSla}>
            <Statistic
              title={t("late")}
              value={slaData?.late ?? 0}
              valueStyle={slaData?.late ? { color: "var(--fg-danger)" } : undefined}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card title={t("status")} loading={loadingOrders}>
            <Space wrap>
              {Object.entries(ordersData?.byStatus ?? {}).map(([s, c]) => (
                <Tag color={STATUS_COLORS[s] ?? "default"} key={s}>
                  {STATUS_KEY[s] ? t(STATUS_KEY[s]) : s}: {c}
                </Tag>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title={t("complianceRate")} loading={loadingSla}>
            <Progress
              type="circle"
              percent={complianceRate}
              size={100}
              strokeColor={
                complianceRate >= 90
                  ? "var(--fg-success)"
                  : complianceRate >= 70
                    ? "var(--fg-warning-subtle)"
                    : "var(--fg-danger)"
              }
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  const inventoryTab = (
    <>
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col xs={24} sm={8}>
          <Card loading={loadingInv}>
            <Statistic title={t("totalItems")} value={inventoryData?.total ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loadingInv}>
            <Statistic
              title={t("restockAlert")}
              value={inventoryData?.belowThreshold ?? 0}
              valueStyle={
                inventoryData?.belowThreshold ? { color: "var(--fg-warning-subtle)" } : undefined
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loadingInv}>
            <Statistic
              title={t("outOfStock")}
              value={inventoryData?.outOfStock ?? 0}
              valueStyle={inventoryData?.outOfStock ? { color: "var(--fg-danger)" } : undefined}
            />
          </Card>
        </Col>
      </Row>

      {/* Filtres propres au détail stock — évitent de charger tout le
          détail par emplacement d'un coup. */}
      <Space wrap style={{ marginBlockEnd: 16 }}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t("product")}
          style={{ minWidth: 200 }}
          value={invProductId}
          onChange={setInvProductId}
          options={productsList.map((p) => ({ value: p.id, label: productName(p.id) }))}
        />
        <Select
          allowClear
          placeholder={t("zone")}
          style={{ minWidth: 160 }}
          value={invZone}
          onChange={setInvZone}
          options={["CENTRAL", "BRANCH", "KITCHEN"].map((z) => ({
            value: z,
            label: t(`zone_${z}`),
          }))}
        />
        <Space size={8}>
          <Switch checked={invBelowThresholdOnly} onChange={setInvBelowThresholdOnly} />
          <span>{t("belowThresholdOnly")}</span>
        </Space>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col xs={24} sm={8}>
          <Card loading={loadingInvDetail}>
            <Statistic
              title={t("totalStockValue")}
              value={inventoryDetailData?.totalStockValue ?? 0}
              precision={2}
              suffix={t("currencyUnit")}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card title={t("quantityByProduct")} loading={loadingInvDetail}>
            <Table
              rowKey="productId"
              dataSource={inventoryDetailData?.byProduct ?? []}
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                { title: t("product"), dataIndex: "productId", render: productName },
                { title: t("quantity"), dataIndex: "quantity" },
                {
                  title: t("totalStockValue"),
                  dataIndex: "stockValue",
                  render: (v: number) => v.toFixed(2),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title={t("quantityByProductBranch")} loading={loadingInvDetail}>
            <Table
              rowKey={(r) => `${r.productId}-${r.branchId}`}
              dataSource={inventoryDetailData?.byProductBranch ?? []}
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                { title: t("product"), dataIndex: "productId", render: productName },
                { title: t("branch"), dataIndex: "branchId", render: branchName },
                { title: t("quantity"), dataIndex: "quantity" },
                {
                  title: t("totalStockValue"),
                  dataIndex: "stockValue",
                  render: (v: number) => v.toFixed(2),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBlockStart: 16 }}>
        <Col span={24}>
          <Card title={t("stockDetailByLocation")} loading={loadingInvDetail}>
            <Table
              rowKey={(r) => `${r.productId}-${r.branchId}-${r.zone}-${r.locationName ?? ""}`}
              dataSource={inventoryDetailData?.rows ?? []}
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                { title: t("product"), dataIndex: "productId", render: productName },
                { title: t("branch"), dataIndex: "branchId", render: branchName },
                { title: t("zone"), dataIndex: "zone", render: (v: string) => t(`zone_${v}`) },
                {
                  title: t("locationName"),
                  dataIndex: "locationName",
                  render: (v: string | null) => v ?? "—",
                },
                { title: t("quantity"), dataIndex: "quantity" },
                { title: t("minLevel"), dataIndex: "minThreshold" },
                {
                  title: t("maxLevel"),
                  dataIndex: "maxThreshold",
                  render: (v: number | null) => v ?? "—",
                },
                {
                  title: t("unitCost"),
                  dataIndex: "unitCost",
                  render: (v: number | null) => (v != null ? v.toFixed(2) : "—"),
                },
                {
                  title: t("totalStockValue"),
                  dataIndex: "stockValue",
                  render: (v: number) => v.toFixed(2),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  const activityTab = (
    <>
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col xs={24} sm={8}>
          <Card loading={loadingActivity}>
            <Statistic title={t("totalOrders")} value={activityData?.total ?? 0} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card title={t("topEmployees")} loading={loadingActivity}>
            <Table
              rowKey="employeeId"
              dataSource={activityData?.topEmployees ?? []}
              pagination={false}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                {
                  title: t("employee"),
                  dataIndex: "nameAr",
                  render: (_: string, row: { nameAr: string; nameEn: string }) =>
                    bilingualName(row.nameAr, row.nameEn, isAr),
                },
                { title: t("totalOrders"), dataIndex: "orderCount" },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title={t("ordersByBranch")} loading={loadingActivity}>
            <Table
              rowKey="branchId"
              dataSource={activityData?.ordersByBranch ?? []}
              pagination={false}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                {
                  title: t("branch"),
                  dataIndex: "nameAr",
                  render: (_: string, row: { nameAr: string; nameEn: string }) =>
                    bilingualName(row.nameAr, row.nameEn, isAr),
                },
                { title: t("totalOrders"), dataIndex: "orderCount" },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  const meetingTab = (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={8}>
        <Card loading={loadingMeeting}>
          <Statistic title={t("totalBookings")} value={meetingData?.totalBookings ?? 0} />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card loading={loadingMeeting}>
          <Statistic
            title={t("cancellationRate")}
            value={meetingData?.cancellationRate ?? 0}
            suffix="%"
            valueStyle={
              meetingData?.cancellationRate ? { color: "var(--fg-warning-subtle)" } : undefined
            }
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card loading={loadingMeeting}>
          <Statistic
            title={t("avgDuration")}
            value={meetingData?.avgDurationMinutes ?? 0}
            suffix={t("minutes")}
          />
        </Card>
      </Col>
    </Row>
  );

  const purchasingTab = (
    <>
      {/* Filtres propres aux achats — fournisseur et produit, en plus des
          filtres société/branche/dates partagés ci-dessus. */}
      <Space wrap style={{ marginBlockEnd: 16 }}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t("supplier")}
          style={{ minWidth: 200 }}
          value={purchasingSupplierId}
          onChange={setPurchasingSupplierId}
          options={suppliersList.map((s) => ({ value: s.id, label: supplierName(s.id) }))}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t("product")}
          style={{ minWidth: 200 }}
          value={purchasingProductId}
          onChange={setPurchasingProductId}
          options={productsList.map((p) => ({ value: p.id, label: productName(p.id) }))}
        />
      </Space>

      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col xs={24} sm={8}>
          <Card loading={loadingPurchasing}>
            <Statistic
              title={t("totalSpend")}
              value={purchasingData?.totalSpend ?? 0}
              precision={2}
              suffix={t("currencyUnit")}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card title={t("spendByProduct")} loading={loadingPurchasing}>
            <Table
              rowKey="productId"
              dataSource={purchasingData?.byProduct ?? []}
              pagination={false}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                { title: t("product"), dataIndex: "productId", render: productName },
                { title: t("quantity"), dataIndex: "quantity" },
                {
                  title: t("totalCost"),
                  dataIndex: "totalCost",
                  render: (v: number) => v.toFixed(2),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title={t("spendBySupplier")} loading={loadingPurchasing}>
            <Table
              rowKey="supplierId"
              dataSource={purchasingData?.bySupplier ?? []}
              pagination={false}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                { title: t("supplier"), dataIndex: "supplierId", render: supplierName },
                { title: t("quantity"), dataIndex: "quantity" },
                {
                  title: t("totalCost"),
                  dataIndex: "totalCost",
                  render: (v: number) => v.toFixed(2),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginBlockStart: 16 }}>
        <Col span={24}>
          <Card title={t("spendByProductSupplier")} loading={loadingPurchasing}>
            <Table
              rowKey={(r) => `${r.productId}-${r.supplierId}`}
              dataSource={purchasingData?.byProductSupplier ?? []}
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                { title: t("product"), dataIndex: "productId", render: productName },
                { title: t("supplier"), dataIndex: "supplierId", render: supplierName },
                { title: t("quantity"), dataIndex: "quantity" },
                {
                  title: t("totalCost"),
                  dataIndex: "totalCost",
                  render: (v: number) => v.toFixed(2),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  return (
    <>
      <Title level={4}>{t("reports")}</Title>
      {filters}
      <Tabs
        items={[
          { key: "orders", label: t("ordersReport"), children: ordersTab },
          { key: "inventory", label: t("inventoryReport"), children: inventoryTab },
          { key: "activity", label: t("activityReport"), children: activityTab },
          { key: "meeting-rooms", label: t("meetingRoomsReport"), children: meetingTab },
          { key: "purchasing", label: t("purchasingReport"), children: purchasingTab },
        ]}
      />
    </>
  );
}
