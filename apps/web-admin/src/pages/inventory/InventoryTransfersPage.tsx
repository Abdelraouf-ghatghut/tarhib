import { useState } from "react";
import {
  Button,
  Descriptions,
  Drawer,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PlusOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import {
  inventoryTransfersApi,
  companiesApi,
  branchesApi,
  productsAdminApi,
  employeesApi,
} from "../../lib/api";
import { bilingualName } from "../../lib/bilingualName";
import { StatusStepper } from "../../components/StatusStepper";

const { Title } = Typography;

const ZONES = ["CENTRAL", "BRANCH", "KITCHEN"] as const;
type Zone = (typeof ZONES)[number];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "gold",
  CONFIRMED: "green",
  CANCELLED: "red",
};

interface Transfer {
  id: string;
  companyId: string;
  branchId: string;
  productId: string;
  fromZone: Zone;
  toZone: Zone;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  requestedBy: string;
  note: string | null;
  createdAt: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
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

export function InventoryTransfersPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Transfer | null>(null);

  const { data: transfers = [], isLoading } = useQuery<Transfer[]>({
    queryKey: ["inventory-transfers"],
    queryFn: () => inventoryTransfersApi.list().then((r) => r.data as Transfer[]),
  });

  const { data: companies = [] } = useQuery<NamedEntity[]>({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as Employee[]),
  });

  // Toutes les branches — sert à résoudre le nom de la branche de n'importe
  // quel transfert dans le Drawer de détail, indépendamment de la société
  // actuellement choisie dans le formulaire de création ci-dessous.
  const { data: allBranches = [] } = useQuery<NamedEntity[]>({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list().then((r) => r.data as NamedEntity[]),
  });

  const companyId = Form.useWatch("companyId", form);

  // Branches proposées dans le formulaire de création — limitées à la
  // société choisie dans ce même formulaire.
  const { data: branches = [] } = useQuery<NamedEntity[]>({
    queryKey: ["branches", companyId],
    queryFn: () => branchesApi.list(companyId).then((r) => r.data as NamedEntity[]),
    enabled: !!companyId,
  });

  const { data: products = [] } = useQuery<NamedEntity[]>({
    queryKey: ["products-admin"],
    queryFn: () => productsAdminApi.list().then((r) => r.data as NamedEntity[]),
  });

  const label = (e: NamedEntity) => bilingualName(e.nameAr, e.nameEn, isAr);

  // requestedBy/confirmedBy/cancelledBy portent l'identité Keycloak de
  // l'appelant (JwtPayload.sub), pas employees.id — cf. commentaire côté
  // service (ProcurementService.reject) : on résout donc par keycloakId.
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
    return p ? label(p) : id.slice(0, 8);
  };

  const branchName = (id: string) => {
    const b = allBranches.find((x) => x.id === id);
    return b ? label(b) : id.slice(0, 8);
  };

  const companyName = (id: string) => {
    const c = companies.find((x) => x.id === id);
    return c ? label(c) : id.slice(0, 8);
  };

  const handleCreate = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await inventoryTransfersApi.create(values);
      message.success(t("transferCreated"));
      qc.invalidateQueries({ queryKey: ["inventory-transfers"] });
      setOpen(false);
      form.resetFields();
    } catch {
      message.error(t("errorOccurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await inventoryTransfersApi.confirm(id);
      message.success(t("transferConfirmed"));
      qc.invalidateQueries({ queryKey: ["inventory-transfers"] });
    } catch {
      message.error(t("errorOccurred"));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await inventoryTransfersApi.cancel(id);
      message.success(t("transferCancelled"));
      qc.invalidateQueries({ queryKey: ["inventory-transfers"] });
    } catch {
      message.error(t("errorOccurred"));
    }
  };

  const columns = [
    {
      title: t("product"),
      dataIndex: "productId",
      render: (id: string) => {
        const p = products.find((p) => p.id === id);
        return p ? label(p) : id.slice(0, 8);
      },
    },
    {
      title: t("from"),
      dataIndex: "fromZone",
      render: (z: Zone) => <Tag>{t(`zone_${z}`)}</Tag>,
    },
    {
      title: t("to"),
      dataIndex: "toZone",
      render: (z: Zone) => <Tag>{t(`zone_${z}`)}</Tag>,
    },
    { title: t("quantity"), dataIndex: "quantity" },
    {
      title: t("status"),
      dataIndex: "status",
      render: (s: string) => <Tag color={STATUS_COLORS[s]}>{t(`transferStatus_${s}`)}</Tag>,
    },
    {
      title: t("date"),
      dataIndex: "createdAt",
      render: (d: string) => new Date(d).toLocaleString(isAr ? "ar" : "en-GB"),
    },
    {
      title: t("actions"),
      render: (_: unknown, row: Transfer) =>
        row.status === "PENDING" ? (
          <Space>
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleConfirm(row.id);
              }}
            >
              {t("confirm")}
            </Button>
            <Button
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleCancel(row.id);
              }}
            >
              {t("cancel")}
            </Button>
          </Space>
        ) : null,
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }} align="start">
        <Title level={4} style={{ margin: 0 }}>
          {t("inventoryTransfers")}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          {t("newTransfer")}
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={transfers}
        loading={isLoading}
        size="small"
        scroll={{ x: "max-content" }}
        onRow={(row) => ({ onClick: () => setSelected(row), style: { cursor: "pointer" } })}
      />

      <Modal
        open={open}
        title={t("newTransfer")}
        onOk={handleCreate}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
            <Select options={companies.map((c) => ({ value: c.id, label: label(c) }))} />
          </Form.Item>
          <Form.Item name="branchId" label={t("branch")} rules={[{ required: true }]}>
            <Select
              options={branches.map((b) => ({ value: b.id, label: label(b) }))}
              disabled={!companyId}
            />
          </Form.Item>
          <Form.Item name="productId" label={t("product")} rules={[{ required: true }]}>
            <Select options={products.map((p) => ({ value: p.id, label: label(p) }))} />
          </Form.Item>
          <Form.Item name="fromZone" label={t("fromZone")} rules={[{ required: true }]}>
            <Select options={ZONES.map((z) => ({ value: z, label: t(`zone_${z}`) }))} />
          </Form.Item>
          <Form.Item name="toZone" label={t("toZone")} rules={[{ required: true }]}>
            <Select options={ZONES.map((z) => ({ value: z, label: t(`zone_${z}`) }))} />
          </Form.Item>
          <Form.Item name="quantity" label={t("quantity")} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={selected ? `${t("inventoryTransfers")} — ${productName(selected.productId)}` : ""}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={420}
        footer={
          selected?.status === "PENDING" && (
            <Space wrap>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => {
                  void handleConfirm(selected.id);
                  setSelected(null);
                }}
              >
                {t("confirm")}
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  void handleCancel(selected.id);
                  setSelected(null);
                }}
              >
                {t("cancel")}
              </Button>
            </Space>
          )
        }
      >
        {selected && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={t("company")}>
                {companyName(selected.companyId)}
              </Descriptions.Item>
              <Descriptions.Item label={t("branch")}>
                {branchName(selected.branchId)}
              </Descriptions.Item>
              <Descriptions.Item label={t("product")}>
                {productName(selected.productId)}
              </Descriptions.Item>
              <Descriptions.Item label={t("from")}>
                <Tag>{t(`zone_${selected.fromZone}`)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("to")}>
                <Tag>{t(`zone_${selected.toZone}`)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("quantity")}>{selected.quantity}</Descriptions.Item>
              <Descriptions.Item label={t("status")}>
                <Tag color={STATUS_COLORS[selected.status]}>
                  {t(`transferStatus_${selected.status}`)}
                </Tag>
              </Descriptions.Item>
              {selected.note && (
                <Descriptions.Item label={t("notes")}>{selected.note}</Descriptions.Item>
              )}
            </Descriptions>

            <Typography.Title level={5} style={{ marginBlockStart: 20, marginBlockEnd: 8 }}>
              {t("statusHistory")}
            </Typography.Title>
            <StatusStepper
              steps={[
                {
                  key: "requested",
                  label: t("transferRequested"),
                  at: selected.createdAt,
                  actor: employeeName(selected.requestedBy),
                },
                selected.status === "CANCELLED"
                  ? {
                      key: "cancelled",
                      label: t("transferStatus_CANCELLED"),
                      at: selected.cancelledAt,
                      actor: employeeName(selected.cancelledBy),
                      isTerminalNegative: true,
                    }
                  : {
                      key: "confirmed",
                      label: t("transferStatus_CONFIRMED"),
                      at: selected.confirmedAt,
                      actor: employeeName(selected.confirmedBy),
                    },
              ]}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}
