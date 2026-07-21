import { useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Row,
  Col,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  DatePicker,
  message,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ordersApi,
  productsAdminApi,
  slaLevelsApi,
  employeesApi,
  companiesApi,
  branchesApi,
} from "../../lib/api";
import { FilterBar } from "../../components/FilterBar";
import { ScopeFilterBar } from "../../components/ScopeFilterBar";
import { useScope } from "../../contexts/ScopeContext";
import { getErrorMessage } from "../../lib/errors";
import { bilingualName } from "../../lib/bilingualName";
import { StatusStepper } from "../../components/StatusStepper";
import { useEntityLookup } from "../../hooks/useEntityLookup";
import { exportToCsv } from "../../lib/exportCsv";
import { DownloadOutlined } from "@ant-design/icons";

const { Title } = Typography;

const STATUS_META: Array<{ value: string; color: string; key: string }> = [
  { value: "PENDING", color: "orange", key: "pending" },
  { value: "APPROVED", color: "blue", key: "approved" },
  { value: "IN_PROGRESS", color: "processing", key: "inProgress" },
  { value: "DELIVERED", color: "green", key: "delivered" },
  { value: "REJECTED", color: "red", key: "rejected" },
];
const STATUS_COLOR: Record<string, string> = Object.fromEntries(
  STATUS_META.map((s) => [s.value, s.color]),
);
const STATUS_KEY: Record<string, string> = Object.fromEntries(
  STATUS_META.map((s) => [s.value, s.key]),
);

interface OrderLine {
  productId: string;
  quantity: number;
}
interface Order {
  id: string;
  orderNumber: number;
  status: string;
  priority: string;
  slaDeadline: string;
  createdAt: string;
  employeeId: string;
  companyId: string;
  branchId: string;
  lines: OrderLine[];
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  prepStartedAt: string | null;
  preparedBy: string | null;
  readyAt: string | null;
  readyBy: string | null;
  deliveredAt: string | null;
  deliveredBy: string | null;
}

interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
}

interface SlaLevel {
  code: string;
  nameAr: string;
  nameEn: string | null;
}

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
}

interface Employee {
  id: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
  email: string;
  keycloakId: string | null;
}

