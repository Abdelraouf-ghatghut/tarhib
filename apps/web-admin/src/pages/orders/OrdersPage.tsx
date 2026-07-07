import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Popconfirm,
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const companyName = (id: string) => {
    const c = companies.find((x) => x.id === id);
    return c ? bilingualName(c.nameAr, c.nameEn, isAr) : id.slice(0, 8);
  };
  const branchName = (id: string) => {
    const b = branches.find((x) => x.id === id);
    return b ? bilingualName(b.nameAr, b.nameEn, isAr) : id.slice(0, 8);
  };
  // employeeId (qui a passé la commande) et les colonnes acteur du stepper
  // (approvedBy, preparedBy…) portent l'identité Keycloak de l'appelant
  // (JwtPayload.sub), pas employees.id.
  const employeeName = (id: string | null) => {
    if (!id) return null;
    const e = employees.find((x) => x.keycloakId === id);
    if (!e) return id.slice(0, 8);
    return isAr
      ? `${e.firstNameAr} ${e.lastNameAr}`.trim()
      : `${e.firstNameEn} ${e.lastNameEn}`.trim() || e.email;
  };

  const productName = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return id.substring(0, 8);
    return bilingualName(p.nameAr, p.nameEn, isAr);
  };

  // Niveaux de priorité configurés pour l'entreprise sélectionnée : le filtre
  // doit refléter les niveaux réellement définis, pas seulement ceux déjà
  // présents dans les commandes chargées (vide tant qu'aucune commande n'existe).
  const { data: slaLevels = [] } = useQuery({
    queryKey: ["sla-levels", scopeCompanyId],
    queryFn: () => slaLevelsApi.list(scopeCompanyId as string).then((r) => r.data as SlaLevel[]),
    enabled: !!scopeCompanyId,
  });
  const priorityLabel = (code: string) => {
    const lvl = slaLevels.find((l) => l.code === code);
    if (!lvl) return code;
    return bilingualName(lvl.nameAr, lvl.nameEn, isAr);
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
    if (scopeCompanyId && slaLevels.length) return slaLevels.map((l) => l.code);
    return [...new Set((data ?? []).map((o) => o.priority))].sort();
  }, [data, scopeCompanyId, slaLevels]);

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
                options={priorities.map((p) => ({ value: p, label: priorityLabel(p) }))}
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
            dataIndex: "id",
            render: (v: string) => `#${v.substring(0, 8).toUpperCase()}`,
            width: 110,
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
            render: (v: string) => priorityLabel(v),
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
        title={`${t("orders")} — #${selected?.id.substring(0, 8).toUpperCase()}`}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={480}
        footer={
          selected && (
            <Space wrap>
              {selected.status === "PENDING" && (
                <>
                  <Popconfirm
                    title={t("confirm")}
                    onConfirm={() => transition(selected.id, "APPROVED")}
                  >
                    <Button type="primary" loading={transitioning}>
                      {t("approve")}
                    </Button>
                  </Popconfirm>
                  <Popconfirm
                    title={t("confirm")}
                    onConfirm={() => transition(selected.id, "REJECTED")}
                  >
                    <Button danger loading={transitioning}>
                      {t("reject")}
                    </Button>
                  </Popconfirm>
                </>
              )}
              {(selected.status === "APPROVED" || selected.status === "PENDING") && (
                <Popconfirm
                  title={t("confirm")}
                  onConfirm={() => transition(selected.id, "IN_PROGRESS")}
                >
                  <Button loading={transitioning}>{t("inProgress")}</Button>
                </Popconfirm>
              )}
              {selected.status === "IN_PROGRESS" && (
                <Popconfirm
                  title={t("confirm")}
                  onConfirm={() => transition(selected.id, "DELIVERED")}
                >
                  <Button type="primary" loading={transitioning}>
                    {t("delivered")}
                  </Button>
                </Popconfirm>
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
                {priorityLabel(selected.priority)}
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
