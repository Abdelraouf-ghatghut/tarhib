import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Button,
  Card,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Typography,
  message,
  Descriptions,
  Divider,
  Grid,
} from "antd";
import {
  PlusOutlined,
  SendOutlined,
  InboxOutlined,
  StopOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import {
  procurementApi,
  productsAdminApi,
  suppliersApi,
  companiesApi,
  branchesApi,
  employeesApi,
} from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";
import { bilingualName } from "../../lib/bilingualName";
import { StatusStepper } from "../../components/StatusStepper";

const { Title, Text } = Typography;

type PoStatus =
  | "DRAFT"
  | "PENDING_VALIDATION"
  | "VALIDATED"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

interface PoLine {
  id: string;
  productId: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number | null;
  notes: string | null;
}

interface Po {
  id: string;
  companyId: string;
  branchId: string;
  supplierId: string;
  status: PoStatus;
  notes: string | null;
  createdBy: string;
  validatedBy: string | null;
  validatedAt: string | null;
  rejectionReason: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  sentBy: string | null;
  sentAt: string | null;
  receivedBy: string | null;
  receivedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  lines: PoLine[];
  createdAt: string;
}

interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  unitCost: number | null;
}

interface Supplier {
  id: string;
  nameAr: string;
  nameEn: string;
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
  keycloakId?: string | null;
}

const STATUS_COLOR: Record<PoStatus, string> = {
  DRAFT: "default",
  PENDING_VALIDATION: "gold",
  VALIDATED: "cyan",
  SENT: "blue",
  PARTIALLY_RECEIVED: "orange",
  RECEIVED: "green",
  CANCELLED: "red",
};

const ALL_STATUSES: PoStatus[] = [
  "DRAFT",
  "PENDING_VALIDATION",
  "VALIDATED",
  "SENT",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
];