export function OrdersPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const { modal } = App.useApp();
  const qc = useQueryClient();
  const { companyId: scopeCompanyId } = useScope();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const queryParams: Record<string, string> = {};
  if (statusFilter !== "all") queryParams.status = statusFilter;
  if (scopeCompanyId) queryParams.companyId = scopeCompanyId;

  const { data, isPending } = useQuery({
    queryKey: ["orders", queryParams],
    queryFn: () =>
      ordersApi
        .list(Object.keys(queryParams).length ? queryParams : undefined)
        .then((r) => r.data as Order[]),
    // SLA temps réel : la liste (statuts, échéances) reste à jour même si
    // un autre admin/agent modifie une commande pendant que cet écran est ouvert.
    refetchInterval: 30_000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-admin"],
    queryFn: () => productsAdminApi.list().then((r) => r.data as Product[]),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
  });
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list().then((r) => r.data as NamedEntity[]),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as Employee[]),
  });
  const companyName = useEntityLookup(
    companies,
    (c) => c.id,
    (c) => bilingualName(c.nameAr, c.nameEn, isAr),
  );
  const branchName = useEntityLookup(
    branches,
    (b) => b.id,
    (b) => bilingualName(b.nameAr, b.nameEn, isAr),
  );
  // employeeId (qui a passé la commande) et les colonnes acteur du stepper
  // (approvedBy, preparedBy…) portent l'identité Keycloak de l'appelant
  // (JwtPayload.sub), pas employees.id.
  const employeeName = useEntityLookup(
    employees,
    (e) => e.keycloakId,
    (e) =>
      isAr
        ? `${e.firstNameAr} ${e.lastNameAr}`.trim()
        : `${e.firstNameEn} ${e.lastNameEn}`.trim() || e.email,
  );

  const productName = useEntityLookup(
    products,
    (p) => p.id,
    (p) => bilingualName(p.nameAr, p.nameEn, isAr),
  );

  // Niveaux de priorité : chaque société peut personnaliser ses codes P1..P5
  // (nom, durée) — la commande ne porte qu'un code, il faut donc les niveaux
  // de la société de CHAQUE commande affichée, pas seulement de la société
  // filtrée (sinon "P1"/"P2" bruts s'affichent en vue multi-société).
  const companyIds = useMemo(() => [...new Set((data ?? []).map((o) => o.companyId))], [data]);
  const slaLevelQueries = useQueries({
    queries: companyIds.map((cid) => ({
      queryKey: ["sla-levels", cid],
      queryFn: () => slaLevelsApi.list(cid).then((r) => r.data as SlaLevel[]),
    })),
  });
  const slaLevelsByCompany = useMemo(() => {
    const map: Record<string, SlaLevel[]> = {};
    companyIds.forEach((cid, i) => {
      map[cid] = slaLevelQueries[i]?.data ?? [];
    });
    return map;
  }, [companyIds, slaLevelQueries]);
  const priorityLabel = (code: string, companyId: string) => {
    const lvl = slaLevelsByCompany[companyId]?.find((l) => l.code === code);
    if (!lvl) return code;
    return bilingualName(lvl.nameAr, lvl.nameEn, isAr);
  };
  // Libellé pour le filtre (pas de commande précise à disposition) : société
  // du scope si choisie, sinon la première société où le code est connu.
  const priorityFilterLabel = (code: string) => {
    if (scopeCompanyId) return priorityLabel(code, scopeCompanyId);
    const cid = companyIds.find((id) => slaLevelsByCompany[id]?.some((l) => l.code === code));
    return cid ? priorityLabel(code, cid) : code;
  };

  // Filtres avancés (priorité, plage de dates) appliqués côté client
  const filtered = useMemo(() => {
    let out = data ?? [];
    if (priorityFilter) out = out.filter((o) => o.priority === priorityFilter);
    const [from, to] = dateRange ?? [null, null];
    if (from) out = out.filter((o) => !dayjs(o.createdAt).isBefore(from, "day"));
    if (to) out = out.filter((o) => !dayjs(o.createdAt).isAfter(to, "day"));
    return out;
  }, [data, priorityFilter, dateRange]);

  const activeAdvanced = (priorityFilter ? 1 : 0) + (dateRange?.[0] || dateRange?.[1] ? 1 : 0);
  // Options du filtre : niveaux configurés de l'entreprise (scope choisi), sinon
  // au mieux les codes déjà présents dans les commandes chargées (vue multi-société)
  const priorities = useMemo(() => {
    const scopeLevels = scopeCompanyId ? slaLevelsByCompany[scopeCompanyId] : undefined;
    if (scopeLevels?.length) return scopeLevels.map((l) => l.code);
    return [...new Set((data ?? []).map((o) => o.priority))].sort();
  }, [data, scopeCompanyId, slaLevelsByCompany]);

  async function transition(id: string, status: string) {
    setTransitioning(true);
    try {
      await ordersApi.updateStatus(id, status);
      void qc.invalidateQueries({ queryKey: ["orders"] });
      setSelected(null);
    } catch (err) {
      void message.error(getErrorMessage(err, t));
    } finally {
      setTransitioning(false);
    }
  }

  const statusLabel = (v: string) => (STATUS_KEY[v] ? t(STATUS_KEY[v]) : v);

  return (
    <>
      <Row justify="space-between" align="middle" style={{ marginBlockEnd: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            {t("orders")}
          </Title>
        </Col>
        <Col>
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              exportToCsv(`orders-${dayjs().format("YYYY-MM-DD")}`, filtered, [
                { label: "ID", value: (o) => `#${o.orderNumber}` },
                { label: t("status"), value: (o) => statusLabel(o.status) },
                { label: t("priority"), value: (o) => priorityLabel(o.priority, o.companyId) },
                { label: t("company"), value: (o) => companyName(o.companyId) },
                { label: t("branch"), value: (o) => branchName(o.branchId) },
                { label: t("employee"), value: (o) => employeeName(o.employeeId) },
                {
                  label: t("slaDeadline"),
                  value: (o) => dayjs(o.slaDeadline).format("YYYY-MM-DD HH:mm"),
                },
                {
                  label: t("createdAt"),
                  value: (o) => dayjs(o.createdAt).format("YYYY-MM-DD HH:mm"),
                },
              ])
            }
          >
            {t("exportCsv")}
          </Button>
        </Col>
      </Row>

      <ScopeFilterBar showBranch={false} />

      <FilterBar
        quickFilters={{
          active: statusFilter,
          onChange: setStatusFilter,
          options: [
            { value: "all", label: t("filterAll") },
            ...STATUS_META.map((s) => ({ value: s.value, label: t(s.key) })),
          ],
        }}
        activeAdvancedCount={activeAdvanced}
        onClearAll={() => {
          setPriorityFilter(undefined);
          setDateRange(null);
        }}
        advanced={
          <>
            <div>
              <div style={{ marginBlockEnd: 6, fontSize: 13, color: "var(--fg-body-subtle)" }}>
                {t("priority")}
              </div>
              <Select
                allowClear
                style={{ width: "100%" }}
                placeholder={t("priority")}
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={priorities.map((p) => ({ value: p, label: priorityFilterLabel(p) }))}
              />
            </div>
            <div>
              <div style={{ marginBlockEnd: 6, fontSize: 13, color: "var(--fg-body-subtle)" }}>
                {t("createdAt")}
              </div>
              <DatePicker.RangePicker
                style={{ width: "100%" }}
                value={dateRange}
                onChange={(r) => setDateRange(r)}
              />
            </div>
          </>
        }
      />

      <Table<Order>
        rowKey="id"
        dataSource={filtered}
        loading={isPending}
        size="middle"
        scroll={{ x: true }}
        onRow={(r) => ({ onClick: () => setSelected(r), style: { cursor: "pointer" } })}
        columns={[
          {
            title: "ID",
            dataIndex: "orderNumber",
            render: (v: number) => `#${v}`,
            width: 90,
          },
          {
            title: t("status"),
            dataIndex: "status",
            render: (v: string) => <Tag color={STATUS_COLOR[v]}>{statusLabel(v)}</Tag>,
            width: 130,
          },
          {
            title: t("priority"),
            dataIndex: "priority",
            width: 110,
            render: (v: string, r: Order) => priorityLabel(v, r.companyId),
          },
          {
            title: t("slaDeadline"),
            dataIndex: "slaDeadline",
            render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
          },
          {
            title: t("createdAt"),
            dataIndex: "createdAt",
            render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
          },
        ]}
      />

      <Drawer
        title={`${t("orders")} — #${selected?.orderNumber}`}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={480}
        footer={
          selected && (
            <Space wrap>
              {selected.status === "PENDING" && (
                <>
                  <Button
                    type="primary"
                    loading={transitioning}
                    onClick={() =>
                      modal.confirm({
                        title: t("confirm"),
                        okText: t("confirm"),
                        cancelText: t("cancel"),
                        onOk: () => transition(selected.id, "APPROVED"),
                      })
                    }
                  >
                    {t("approve")}
                  </Button>
                  <Button
                    danger
                    loading={transitioning}
                    onClick={() =>
                      modal.confirm({
                        title: t("confirm"),
                        okText: t("confirm"),
                        cancelText: t("cancel"),
                        okButtonProps: { danger: true },
                        onOk: () => transition(selected.id, "REJECTED"),
                      })
                    }
                  >
                    {t("reject")}
                  </Button>
                </>
              )}
              {(selected.status === "APPROVED" || selected.status === "PENDING") && (
                <Button
                  loading={transitioning}
                  onClick={() =>
                    modal.confirm({
                      title: t("confirm"),
                      okText: t("confirm"),
                      cancelText: t("cancel"),
                      onOk: () => transition(selected.id, "IN_PROGRESS"),
                    })
                  }
                >
                  {t("inProgress")}
                </Button>
              )}
              {selected.status === "IN_PROGRESS" && (
                <Button
                  type="primary"
                  loading={transitioning}
                  onClick={() =>
                    modal.confirm({
                      title: t("confirm"),
                      okText: t("confirm"),
                      cancelText: t("cancel"),
                      onOk: () => transition(selected.id, "DELIVERED"),
                    })
                  }
                >
                  {t("delivered")}
                </Button>
              )}
            </Space>
          )
        }
      >
        {selected && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={t("status")}>
                <Tag color={STATUS_COLOR[selected.status]}>{statusLabel(selected.status)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("orderedBy")}>
                {employeeName(selected.employeeId) ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("location")}>
                {companyName(selected.companyId)} — {branchName(selected.branchId)}
              </Descriptions.Item>
              <Descriptions.Item label={t("priority")}>
                {priorityLabel(selected.priority, selected.companyId)}
              </Descriptions.Item>
              <Descriptions.Item label={t("slaDeadline")}>
                {dayjs(selected.slaDeadline).format("DD/MM/YYYY HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item label={t("createdAt")}>
                {dayjs(selected.createdAt).format("DD/MM/YYYY HH:mm")}
              </Descriptions.Item>
            </Descriptions>

            <Card title={t("orderLines")} size="small" style={{ marginBlockStart: 16 }}>
              <Table<OrderLine>
                rowKey="productId"
                dataSource={selected.lines}
                size="small"
                pagination={false}
                columns={[
                  {
                    title: t("product"),
                    dataIndex: "productId",
                    render: (v: string) => productName(v),
                  },
                  { title: t("quantity"), dataIndex: "quantity", width: 80 },
                ]}
              />
            </Card>

            <Typography.Title level={5} style={{ marginBlockStart: 20, marginBlockEnd: 8 }}>
              {t("statusHistory")}
            </Typography.Title>
            <StatusStepper
              steps={[
                {
                  key: "created",
                  label: t("pending"),
                  at: selected.createdAt,
                  actor: employeeName(selected.employeeId),
                },
                ...(selected.rejectedAt
                  ? [
                      {
                        key: "rejected",
                        label: t("rejected"),
                        at: selected.rejectedAt,
                        actor: employeeName(selected.rejectedBy),
                        isTerminalNegative: true,
                      },
                    ]
                  : [
                      {
                        key: "approved",
                        label: t("approved"),
                        at: selected.approvedAt,
                        actor: employeeName(selected.approvedBy),
                      },
                      {
                        key: "inProgress",
                        label: t("inProgress"),
                        at: selected.prepStartedAt,
                        actor: employeeName(selected.preparedBy),
                      },
                      {
                        key: "ready",
                        label: t("readyStatus"),
                        at: selected.readyAt,
                        actor: employeeName(selected.readyBy),
                      },
                      {
                        key: "delivered",
                        label: t("delivered"),
                        at: selected.deliveredAt,
                        actor: employeeName(selected.deliveredBy),
                      },
                    ]),
              ]}
            />
          </>
        )}
      </Drawer>
    </>
  );
}
