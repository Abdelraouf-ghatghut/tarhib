import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Tag,
  Checkbox,
  message,
  Typography,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { financeApi, companiesApi, employeesApi } from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";
import { bilingualName } from "../../lib/bilingualName";
import { useAuth } from "../../hooks/useAuth";

const { Title } = Typography;

interface Company {
  id: string;
  nameAr: string;
  nameEn: string | null;
}

interface Employee {
  id: string;
  firstNameAr: string;
  firstNameEn: string;
  lastNameAr: string;
  lastNameEn: string;
  scope: "TARHIB" | "CLIENT" | null;
}

interface Expense {
  id: string;
  category: "RENT" | "SALARIES" | "UTILITIES" | "MARKETING" | "OTHER";
  label: string;
  amount: number;
  expenseDate: string;
  companyId: string | null;
  employeeId: string | null;
  payrollPeriod: string | null;
  notes: string | null;
}

const CATEGORIES: Expense["category"][] = ["RENT", "SALARIES", "UTILITIES", "MARKETING", "OTHER"];

export function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const { modal } = App.useApp();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("finance.manage");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as Company[]),
  });
  const companyName = (id: string | null) => {
    if (!id) return "—";
    const c = companies.find((x) => x.id === id);
    return c ? bilingualName(c.nameAr, c.nameEn, isAr) : id.slice(0, 8);
  };

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["finance", "expenses"],
    queryFn: () => financeApi.expenses.list().then((r) => r.data as Expense[]),
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as Employee[]),
  });
  const tarhibEmployees = allEmployees.filter((e) => e.scope === "TARHIB");
  const employeeName = (id: string | null) => {
    if (!id) return "—";
    const e = tarhibEmployees.find((x) => x.id === id);
    if (!e) return id.slice(0, 8);
    return isAr ? `${e.firstNameAr} ${e.lastNameAr}` : `${e.firstNameEn} ${e.lastNameEn}`;
  };

  const selectedCategory = Form.useWatch("category", form);

  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload: Record<string, unknown> = {
        ...values,
        expenseDate: dayjs(values.expenseDate as dayjs.Dayjs).format("YYYY-MM-DD"),
      };
      // Un champ vidé (Select allowClear → undefined) doit être envoyé
      // explicitement comme null pour que le backend applique le "clear" —
      // sinon la clé est absente du JSON (undefined n'est pas sérialisable)
      // et le serveur laisse l'ancienne valeur inchangée.
      for (const key of Object.keys(payload)) {
        if (payload[key] === undefined || payload[key] === "") payload[key] = null;
      }
      return editing
        ? financeApi.expenses.update(editing.id, payload)
        : financeApi.expenses.create(payload);
    },
    onSuccess: () => {
      message.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["finance", "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "overview"] });
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => financeApi.expenses.remove(id),
    onSuccess: () => {
      message.success(t("deleted"));
      queryClient.invalidateQueries({ queryKey: ["finance", "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "overview"] });
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const runPayroll = useMutation({
    mutationFn: () =>
      financeApi.payroll.run().then((r) => r.data as { created: number; skipped: number }),
    onSuccess: (result) => {
      message.success(t("payrollGenerated", result));
      queryClient.invalidateQueries({ queryKey: ["finance", "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "overview"] });
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  // Verrouillage de période comptable — une période clôturée bloque toute
  // création/modification/suppression de dépense dessus (voir FinanceService) ;
  // seule une contre-passation (financeApi.expenses.correct) peut la corriger.
  const [periodMonth, setPeriodMonth] = useState(() => dayjs().startOf("month"));
  const period = periodMonth.format("YYYY-MM");
  const canReopenPeriod = hasPermission("company.manage");
  const rowPeriod = (e: Expense) => e.payrollPeriod ?? e.expenseDate.slice(0, 7);

  const { data: periodStatus } = useQuery({
    queryKey: ["finance", "period", period],
    queryFn: () =>
      financeApi.periods
        .get(period)
        .then(
          (r) => r.data as { period: string; status: "OPEN" | "CLOSED"; closedAt: string | null },
        ),
  });
  const isPeriodClosed = periodStatus?.status === "CLOSED";

  const closePeriod = useMutation({
    mutationFn: () => financeApi.periods.close(period),
    onSuccess: () => {
      message.success(t("periodClosedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["finance", "period", period] });
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const reopenPeriod = useMutation({
    mutationFn: () => financeApi.periods.reopen(period),
    onSuccess: () => {
      message.success(t("periodReopenedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["finance", "period", period] });
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  // Correction par contre-passation (période clôturée) — l'originale reste
  // immuable, une ligne d'annulation + (sauf "cancel") de remplacement sont
  // créées dans la période courante ouverte.
  const [correcting, setCorrecting] = useState<Expense | null>(null);
  const [correctForm] = Form.useForm();
  const correctCancelChecked = Form.useWatch("cancel", correctForm) as boolean | undefined;

  const openCorrect = (e: Expense) => {
    setCorrecting(e);
    correctForm.resetFields();
    correctForm.setFieldsValue({
      category: e.category,
      label: e.label,
      amount: e.amount,
      expenseDate: dayjs(),
      companyId: e.companyId,
      notes: e.notes,
      cancel: false,
    });
  };

  const correct = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload: Record<string, unknown> = { ...values };
      if (payload.expenseDate) {
        payload.expenseDate = dayjs(payload.expenseDate as dayjs.Dayjs).format("YYYY-MM-DD");
      }
      if (!correcting) throw new Error("no expense to correct");
      return financeApi.expenses.correct(correcting.id, payload);
    },
    onSuccess: () => {
      message.success(t("correctionSaved"));
      queryClient.invalidateQueries({ queryKey: ["finance", "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "overview"] });
      setCorrecting(null);
      correctForm.resetFields();
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    form.setFieldsValue({ ...e, expenseDate: dayjs(e.expenseDate) });
    setModalOpen(true);
  };

  const columns = [
    {
      title: t("category"),
      dataIndex: "category",
      key: "category",
      render: (v: Expense["category"]) => t(`expenseCategory_${v}`),
    },
    { title: t("label"), dataIndex: "label", key: "label" },
    {
      title: t("amount"),
      dataIndex: "amount",
      key: "amount",
      render: (v: number) => `${v.toFixed(2)} ${t("currencyUnit")}`,
    },
    { title: t("expenseDate"), dataIndex: "expenseDate", key: "expenseDate" },
    { title: t("company"), dataIndex: "companyId", key: "companyId", render: companyName },
    { title: t("employee"), dataIndex: "employeeId", key: "employeeId", render: employeeName },
    {
      title: t("payrollPeriod"),
      dataIndex: "payrollPeriod",
      key: "payrollPeriod",
      render: (v: string | null, r: Expense) =>
        v || r.expenseDate ? (
          <Space size={4}>
            {v ?? "—"}
            {isPeriodClosed && rowPeriod(r) === period && (
              <Tag color="red" icon={<LockOutlined />}>
                {t("periodClosed")}
              </Tag>
            )}
          </Space>
        ) : (
          "—"
        ),
    },
    ...(canManage
      ? [
          {
            title: t("actions"),
            key: "actions",
            render: (_: unknown, r: Expense) =>
              isPeriodClosed && rowPeriod(r) === period ? (
                <Button size="small" icon={<ToolOutlined />} onClick={() => openCorrect(r)}>
                  {t("correctExpense")}
                </Button>
              ) : (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    loading={remove.isPending}
                    onClick={() =>
                      modal.confirm({
                        title: t("deleteConfirm"),
                        okText: t("confirm"),
                        cancelText: t("cancel"),
                        okButtonProps: { danger: true },
                        onOk: () => remove.mutateAsync(r.id),
                      })
                    }
                  />
                </Space>
              ),
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
          {t("expenses")}
        </Title>
        {canManage && (
          <Space>
            <Button
              loading={runPayroll.isPending}
              onClick={() =>
                modal.confirm({
                  title: t("generatePayrollConfirm"),
                  okText: t("confirm"),
                  cancelText: t("cancel"),
                  onOk: () => runPayroll.mutateAsync(),
                })
              }
            >
              {t("generatePayroll")}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              {t("add")}
            </Button>
          </Space>
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
        <span style={{ fontWeight: 500 }}>{t("accountingPeriod")}</span>
        <DatePicker
          picker="month"
          value={periodMonth}
          allowClear={false}
          onChange={(v) => v && setPeriodMonth(v)}
        />
        <Tag
          color={isPeriodClosed ? "red" : "green"}
          icon={isPeriodClosed ? <LockOutlined /> : <UnlockOutlined />}
        >
          {isPeriodClosed ? t("periodClosed") : t("periodOpen")}
        </Tag>
        {canManage && !isPeriodClosed && (
          <Button
            size="small"
            icon={<LockOutlined />}
            loading={closePeriod.isPending}
            onClick={() =>
              modal.confirm({
                title: t("closePeriodConfirm", { period }),
                okText: t("confirm"),
                cancelText: t("cancel"),
                onOk: () => closePeriod.mutateAsync(),
              })
            }
          >
            {t("closePeriod")}
          </Button>
        )}
        {canReopenPeriod && isPeriodClosed && (
          <Button
            size="small"
            danger
            icon={<UnlockOutlined />}
            loading={reopenPeriod.isPending}
            onClick={() =>
              modal.confirm({
                title: t("reopenPeriodConfirm", { period }),
                okText: t("confirm"),
                cancelText: t("cancel"),
                okButtonProps: { danger: true },
                onOk: () => reopenPeriod.mutateAsync(),
              })
            }
          >
            {t("reopenPeriod")}
          </Button>
        )}
      </div>

      <Table
        rowKey="id"
        dataSource={expenses}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: "max-content" }}
      />

      <Modal
        open={modalOpen}
        title={editing ? t("edit") : t("add")}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item name="category" label={t("category")} rules={[{ required: true }]}>
            <Select
              options={CATEGORIES.map((v) => ({ value: v, label: t(`expenseCategory_${v}`) }))}
            />
          </Form.Item>
          <Form.Item name="label" label={t("label")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label={t("amount")} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} addonAfter={t("currencyUnit")} />
          </Form.Item>
          <Form.Item name="expenseDate" label={t("expenseDate")} rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          {/* Sans objet pour les salaires : les employés Tarhib travaillent
              directement pour Tarhib, aucune société cliente n'est liée à
              cette dépense (voir FinanceService — forcé à null côté serveur
              même si ce champ était renseigné avant un changement de catégorie). */}
          {selectedCategory !== "SALARIES" && (
            <Form.Item name="companyId" label={t("companyOptional")}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={companies.map((c) => ({ value: c.id, label: companyName(c.id) }))}
              />
            </Form.Item>
          )}
          {selectedCategory === "SALARIES" && (
            <Form.Item name="employeeId" label={t("employee")} rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                disabled={!!editing}
                options={tarhibEmployees.map((e) => ({ value: e.id, label: employeeName(e.id) }))}
              />
            </Form.Item>
          )}
          <Form.Item name="notes" label={t("notes")}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!correcting}
        title={t("correctExpense")}
        onCancel={() => {
          setCorrecting(null);
          correctForm.resetFields();
        }}
        onOk={() => correctForm.submit()}
        confirmLoading={correct.isPending}
        destroyOnClose
      >
        <Form form={correctForm} layout="vertical" onFinish={(v) => correct.mutate(v)}>
          <Form.Item
            name="reason"
            label={t("correctionReason")}
            rules={[{ required: true, min: 3 }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="cancel" valuePropName="checked">
            <Checkbox>{t("cancelExpense")}</Checkbox>
          </Form.Item>
          {!correctCancelChecked && (
            <>
              <Form.Item name="category" label={t("category")}>
                <Select
                  options={CATEGORIES.map((v) => ({ value: v, label: t(`expenseCategory_${v}`) }))}
                />
              </Form.Item>
              <Form.Item name="label" label={t("label")}>
                <Input />
              </Form.Item>
              <Form.Item name="amount" label={t("amount")}>
                <InputNumber min={0} style={{ width: "100%" }} addonAfter={t("currencyUnit")} />
              </Form.Item>
              <Form.Item name="expenseDate" label={t("expenseDate")}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
              {correcting?.category !== "SALARIES" && (
                <Form.Item name="companyId" label={t("companyOptional")}>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={companies.map((c) => ({ value: c.id, label: companyName(c.id) }))}
                  />
                </Form.Item>
              )}
              <Form.Item name="notes" label={t("notes")}>
                <Input.TextArea rows={2} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}

export default ExpensesPage;
