import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Button,
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
} from "antd";
import {
  PlusOutlined,
  SendOutlined,
  InboxOutlined,
  StopOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { procurementApi, productsAdminApi, suppliersApi } from "../../lib/api";
import { useScope } from "../../context/ScopeContext";

const { Title } = Typography;

type PoStatus = "DRAFT" | "SENT" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

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

const STATUS_COLOR: Record<PoStatus, string> = {
  DRAFT: "default",
  SENT: "blue",
  PARTIALLY_RECEIVED: "orange",
  RECEIVED: "green",
  CANCELLED: "red",
};

export default function ProcurementPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const { selectedCompany, selectedBranch } = useScope();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [receiveForm] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailPo, setDetailPo] = useState<Po | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PoStatus | undefined>();

  const { data: orders = [], isLoading } = useQuery<Po[]>({
    queryKey: ["procurement", selectedCompany, selectedBranch, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (selectedCompany) params.companyId = selectedCompany;
      if (selectedBranch) params.branchId = selectedBranch;
      if (statusFilter) params.status = statusFilter;
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

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["suppliers", selectedCompany],
    queryFn: async () => {
      const res = await suppliersApi.list(selectedCompany ?? undefined);
      return res.data as Supplier[];
    },
  });

  const createPo = useMutation({
    mutationFn: (v: Record<string, unknown>) =>
      procurementApi.create({
        ...v,
        companyId: selectedCompany,
        branchId: selectedBranch,
      }),
    onSuccess: () => {
      message.success(t("poCreated"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setCreateOpen(false);
      form.resetFields();
    },
    onError: () => message.error(t("errorOccurred")),
  });

  const sendPo = useMutation({
    mutationFn: (id: string) => procurementApi.send(id),
    onSuccess: () => {
      message.success(t("poSent"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setDetailPo(null);
    },
    onError: () => message.error(t("errorOccurred")),
  });

  const cancelPo = useMutation({
    mutationFn: (id: string) => procurementApi.cancel(id),
    onSuccess: () => {
      message.success(t("poCancelled"));
      queryClient.invalidateQueries({ queryKey: ["procurement"] });
      setDetailPo(null);
    },
    onError: () => message.error(t("errorOccurred")),
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
    onError: () => message.error(t("errorOccurred")),
  });

  const getProductName = (id: string) => {
    const p = products.find((pr) => pr.id === id);
    return isRtl ? (p?.nameAr ?? id) : (p?.nameEn ?? id);
  };

  const getSupplierName = (id: string) => {
    const s = suppliers.find((su) => su.id === id);
    return isRtl ? (s?.nameAr ?? id) : (s?.nameEn ?? id);
  };

  const columns = [
    {
      title: t("supplier"),
      dataIndex: "supplierId",
      key: "supplierId",
      render: (id: string) => getSupplierName(id),
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
      render: (d: string) => new Date(d).toLocaleDateString(),
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
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Title level={3}>{t("procurement")}</Title>
        <Space>
          <Select
            allowClear
            placeholder={t("filterByStatus")}
            style={{ width: 200 }}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as PoStatus | undefined)}
            options={["DRAFT", "SENT", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"].map((s) => ({
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
      />

      {/* Detail modal */}
      <Modal
        open={!!detailPo}
        title={`${t("purchaseOrder")} — ${detailPo ? t(`poStatus_${detailPo.status}`) : ""}`}
        onCancel={() => setDetailPo(null)}
        footer={
          detailPo && (
            <Space>
              {detailPo.status === "DRAFT" && (
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
        destroyOnClose
      >
        {detailPo && (
          <>
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label={t("supplier")}>
                {getSupplierName(detailPo.supplierId)}
              </Descriptions.Item>
              <Descriptions.Item label={t("status")}>
                <Tag color={STATUS_COLOR[detailPo.status]}>{t(`poStatus_${detailPo.status}`)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("date")}>
                {new Date(detailPo.createdAt).toLocaleString()}
              </Descriptions.Item>
              {detailPo.notes && (
                <Descriptions.Item label={t("notes")} span={2}>
                  {detailPo.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
            <Divider />
            <Table
              rowKey="id"
              dataSource={detailPo.lines}
              columns={linesColumns}
              pagination={false}
              size="small"
            />
          </>
        )}
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
          <Form.Item name="supplierId" label={t("supplier")} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={suppliers.map((s) => ({
                value: s.id,
                label: isRtl ? s.nameAr : s.nameEn,
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
                  <Space key={key} align="start" style={{ width: "100%", display: "flex" }}>
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
                          label: isRtl ? p.nameAr : p.nameEn,
                        }))}
                        style={{ minWidth: 200 }}
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