export default function ProcurementPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [receiveForm] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailPo, setDetailPo] = useState<Po | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectForm] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState<PoStatus | undefined>();
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>();
  const [filterBranchId, setFilterBranchId] = useState<string | undefined>();

  // Les achats sont des achats Tarhib (pas ceux d'une société cliente) —
  // livrés à un lieu (société + branche) choisi par commande, jamais filtrés
  // par la société actuellement sélectionnée dans la barre de navigation.
  // Le filtre lieu de livraison ci-dessous est local à cette page.
  const { data: orders = [], isLoading } = useQuery<Po[]>({
    queryKey: ["procurement", statusFilter, filterCompanyId, filterBranchId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (filterCompanyId) params.companyId = filterCompanyId;
      if (filterBranchId) params.branchId = filterBranchId;
      const res = await procurementApi.list(params);
      return res.data as Po[];
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products-admin"],
    queryFn: async () => {
      const res = await productsAdminApi.list();
      return res.data as Product[];
    },
  });

  // Fournisseurs : ressource Tarhib globale, non liée à une société cliente.
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await suppliersApi.list();
      return res.data as Supplier[];
    },
  });

  const { data: companies = [] } = useQuery<NamedEntity[]>({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
  });

  const { data: allBranches = [] } = useQuery<NamedEntity[]>({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list().then((r) => r.data as NamedEntity[]),
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as Employee[]),
  });

  // Branches proposées par le filtre lieu de livraison — limitées à la
  // société choisie dans ce même filtre.
  const { data: filterBranches = [] } = useQuery<NamedEntity[]>({
    queryKey: ["branches", filterCompanyId],
    queryFn: () => branchesApi.list(filterCompanyId).then((r) => r.data as NamedEntity[]),
    enabled: !!filterCompanyId,
  });

  // Lieu de livraison choisi dans le formulaire de création — la liste des
  // branches proposées se limite à celles de la société choisie.
  const watchedDeliveryCompanyId = Form.useWatch("companyId", form) as string | undefined;
  const { data: deliveryBranches = [] } = useQuery<NamedEntity[]>({
    queryKey: ["branches", watchedDeliveryCompanyId],
    queryFn: () => branchesApi.list(watchedDeliveryCompanyId).then((r) => r.data as NamedEntity[]),
    enabled: !!watchedDeliveryCompanyId,
  });

  // Prix produits du fournisseur choisi dans le formulaire — chargés une
  // seule fois par changement de fournisseur, puis consultés ligne par
  // ligne (évite un fetch par ligne à chaque sélection de produit).
  const watchedSupplierId = Form.useWatch("supplierId", form) as string | undefined;
  const { data: supplierPrices = [] } = useQuery({
    queryKey: ["supplier-product-prices", watchedSupplierId],
    queryFn: async () => {
      const res = await suppliersApi.productPrices(watchedSupplierId as string);
      return res.data as Array<{ productId: string; unitCost: number }>;
    },
    enabled: !!watchedSupplierId,
  });

  // Pré-remplit le coût unitaire d'une ligne dès que produit + fournisseur
  // sont connus : prix spécifique au fournisseur en priorité, sinon coût
  // interne par défaut du produit.
  function fillLineUnitCost(lineIndex: number, productId: string) {
    const bySupplier = supplierPrices.find((p) => p.productId === productId)?.unitCost;
    const unitCost = bySupplier ?? products.find((p) => p.id === productId)?.unitCost ?? null;
    if (unitCost != null) {
      const lines = form.getFieldValue("lines") as Array<Record<string, unknown>>;
      lines[lineIndex] = { ...lines[lineIndex], unitCost };
      form.setFieldValue("lines", lines);
    }
  }

  const createPo = useMutation({
    mutationFn: (v: Record<string, unknown>) => procurementApi.create(v),
    onSuccess: () => {
      message.success(t("poCreated"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setCreateOpen(false);
      form.resetFields();
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const submitPo = useMutation({
    mutationFn: (id: string) => procurementApi.submit(id),
    onSuccess: () => {
      message.success(t("poSubmitted"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setDetailPo(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const validatePo = useMutation({
    mutationFn: (id: string) => procurementApi.validate(id),
    onSuccess: () => {
      message.success(t("poValidated"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setDetailPo(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const rejectPo = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      procurementApi.reject(id, reason),
    onSuccess: () => {
      message.success(t("poRejected"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setRejectOpen(false);
      setDetailPo(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const sendPo = useMutation({
    mutationFn: (id: string) => procurementApi.send(id),
    onSuccess: () => {
      message.success(t("poSent"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setDetailPo(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const cancelPo = useMutation({
    mutationFn: (id: string) => procurementApi.cancel(id),
    onSuccess: () => {
      message.success(t("poCancelled"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setDetailPo(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const receivePo = useMutation({
    mutationFn: ({ id, lines }: { id: string; lines: { lineId: string; receivedQty: number }[] }) =>
      procurementApi.receive(id, { lines }),
    onSuccess: () => {
      message.success(t("poReceived"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setReceiveOpen(false);
      setDetailPo(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  // createdBy/validatedBy/sentBy/receivedBy/cancelledBy/rejectedBy portent
  // l'identité Keycloak de l'appelant (JwtPayload.sub), pas employees.id.
  const employeeName = (id: string | null) => {
    if (!id) return null;
    const e = employees.find((x) => x.keycloakId === id);
    if (!e) return id.slice(0, 8);
    return isRtl
      ? `${e.firstNameAr} ${e.lastNameAr}`.trim()
      : `${e.firstNameEn} ${e.lastNameEn}`.trim() || e.email;
  };

  const getProductName = (id: string) => {
    const p = products.find((pr) => pr.id === id);
    return p ? bilingualName(p.nameAr, p.nameEn, isRtl) : id;
  };

  const getSupplierName = (id: string) => {
    const s = suppliers.find((su) => su.id === id);
    return s ? bilingualName(s.nameAr, s.nameEn, isRtl) : id;
  };

  const getCompanyName = (id: string) => {
    const c = companies.find((co) => co.id === id);
    return c ? bilingualName(c.nameAr, c.nameEn, isRtl) : id;
  };

  const getBranchName = (id: string) => {
    const b = allBranches.find((br) => br.id === id);
    return b ? bilingualName(b.nameAr, b.nameEn, isRtl) : id;
  };

  const columns = [
    {
      title: t("supplier"),
      dataIndex: "supplierId",
      key: "supplierId",
      render: (id: string) => getSupplierName(id),
    },
    {
      title: t("deliveryLocation"),
      key: "deliveryLocation",
      render: (_: unknown, r: Po) =>
        `${getCompanyName(r.companyId)} — ${getBranchName(r.branchId)}`,
    },
    {
      title: t("status"),
      dataIndex: "status",
      key: "status",
      render: (s: PoStatus) => <Tag color={STATUS_COLOR[s]}>{t(`poStatus_${s}`)}</Tag>,
    },
    {
      title: t("lines"),
      key: "lines",
      render: (_: unknown, r: Po) => r.lines.length,
    },
    {
      title: t("date"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d: string) => new Date(d).toLocaleDateString(isRtl ? "ar" : "en-GB"),
    },
    {
      title: t("actions"),
      key: "actions",
      render: (_: unknown, r: Po) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailPo(r)}>
            {t("view")}
          </Button>
        </Space>
      ),
    },
  ];

  const linesColumns = [
    {
      title: t("product"),
      dataIndex: "productId",
      key: "productId",
      render: (id: string) => getProductName(id),
    },
    { title: t("orderedQty"), dataIndex: "orderedQty", key: "orderedQty" },
    { title: t("receivedQty"), dataIndex: "receivedQty", key: "receivedQty" },
    {
      title: t("unitCost"),
      dataIndex: "unitCost",
      key: "unitCost",
      render: (v: number | null) => (v != null ? `${v}` : "—"),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          {t("procurement")}
        </Title>
        <Space wrap>
          <Select
            allowClear
            placeholder={t("company")}
            style={{ width: 180 }}
            value={filterCompanyId}
            onChange={(v: string | undefined) => {
              setFilterCompanyId(v);
              setFilterBranchId(undefined);
            }}
            options={companies.map((c) => ({
              value: c.id,
              label: bilingualName(c.nameAr, c.nameEn, isRtl),
            }))}
          />
          <Select
            allowClear
            disabled={!filterCompanyId}
            placeholder={t("branch")}
            style={{ width: 180 }}
            value={filterBranchId}
            onChange={(v: string | undefined) => setFilterBranchId(v)}
            options={filterBranches.map((b) => ({
              value: b.id,
              label: bilingualName(b.nameAr, b.nameEn, isRtl),
            }))}
          />
          <Select
            allowClear
            placeholder={t("filterByStatus")}
            style={{ width: 200 }}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as PoStatus | undefined)}
            options={ALL_STATUSES.map((s) => ({
              value: s,
              label: t(`poStatus_${s}`),
            }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            {t("newPo")}
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        dataSource={orders}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: "max-content" }}
      />

      {/* Detail modal */}
      <Modal
        open={!!detailPo}
        title={`${t("purchaseOrder")} — ${detailPo ? t(`poStatus_${detailPo.status}`) : ""}`}
        onCancel={() => setDetailPo(null)}
        footer={
          detailPo && (
            <Space wrap style={{ justifyContent: "flex-end", width: "100%" }}>
              {detailPo.status === "DRAFT" && (
                <>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={submitPo.isPending}
                    onClick={() => submitPo.mutate(detailPo.id)}
                  >
                    {t("submitForValidation")}
                  </Button>
                  <Button
                    icon={<SendOutlined />}
                    loading={sendPo.isPending}
                    onClick={() => sendPo.mutate(detailPo.id)}
                  >
                    {t("sendDirectly")}
                  </Button>
                </>
              )}
              {detailPo.status === "PENDING_VALIDATION" && (
                <>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={validatePo.isPending}
                    onClick={() => validatePo.mutate(detailPo.id)}
                  >
                    {t("validate")}
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => {
                      rejectForm.resetFields();
                      setRejectOpen(true);
                    }}
                  >
                    {t("reject")}
                  </Button>
                </>
              )}
              {detailPo.status === "VALIDATED" && (
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={sendPo.isPending}
                  onClick={() => sendPo.mutate(detailPo.id)}
                >
                  {t("send")}
                </Button>
              )}
              {(detailPo.status === "SENT" || detailPo.status === "PARTIALLY_RECEIVED") && (
                <Button
                  type="primary"
                  icon={<InboxOutlined />}
                  onClick={() => {
                    receiveForm.resetFields();
                    setReceiveOpen(true);
                  }}
                >
                  {t("receive")}
                </Button>
              )}
              {detailPo.status !== "RECEIVED" && detailPo.status !== "CANCELLED" && (
                <Button
                  danger
                  icon={<StopOutlined />}
                  loading={cancelPo.isPending}
                  onClick={() => cancelPo.mutate(detailPo.id)}
                >
                  {t("cancel")}
                </Button>
              )}
            </Space>
          )
        }
        width={720}
        style={{ maxWidth: "calc(100vw - 24px)" }}
        destroyOnClose
      >
        {detailPo && (
          <>
            <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label={t("supplier")}>
                {getSupplierName(detailPo.supplierId)}
              </Descriptions.Item>
              <Descriptions.Item label={t("deliveryLocation")}>
                {getCompanyName(detailPo.companyId)} — {getBranchName(detailPo.branchId)}
              </Descriptions.Item>
              <Descriptions.Item label={t("status")}>
                <Tag color={STATUS_COLOR[detailPo.status]}>{t(`poStatus_${detailPo.status}`)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("date")}>
                {new Date(detailPo.createdAt).toLocaleString(isRtl ? "ar" : "en-GB")}
              </Descriptions.Item>
              {detailPo.notes && (
                <Descriptions.Item label={t("notes")} span={2}>
                  {detailPo.notes}
                </Descriptions.Item>
              )}
              {detailPo.rejectionReason && (
                <Descriptions.Item label={t("rejectionReason")} span={2}>
                  <Text type="danger">{detailPo.rejectionReason}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
            <Divider />
            {isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {detailPo.lines.map((l) => (
                  <Card key={l.id} size="small">
                    <Text strong style={{ display: "block", marginBlockEnd: 6 }}>
                      {getProductName(l.productId)}
                    </Text>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <Text type="secondary">{t("orderedQty")}</Text>
                      <Text>{l.orderedQty}</Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <Text type="secondary">{t("receivedQty")}</Text>
                      <Text>{l.receivedQty}</Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <Text type="secondary">{t("unitCost")}</Text>
                      <Text>{l.unitCost != null ? l.unitCost : "—"}</Text>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Table
                rowKey="id"
                dataSource={detailPo.lines}
                columns={linesColumns}
                pagination={false}
                size="small"
                scroll={{ x: "max-content" }}
              />
            )}

            <Typography.Title level={5} style={{ marginBlockStart: 20, marginBlockEnd: 8 }}>
              {t("statusHistory")}
            </Typography.Title>
            <StatusStepper
              steps={[
                {
                  key: "created",
                  label: t("poCreated"),
                  at: detailPo.createdAt,
                  actor: employeeName(detailPo.createdBy),
                },
                ...(detailPo.rejectedAt
                  ? [
                      {
                        key: "rejected",
                        label: t("poRejected"),
                        at: detailPo.rejectedAt,
                        actor: employeeName(detailPo.rejectedBy),
                        isTerminalNegative: true,
                      },
                    ]
                  : [
                      {
                        key: "validated",
                        label: t("poValidated"),
                        at: detailPo.validatedAt,
                        actor: employeeName(detailPo.validatedBy),
                      },
                    ]),
                {
                  key: "sent",
                  label: t("poSent"),
                  at: detailPo.sentAt,
                  actor: employeeName(detailPo.sentBy),
                },
                {
                  key: "received",
                  label: t("poReceived"),
                  at: detailPo.receivedAt,
                  actor: employeeName(detailPo.receivedBy),
                },
                ...(detailPo.cancelledAt
                  ? [
                      {
                        key: "cancelled",
                        label: t("poCancelled"),
                        at: detailPo.cancelledAt,
                        actor: employeeName(detailPo.cancelledBy),
                        isTerminalNegative: true,
                      },
                    ]
                  : []),
              ]}
            />
          </>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal
        open={rejectOpen}
        title={t("rejectPo")}
        onCancel={() => setRejectOpen(false)}
        onOk={() => rejectForm.submit()}
        confirmLoading={rejectPo.isPending}
        destroyOnClose
      >
        <Form
          form={rejectForm}
          layout="vertical"
          onFinish={(v: { reason: string }) => {
            if (!detailPo) return;
            rejectPo.mutate({ id: detailPo.id, reason: v.reason });
          }}
        >
          <Form.Item name="reason" label={t("rejectionReason")} rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Receive modal */}
      <Modal
        open={receiveOpen}
        title={t("receiveLines")}
        onCancel={() => setReceiveOpen(false)}
        onOk={() => receiveForm.submit()}
        confirmLoading={receivePo.isPending}
        destroyOnClose
      >
        <Form
          form={receiveForm}
          layout="vertical"
          onFinish={(values: Record<string, number>) => {
            if (!detailPo) return;
            const lines = detailPo.lines
              .filter((l) => (values[l.id] ?? 0) > 0)
              .map((l) => ({ lineId: l.id, receivedQty: values[l.id] ?? 0 }));
            receivePo.mutate({ id: detailPo.id, lines });
          }}
        >
          {detailPo?.lines.map((l) => (
            <Form.Item
              key={l.id}
              name={l.id}
              label={`${getProductName(l.productId)} (${t("received")}: ${l.receivedQty}/${l.orderedQty})`}
              initialValue={Math.max(0, l.orderedQty - l.receivedQty)}
            >
              <InputNumber min={0} max={l.orderedQty - l.receivedQty} style={{ width: "100%" }} />
            </Form.Item>
          ))}
        </Form>
      </Modal>

      {/* Create modal */}
      <Modal
        open={createOpen}
        title={t("newPo")}
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createPo.isPending}
        width={640}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => createPo.mutate(v as Record<string, unknown>)}
        >
          <Divider>{t("deliveryLocation")}</Divider>
          <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={companies.map((c) => ({
                value: c.id,
                label: bilingualName(c.nameAr, c.nameEn, isRtl),
              }))}
              onChange={() => form.setFieldValue("branchId", undefined)}
            />
          </Form.Item>
          <Form.Item name="branchId" label={t("branch")} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              disabled={!watchedDeliveryCompanyId}
              placeholder={!watchedDeliveryCompanyId ? t("noCompanySelected") : undefined}
              options={deliveryBranches.map((b) => ({
                value: b.id,
                label: bilingualName(b.nameAr, b.nameEn, isRtl),
              }))}
            />
          </Form.Item>
          <Divider>{t("supplier")}</Divider>
          <Form.Item name="supplierId" label={t("supplier")} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={suppliers.map((s) => ({
                value: s.id,
                label: bilingualName(s.nameAr, s.nameEn, isRtl),
              }))}
            />
          </Form.Item>
          <Form.Item name="notes" label={t("notes")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Divider>{t("lines")}</Divider>
          <Form.List name="lines" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Space key={key} wrap align="start" style={{ width: "100%" }}>
                    <Form.Item
                      name={[name, "productId"]}
                      rules={[{ required: true }]}
                      style={{ flex: 2 }}
                    >
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder={t("product")}
                        options={products.map((p) => ({
                          value: p.id,
                          label: bilingualName(p.nameAr, p.nameEn, isRtl),
                        }))}
                        style={{ minWidth: 200 }}
                        onChange={(productId: string) => fillLineUnitCost(name, productId)}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[name, "orderedQty"]}
                      initialValue={1}
                      rules={[{ required: true }]}
                    >
                      <InputNumber min={1} placeholder={t("qty")} />
                    </Form.Item>
                    <Form.Item name={[name, "unitCost"]}>
                      <InputNumber min={0} placeholder={t("unitCost")} />
                    </Form.Item>
                    <Button danger onClick={() => remove(name)}>
                      ✕
                    </Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block>
                  + {t("addLine")}
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
