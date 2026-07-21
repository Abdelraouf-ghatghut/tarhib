import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined, CheckOutlined, LockOutlined, UnlockOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { accountingApi } from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";
import { useAuth } from "../../hooks/useAuth";

const { Title } = Typography;

interface Account {
  id: string;
  code: string;
  label: string;
}

interface JournalEntryLine {
  accountId: string;
  debit: number;
  credit: number;
  label: string | null;
}

interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  label: string;
  source: string;
  status: "DRAFT" | "POSTED";
  lines: JournalEntryLine[];
}

interface FiscalYear {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
  closedAt: string | null;
}

export function JournalEntriesPage() {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("accounting.manage");
  const canReopen = hasPermission("company.manage");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  // Pas d'endpoint "lister toutes les écritures" côté backend (voir plan) —
  // seul le grand livre par compte (ReportsPage) offre une consultation
  // historique ; cette liste ne montre que ce que la session vient de créer,
  // pour permettre la validation immédiate d'une écriture brouillon (impôt).
  const [sessionEntries, setSessionEntries] = useState<JournalEntry[]>([]);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounting", "accounts"],
    queryFn: () => accountingApi.accounts.list().then((r) => r.data as Account[]),
  });
  const accountLabel = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} — ${a.label}` : id.slice(0, 8);
  };

  // Exercice courant — la clôture d'un autre exercice se fait au besoin via
  // ce sélecteur d'année (§ Fiscalité libyenne : impôt société brouillon
  // bloquant tant qu'il n'est pas validé, voir bannière ci-dessous).
  const [year, setYear] = useState(() => dayjs().year());

  const { data: fiscalYear } = useQuery({
    queryKey: ["accounting", "fiscal-year", year],
    queryFn: () => accountingApi.fiscalYears.get(year).then((r) => r.data as FiscalYear),
  });
  const isClosed = fiscalYear?.status === "CLOSED";

  const lines = Form.useWatch("lines", form) as JournalEntryLine[] | undefined;
  const totalDebit = (lines ?? []).reduce((s, l) => s + (Number(l?.debit) || 0), 0);
  const totalCredit = (lines ?? []).reduce((s, l) => s + (Number(l?.credit) || 0), 0);
  const isBalanced = lines && lines.length >= 2 && totalDebit === totalCredit && totalDebit > 0;

  const save = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      accountingApi.journalEntries.create({
        ...values,
        date: dayjs(values.date as dayjs.Dayjs).format("YYYY-MM-DD"),
      }),
    onSuccess: (res) => {
      message.success(t("saved"));
      setSessionEntries((prev) => [res.data as JournalEntry, ...prev]);
      queryClient.invalidateQueries({ queryKey: ["accounting"] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const validateEntry = useMutation({
    mutationFn: (id: string) => accountingApi.journalEntries.validate(id),
    onSuccess: (res) => {
      message.success(t("entryValidated"));
      const updated = res.data as JournalEntry;
      setSessionEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const closeYear = useMutation({
    mutationFn: () => accountingApi.fiscalYears.close(year),
    onSuccess: (res) => {
      const data = res.data as { fiscalYear: FiscalYear; draftTaxEntry: JournalEntry | null };
      if (data.draftTaxEntry) {
        setSessionEntries((prev) => [data.draftTaxEntry as JournalEntry, ...prev]);
      }
      if (data.fiscalYear.status === "CLOSED") {
        message.success(t("fiscalYearClosedSuccess"));
      } else {
        message.info(t("fiscalYearDraftTaxCreated"));
      }
      queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const reopenYear = useMutation({
    mutationFn: () => accountingApi.fiscalYears.reopen(year),
    onSuccess: () => {
      message.success(t("fiscalYearReopenedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ date: dayjs(), lines: [{}, {}] });
    setModalOpen(true);
  };

  const columns = [
    { title: t("reference"), dataIndex: "reference", key: "reference" },
    { title: t("entryDate"), dataIndex: "date", key: "date" },
    { title: t("label"), dataIndex: "label", key: "label" },
    {
      title: t("status"),
      dataIndex: "status",
      key: "status",
      render: (v: JournalEntry["status"]) => (
        <Tag color={v === "DRAFT" ? "orange" : "green"}>{t(`journalEntryStatus_${v}`)}</Tag>
      ),
    },
    {
      title: t("lines"),
      key: "lines",
      render: (_: unknown, r: JournalEntry) => (
        <Space direction="vertical" size={0}>
          {r.lines.map((l, i) => (
            <span key={i} style={{ fontSize: 12 }}>
              {accountLabel(l.accountId)} — {t("debit")} {Number(l.debit).toFixed(2)} /{" "}
              {t("credit")} {Number(l.credit).toFixed(2)}
            </span>
          ))}
        </Space>
      ),
    },
    ...(canManage
      ? [
          {
            title: t("actions"),
            key: "actions",
            render: (_: unknown, r: JournalEntry) =>
              r.status === "DRAFT" ? (
                <Button
                  size="small"
                  icon={<CheckOutlined />}
                  loading={validateEntry.isPending}
                  onClick={() =>
                    modal.confirm({
                      title: t("validateEntryConfirm"),
                      okText: t("confirm"),
                      cancelText: t("cancel"),
                      onOk: () => validateEntry.mutateAsync(r.id),
                    })
                  }
                >
                  {t("validateEntry")}
                </Button>
              ) : null,
          },
        ]
      : []),
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
          {t("journalEntries")}
        </Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("add")}
          </Button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <span style={{ fontWeight: 500 }}>{t("fiscalYear")}</span>
        <InputNumber value={year} onChange={(v) => v && setYear(v)} min={2020} max={2100} />
        <Tag
          color={isClosed ? "red" : "green"}
          icon={isClosed ? <LockOutlined /> : <UnlockOutlined />}
        >
          {isClosed ? t("fiscalYearClosed") : t("fiscalYearOpen")}
        </Tag>
        {canManage && !isClosed && (
          <Button
            size="small"
            icon={<LockOutlined />}
            loading={closeYear.isPending}
            onClick={() =>
              modal.confirm({
                title: t("closeFiscalYearConfirm", { year }),
                content: t("closeFiscalYearConfirmDetail"),
                okText: t("confirm"),
                cancelText: t("cancel"),
                onOk: () => closeYear.mutateAsync(),
              })
            }
          >
            {t("closeFiscalYear")}
          </Button>
        )}
        {canReopen && isClosed && (
          <Button
            size="small"
            danger
            icon={<UnlockOutlined />}
            loading={reopenYear.isPending}
            onClick={() =>
              modal.confirm({
                title: t("reopenFiscalYearConfirm", { year }),
                okText: t("confirm"),
                cancelText: t("cancel"),
                okButtonProps: { danger: true },
                onOk: () => reopenYear.mutateAsync(),
              })
            }
          >
            {t("reopenFiscalYear")}
          </Button>
        )}
      </div>

      <Alert
        style={{ marginBottom: 16 }}
        type="info"
        showIcon
        message={t("draftTaxEntryBannerTitle")}
        description={t("draftTaxEntryBannerDetail")}
      />

      <Table
        rowKey="id"
        dataSource={sessionEntries}
        columns={columns}
        pagination={{ pageSize: 20 }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: t("journalEntriesEmptyHint") }}
      />

      <Modal
        open={modalOpen}
        title={t("newManualEntry")}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okButtonProps={{ disabled: !isBalanced }}
        confirmLoading={save.isPending}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item name="date" label={t("entryDate")} rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="label" label={t("label")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" wrap>
                    <Form.Item
                      name={[field.name, "accountId"]}
                      rules={[{ required: true }]}
                      style={{ minWidth: 220, marginBottom: 0 }}
                    >
                      <Select
                        placeholder={t("account")}
                        showSearch
                        optionFilterProp="label"
                        options={accounts.map((a) => ({
                          value: a.id,
                          label: `${a.code} — ${a.label}`,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "debit"]}
                      initialValue={0}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber min={0} placeholder={t("debit")} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "credit"]}
                      initialValue={0}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber min={0} placeholder={t("credit")} />
                    </Form.Item>
                    <Form.Item name={[field.name, "label"]} style={{ marginBottom: 0 }}>
                      <Input placeholder={t("memo")} />
                    </Form.Item>
                    {fields.length > 2 && (
                      <Button size="small" danger onClick={() => remove(field.name)}>
                        {t("remove")}
                      </Button>
                    )}
                  </Space>
                ))}
                <Button size="small" onClick={() => add()}>
                  {t("addLine")}
                </Button>
              </div>
            )}
          </Form.List>
          <div style={{ marginTop: 12, fontWeight: 500 }}>
            {t("debit")}: {totalDebit.toFixed(2)} — {t("credit")}: {totalCredit.toFixed(2)}{" "}
            {!isBalanced && (
              <Tag color="red" style={{ marginInlineStart: 8 }}>
                {t("entryUnbalanced")}
              </Tag>
            )}
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default JournalEntriesPage;
