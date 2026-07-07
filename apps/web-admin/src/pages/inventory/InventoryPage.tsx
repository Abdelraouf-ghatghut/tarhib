import { useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { EditOutlined, PlusOutlined, SlidersOutlined, WarningOutlined } from "@ant-design/icons";
import { inventoryApi, companiesApi, branchesApi, productsAdminApi } from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";
import { ScopeFilterBar } from "../../components/ScopeFilterBar";
import { FilterBar } from "../../components/FilterBar";
import { useScope } from "../../contexts/ScopeContext";
import { bilingualName } from "../../lib/bilingualName";

const { Title } = Typography;

type StockZone = "CENTRAL" | "BRANCH" | "KITCHEN";
type AlertFilter = "all" | "below" | "out" | "critical";

const ALERT_FILTERS: AlertFilter[] = ["all", "below", "out", "critical"];

function matchesAlert(item: { quantity: number; minThreshold: number }, filter: AlertFilter) {
  if (filter === "below") return item.quantity < item.minThreshold && item.quantity > 0;
  if (filter === "out") return item.quantity === 0;
  if (filter === "critical") return item.quantity <= item.minThreshold / 2;
  return true;
}

interface InventoryItem {
  id: string;
  productId: string;
  branchId: string;
  companyId: string;
  zone: StockZone;
  quantity: number;
  minThreshold: number;
  maxThreshold: number | null;
  locationName: string | null;
}

interface AlertItem {
  productId: string;
  branchId: string;
  quantity: number;
  minThreshold: number;
}

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
}

interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
}

export function InventoryPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";
  const [editForm] = Form.useForm();
  const [adjustForm] = Form.useForm();
  const [createForm] = Form.useForm();

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("stock");
  const zoneFilter: StockZone | undefined = undefined;
  const { companyId: scopeCompanyId, branchId: scopeBranchId } = useScope();

  // Filtre d'alerte : initialisé depuis l'URL (?alert=below|out|critical),
  // pour que les alertes du dashboard atterrissent sur la vue déjà filtrée
  const [searchParams, setSearchParams] = useSearchParams();
  const urlAlert = searchParams.get("alert");
  const alertFilter: AlertFilter = ALERT_FILTERS.includes(urlAlert as AlertFilter)
    ? (urlAlert as AlertFilter)
    : "all";
  const setAlertFilter = (f: AlertFilter) =>
    setSearchParams(f === "all" ? {} : { alert: f }, { replace: true });

  const listParams: Record<string, string> = {};
  if (zoneFilter) listParams.zone = zoneFilter;
  if (scopeCompanyId) listParams.companyId = scopeCompanyId;
  if (scopeBranchId) listParams.branchId = scopeBranchId;

  const { data: stockData, isPending: stockPending } = useQuery({
    queryKey: ["inventory", listParams],
    queryFn: () =>
      inventoryApi
        .list(Object.keys(listParams).length ? listParams : undefined)
        .then((r) => r.data as InventoryItem[]),
  });

  const filteredStock = (stockData ?? []).filter((item) => matchesAlert(item, alertFilter));

  // Regroupé par produit : une seule carte par produit, le détail par
  // emplacement (branche + zone + sous-emplacement) apparaît en dépliant la
  // ligne — évite les lignes dupliquées quand un produit a du stock à
  // plusieurs emplacements.
  const groupedStock = Object.values(
    filteredStock.reduce<Record<string, { productId: string; items: InventoryItem[] }>>(
      (acc, item) => {
        (acc[item.productId] ??= { productId: item.productId, items: [] }).items.push(item);
        return acc;
      },
      {},
    ),
  );

  const { data: alertsData, isPending: alertsPending } = useQuery({
    queryKey: ["inventory", "alerts"],
    queryFn: () => inventoryApi.alerts().then((r) => r.data as AlertItem[]),
    enabled: activeTab === "alerts",
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list().then((r) => r.data as NamedEntity[]),
  });

  // Formulaire de création : la société choisie limite les branches
  // proposées, comme dans Procurement/Meeting rooms — sinon on peut créer un
  // stock avec une branche qui n'appartient pas à la société sélectionnée.
  const watchedCreateCompanyId = Form.useWatch("companyId", createForm) as string | undefined;
  const { data: createFormBranches = [] } = useQuery({
    queryKey: ["branches", watchedCreateCompanyId],
    queryFn: () => branchesApi.list(watchedCreateCompanyId).then((r) => r.data as NamedEntity[]),
    enabled: !!watchedCreateCompanyId,
  });

  // Vue admin : /products/admin (tous les produits, aucun filtrage par rôle) —
  // sinon les noms ne se résolvent pas côté superadmin
  const { data: products = [] } = useQuery({
    queryKey: ["products-admin"],
    queryFn: () => productsAdminApi.list().then((r) => r.data as Product[]),
  });

  const label = (e: NamedEntity | Product) => bilingualName(e.nameAr, e.nameEn, isAr);
  const productMap = new Map(products.map((p) => [p.id, label(p)]));
  const branchMap = new Map(branches.map((b) => [b.id, label(b)]));
  const productName = (id: string) => productMap.get(id) ?? id.substring(0, 8);
  const branchName = (id: string) => branchMap.get(id) ?? id.substring(0, 8);

  async function handleEditSave() {
    if (!editingItem) return;
    setEditSaving(true);
    try {
      const values = await editForm.validateFields();
      await inventoryApi.update(editingItem.id, values);
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      setEditingItem(null);
    } catch (err) {
      if (!(err as { errorFields?: unknown }).errorFields) {
        void message.error(getErrorMessage(err, t));
      }
    } finally {
      setEditSaving(false);
    }
  }

  async function handleAdjustSave() {
    if (!adjustingItem) return;
    setAdjustSaving(true);
    try {
      const values = await adjustForm.validateFields();
      await inventoryApi.adjust(adjustingItem.id, values);
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      void message.success(t("adjustSuccess"));
      setAdjustingItem(null);
    } catch (err) {
      if (!(err as { errorFields?: unknown }).errorFields) {
        void message.error(getErrorMessage(err, t));
      }
    } finally {
      setAdjustSaving(false);
    }
  }

  async function handleCreateSave() {
    setCreateSaving(true);
    try {
      const values = await createForm.validateFields();
      await inventoryApi.create(values);
      void qc.invalidateQueries({ queryKey: ["inventory"] });
      void message.success(t("createStockSuccess"));
      setCreateOpen(false);
      createForm.resetFields();
    } catch (err) {
      if (!(err as { errorFields?: unknown }).errorFields) {
        void message.error(getErrorMessage(err, t));
      }
    } finally {
      setCreateSaving(false);
    }
  }

  // Ligne agrégée (une carte par produit) : quantité totale + pire statut
  // parmi ses emplacements. Le détail par emplacement s'ouvre en dépliant.
  const productColumns = [
    {
      title: t("product"),
      dataIndex: "productId",
      render: (v: string) => productName(v),
    },
    {
      title: t("quantity"),
      key: "total",
      render: (_: unknown, row: { items: InventoryItem[] }) =>
        row.items.reduce((sum, i) => sum + i.quantity, 0),
    },
    {
      title: t("locations"),
      key: "locationsCount",
      render: (_: unknown, row: { items: InventoryItem[] }) => row.items.length,
      width: 100,
    },
    {
      title: t("status"),
      key: "status",
      render: (_: unknown, row: { items: InventoryItem[] }) => {
        const hasAlert = row.items.some((i) => i.quantity < i.minThreshold);
        return (
          <Tag color={hasAlert ? "red" : "green"}>{hasAlert ? t("restockAlert") : t("ok")}</Tag>
        );
      },
      width: 160,
    },
  ];

  const locationColumns = [
    {
      title: t("branch"),
      dataIndex: "branchId",
      render: (v: string) => branchName(v),
    },
    {
      title: t("zone"),
      dataIndex: "zone",
      render: (v: StockZone) => t(`zone_${v}`),
    },
    {
      title: t("locationName"),
      dataIndex: "locationName",
      render: (v: string | null) => v ?? "—",
    },
    {
      title: t("quantity"),
      dataIndex: "quantity",
      render: (v: number, row: InventoryItem) => (
        <span style={{ color: v < row.minThreshold ? "var(--fg-danger)" : undefined }}>
          {v < row.minThreshold && <WarningOutlined style={{ marginInlineEnd: 4 }} />}
          {v}
        </span>
      ),
    },
    { title: t("minLevel"), dataIndex: "minThreshold" },
    { title: t("maxLevel"), dataIndex: "maxThreshold" },
    {
      title: t("status"),
      render: (_: unknown, row: InventoryItem) => (
        <Tag color={row.quantity < row.minThreshold ? "red" : "green"}>
          {row.quantity < row.minThreshold ? t("restockAlert") : t("ok")}
        </Tag>
      ),
      width: 160,
    },
    {
      title: t("actions"),
      width: 140,
      render: (_: unknown, row: InventoryItem) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingItem(row);
              editForm.setFieldsValue({
                quantity: row.quantity,
                minThreshold: row.minThreshold,
                maxThreshold: row.maxThreshold,
                locationName: row.locationName,
              });
            }}
          />
          <Button
            size="small"
            icon={<SlidersOutlined />}
            onClick={() => {
              setAdjustingItem(row);
              adjustForm.resetFields();
            }}
          >
            {t("adjust")}
          </Button>
        </Space>
      ),
    },
  ];

  const alertColumns = [
    {
      title: t("product"),
      dataIndex: "productId",
      render: (v: string) => productName(v),
    },
    {
      title: t("branch"),
      dataIndex: "branchId",
      render: (v: string) => branchName(v),
    },
    { title: t("quantity"), dataIndex: "quantity" },
    { title: t("minLevel"), dataIndex: "minThreshold" },
    {
      title: t("status"),
      render: (_: unknown, row: AlertItem) => (
        <Tag color={row.quantity === 0 ? "red" : "orange"}>
          {row.quantity === 0 ? t("outOfStock") : t("restockAlert")}
        </Tag>
      ),
      width: 160,
    },
  ];

  return (
    <>
      <Space wrap style={{ width: "100%", justifyContent: "space-between", marginBlockEnd: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          {t("inventory")}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          {t("newStockEntry")}
        </Button>
      </Space>

      <ScopeFilterBar />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "stock",
            label: t("inventory"),
            children: (
              <>
                <FilterBar
                  quickFilters={{
                    active: alertFilter,
                    onChange: (v) => setAlertFilter(v as AlertFilter),
                    options: [
                      { value: "all", label: t("filterAll") },
                      { value: "below", label: t("belowThresholdProducts") },
                      { value: "out", label: t("outOfStockProducts") },
                      { value: "critical", label: t("criticalStock") },
                    ],
                  }}
                />
                <Table<{ productId: string; items: InventoryItem[] }>
                  rowKey="productId"
                  dataSource={groupedStock}
                  loading={stockPending}
                  size="middle"
                  scroll={{ x: true }}
                  pagination={{ pageSize: 20 }}
                  columns={productColumns}
                  expandable={{
                    expandedRowRender: (row) => (
                      <Table<InventoryItem>
                        rowKey="id"
                        dataSource={row.items}
                        size="small"
                        pagination={false}
                        columns={locationColumns}
                      />
                    ),
                  }}
                />
              </>
            ),
          },
          {
            key: "alerts",
            label: t("alerts"),
            children: (
              <Table<AlertItem>
                rowKey={(r) => `${r.productId}-${r.branchId}`}
                dataSource={alertsData}
                loading={alertsPending}
                size="middle"
                scroll={{ x: true }}
                pagination={{ pageSize: 20 }}
                columns={alertColumns}
              />
            ),
          },
        ]}
      />

      {/* New stock entry modal — TARHIB-41 */}
      <Modal
        open={createOpen}
        title={t("newStockEntry")}
        onOk={handleCreateSave}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        confirmLoading={createSaving}
        okText={t("save")}
        cancelText={t("cancel")}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" style={{ marginBlockStart: 16 }}>
          <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
            <Select
              options={companies.map((c) => ({ value: c.id, label: label(c) }))}
              showSearch
              filterOption={(input, opt) =>
                String(opt?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              onChange={() => createForm.setFieldValue("branchId", undefined)}
            />
          </Form.Item>
          <Form.Item name="branchId" label={t("branch")} rules={[{ required: true }]}>
            <Select
              options={createFormBranches.map((b) => ({ value: b.id, label: label(b) }))}
              showSearch
              filterOption={(input, opt) =>
                String(opt?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              disabled={!watchedCreateCompanyId}
              placeholder={!watchedCreateCompanyId ? t("noCompanySelected") : undefined}
            />
          </Form.Item>
          <Form.Item name="productId" label={t("products")} rules={[{ required: true }]}>
            <Select
              options={products.map((p) => ({ value: p.id, label: label(p) }))}
              showSearch
              filterOption={(input, opt) =>
                String(opt?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item
            name="zone"
            label={t("zone")}
            rules={[{ required: true }]}
            initialValue="BRANCH"
          >
            <Select
              options={(["CENTRAL", "BRANCH", "KITCHEN"] as StockZone[]).map((z) => ({
                value: z,
                label: t(`zone_${z}`),
              }))}
            />
          </Form.Item>
          <Form.Item name="locationName" label={t("locationName")} tooltip={t("locationNameHint")}>
            <Input placeholder={t("locationNamePlaceholder")} />
          </Form.Item>
          <Form.Item
            name="quantity"
            label={t("quantity")}
            rules={[{ required: true }]}
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="minThreshold"
            label={t("minLevel")}
            rules={[{ required: true }]}
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="maxThreshold" label={t("maxLevel")}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit thresholds modal */}
      <Modal
        open={!!editingItem}
        title={t("updateStock")}
        onOk={handleEditSave}
        onCancel={() => setEditingItem(null)}
        confirmLoading={editSaving}
        okText={t("save")}
        cancelText={t("cancel")}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" style={{ marginBlockStart: 16 }}>
          <Form.Item name="quantity" label={t("quantity")} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="minThreshold" label={t("minLevel")} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="maxThreshold" label={t("maxLevel")} rules={[{ required: false }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="locationName" label={t("locationName")} tooltip={t("locationNameHint")}>
            <Input placeholder={t("locationNamePlaceholder")} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Adjust stock modal */}
      <Modal
        open={!!adjustingItem}
        title={t("adjust")}
        onOk={handleAdjustSave}
        onCancel={() => {
          setAdjustingItem(null);
          adjustForm.resetFields();
        }}
        confirmLoading={adjustSaving}
        okText={t("save")}
        cancelText={t("cancel")}
        destroyOnClose
      >
        <Form form={adjustForm} layout="vertical" style={{ marginBlockStart: 16 }}>
          <Form.Item name="type" label={t("adjustmentType")} rules={[{ required: true }]}>
            <Select
              options={[
                { value: "SORTIE", label: t("sortie") },
                { value: "AJUSTEMENT", label: t("ajustement") },
              ]}
            />
          </Form.Item>
          <Form.Item name="quantity" label={t("quantity")} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="reason" label={t("reason")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
