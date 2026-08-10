import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckOutlined,
  DollarOutlined,
  DownloadOutlined,
  LineChartOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { companiesApi, performanceManagementApi, productsAdminApi } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

const { Title } = Typography;
type Company = { id: string; nameAr: string; nameEn: string };
type Invoice = {
  id: string;
  number: string;
  companyId: string;
  issueDate: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  currency: string;
};
type Budget = {
  id: string;
  fiscalYear: number;
  version: number;
  status: string;
  totalAmount: number;
};
type Forecast = {
  id: string;
  kind: string;
  forecastDate: string;
  predictedValue: number;
  lowerBound: number;
  upperBound: number;
  modelVersion: string;
};

export function PerformanceManagementPage() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("finance.manage") || hasPermission("company.manage");
  const queryClient = useQueryClient();
  const [range, setRange] = useState(
    () => [dayjs().startOf("month"), dayjs().endOf("month")] as const,
  );
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [forecastProductId, setForecastProductId] = useState<string>();
  const [invoiceForm] = Form.useForm();
  const [budgetForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [captureForm] = Form.useForm();

  const params = { from: range[0].format("YYYY-MM-DD"), to: range[1].format("YYYY-MM-DD") };
  const { data: summary = {} } = useQuery({
    queryKey: ["performance", "dashboard", params],
    queryFn: () =>
      performanceManagementApi
        .dashboard(params)
        .then((r) => r.data as Record<string, number | null>),
  });
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["performance", "invoices"],
    queryFn: () => performanceManagementApi.invoices.list().then((r) => r.data as Invoice[]),
  });
  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ["performance", "budgets"],
    queryFn: () => performanceManagementApi.budgets.list().then((r) => r.data as Budget[]),
  });
  const { data: forecasts = [], isLoading: forecastsLoading } = useQuery({
    queryKey: ["performance", "forecasts"],
    queryFn: () => performanceManagementApi.forecasts.list().then((r) => r.data as Forecast[]),
  });
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as Company[]),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products-admin", "forecast"],
    queryFn: () =>
      productsAdminApi
        .list()
        .then((r) => r.data as Array<{ id: string; nameAr: string; nameEn: string }>),
  });
  const companyOptions = companies.map((c) => ({
    value: c.id,
    label: i18n.language.startsWith("ar") ? c.nameAr : c.nameEn || c.nameAr,
  }));
  const enumLabel = (group: string, value: string) =>
    t(`${group}_${value}`, { defaultValue: value });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["performance"] });
  const mutate = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      message.success(t("saved"));
      refresh();
    },
    onError: () => message.error(t("operationFailed")),
  });
  const downloadInvoice = async (invoice: Invoice) => {
    try {
      const language = i18n.resolvedLanguage?.split("-")[0] ?? "en";
      const response = await performanceManagementApi.invoices.pdf(invoice.id, language);
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.number}-${language}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error(t("operationFailed"));
    }
  };

  const overview = (
    <>
      <Row gutter={[16, 16]}>
        {[
          ["recognizedRevenue", "recognizedRevenue", "success"],
          ["billedRevenue", "billedRevenue", "brand"],
          ["collectedRevenue", "collectedRevenue", "success"],
          ["receivables", "receivables", "danger"],
          ["directCosts", "directCosts", "danger"],
          ["grossMargin", "grossMargin", "success"],
          ["budgetVariance", "budgetVariance", "brand"],
        ].map(([key, label]) => (
          <Col xs={24} sm={12} xl={6} key={key}>
            <Card>
              <Statistic
                title={t(label)}
                value={summary[key] ?? 0}
                precision={2}
                suffix={t("currencyUnit")}
              />
            </Card>
          </Col>
        ))}
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title={t("grossMarginRate")}
              value={summary.grossMarginRate ?? "—"}
              suffix={summary.grossMarginRate == null ? undefined : "%"}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title={t("customerSatisfactionIndex")}
              value={summary.csat ?? "—"}
              suffix={summary.csat == null ? undefined : "%"}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card>
            <Statistic
              title={t("noShowRate")}
              value={summary.noShowRate ?? "—"}
              suffix={summary.noShowRate == null ? undefined : "%"}
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  const invoiceTab = (
    <>
      {canManage && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setInvoiceOpen(true)}
          style={{ marginBottom: 16 }}
        >
          {t("newInvoice")}
        </Button>
      )}
      <Table
        rowKey="id"
        loading={invoicesLoading}
        dataSource={invoices}
        scroll={{ x: 900 }}
        columns={[
          { title: t("invoiceNumber"), dataIndex: "number" },
          {
            title: t("company"),
            dataIndex: "companyId",
            render: (id: string) =>
              companyOptions.find((c) => c.value === id)?.label ?? id.slice(0, 8),
          },
          { title: t("issueDate"), dataIndex: "issueDate" },
          { title: t("dueDate"), dataIndex: "dueDate" },
          {
            title: t("status"),
            dataIndex: "status",
            render: (v: string) => <Tag>{enumLabel("invoiceStatus", v)}</Tag>,
          },
          {
            title: t("total"),
            dataIndex: "totalAmount",
            render: (v: number, row: Invoice) => `${Number(v).toFixed(2)} ${row.currency}`,
          },
          {
            title: t("paidAmount"),
            dataIndex: "paidAmount",
            render: (v: number) => Number(v).toFixed(2),
          },
          {
            title: t("actions"),
            render: (_: unknown, row: Invoice) => (
              <Space>
                {canManage && row.status === "DRAFT" && (
                  <Button
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={() =>
                      mutate.mutate(() => performanceManagementApi.invoices.issue(row.id))
                    }
                  >
                    {t("issue")}
                  </Button>
                )}
                {canManage && ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(row.status) && (
                  <Button
                    size="small"
                    icon={<DollarOutlined />}
                    onClick={() => setPaymentInvoice(row)}
                  >
                    {t("recordPayment")}
                  </Button>
                )}
                {row.status !== "DRAFT" && (
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => downloadInvoice(row)}
                    aria-label={t("downloadPdf")}
                  >
                    {t("downloadPdf")}
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
    </>
  );

  const budgetTab = (
    <>
      {canManage && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setBudgetOpen(true)}
          style={{ marginBottom: 16 }}
        >
          {t("newBudget")}
        </Button>
      )}
      <Table
        rowKey="id"
        loading={budgetsLoading}
        dataSource={budgets}
        columns={[
          { title: t("fiscalYear"), dataIndex: "fiscalYear" },
          { title: t("version"), dataIndex: "version" },
          {
            title: t("status"),
            dataIndex: "status",
            render: (v: string) => <Tag>{enumLabel("budgetStatus", v)}</Tag>,
          },
          {
            title: t("budget"),
            dataIndex: "totalAmount",
            render: (v: number) => Number(v).toFixed(2),
          },
          {
            title: t("actions"),
            render: (_: unknown, row: Budget) =>
              canManage && (
                <Space>
                  {row.status === "DRAFT" && (
                    <Button
                      size="small"
                      onClick={() =>
                        mutate.mutate(() =>
                          performanceManagementApi.budgets.status(row.id, "SUBMITTED"),
                        )
                      }
                    >
                      {t("submit")}
                    </Button>
                  )}
                  {row.status === "SUBMITTED" && (
                    <Button
                      size="small"
                      onClick={() =>
                        mutate.mutate(() =>
                          performanceManagementApi.budgets.status(row.id, "APPROVED"),
                        )
                      }
                    >
                      {t("approve")}
                    </Button>
                  )}
                  {row.status === "APPROVED" && (
                    <Button
                      size="small"
                      onClick={() =>
                        mutate.mutate(() =>
                          performanceManagementApi.budgets.status(row.id, "LOCKED"),
                        )
                      }
                    >
                      {t("lock")}
                    </Button>
                  )}
                </Space>
              ),
          },
        ]}
      />
    </>
  );

  const captureTab = (
    <Card title={t("operationalDataCapture")}>
      <Form
        form={captureForm}
        layout="vertical"
        onFinish={(v) => {
          const action = v.kind;
          if (action === "COST")
            return mutate.mutate(() => performanceManagementApi.costs.create(v));
          if (action === "FEEDBACK")
            return mutate.mutate(() => performanceManagementApi.feedback.create(v));
          return mutate.mutate(() =>
            performanceManagementApi.attendance.set(v.bookingId, {
              status: v.status,
              actualParticipants: v.actualParticipants,
              absenceReason: v.absenceReason,
            }),
          );
        }}
      >
        <Form.Item name="kind" label={t("dataType")} rules={[{ required: true }]}>
          <Select
            options={[
              { value: "COST", label: t("orderCost") },
              { value: "FEEDBACK", label: t("satisfaction") },
              { value: "ATTENDANCE", label: t("attendance") },
            ]}
          />
        </Form.Item>
        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) =>
            getFieldValue("kind") === "COST" ? (
              <Row gutter={12}>
                <Col span={24}>
                  <Form.Item name="orderId" label={t("orderId")} rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                {["productCost", "laborCost", "deliveryCost", "overheadCost"].map((k) => (
                  <Col xs={24} sm={12} key={k}>
                    <Form.Item name={k} label={t(k)} initialValue={0}>
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            ) : getFieldValue("kind") === "FEEDBACK" ? (
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
                    <Select options={companyOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="orderId" label={t("orderId")}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="bookingId" label={t("bookingId")}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="rating" label={t("rating")} rules={[{ required: true }]}>
                    <InputNumber min={1} max={5} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="comment" label={t("comment")}>
                    <Input.TextArea />
                  </Form.Item>
                </Col>
              </Row>
            ) : getFieldValue("kind") === "ATTENDANCE" ? (
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item name="bookingId" label={t("bookingId")} rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="status" label={t("status")} rules={[{ required: true }]}>
                    <Select
                      options={["PENDING", "CHECKED_IN", "COMPLETED", "NO_SHOW"].map((v) => ({
                        value: v,
                        label: enumLabel("attendanceStatus", v),
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="actualParticipants" label={t("actualParticipants")}>
                    <InputNumber min={0} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="absenceReason" label={t("reason")}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            ) : null
          }
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            {t("save")}
          </Button>
          <Button
            onClick={() => mutate.mutate(() => performanceManagementApi.attendance.markNoShows())}
          >
            {t("detectNoShows")}
          </Button>
        </Space>
      </Form>
    </Card>
  );

  const forecastTab = (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t("productForStockForecast")}
          value={forecastProductId}
          onChange={setForecastProductId}
          style={{ minWidth: 220 }}
          options={products.map((p) => ({
            value: p.id,
            label: i18n.language.startsWith("ar") ? p.nameAr : p.nameEn || p.nameAr,
          }))}
        />
        {["DEMAND", "STOCK", "CASH"].map((kind) => (
          <Button
            key={kind}
            disabled={kind === "STOCK" && !forecastProductId}
            icon={<LineChartOutlined />}
            onClick={() =>
              mutate.mutate(() =>
                performanceManagementApi.forecasts.generate({
                  kind,
                  horizonDays: 14,
                  ...(kind === "STOCK" ? { entityId: forecastProductId } : {}),
                }),
              )
            }
          >
            {t("generate")} {enumLabel("forecastKind", kind)}
          </Button>
        ))}
      </Space>
      <Table
        rowKey="id"
        loading={forecastsLoading}
        dataSource={forecasts}
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: t("type"),
            dataIndex: "kind",
            render: (v: string) => enumLabel("forecastKind", v),
          },
          { title: t("date"), dataIndex: "forecastDate" },
          {
            title: t("forecast"),
            dataIndex: "predictedValue",
            render: (v: number, row: Forecast) => (
              <Space direction="vertical" size={0}>
                <span>{Number(v).toFixed(2)}</span>
                <Progress
                  percent={Math.min(
                    100,
                    Math.round((Number(v) / Math.max(1, Number(row.upperBound))) * 100),
                  )}
                  showInfo={false}
                  size="small"
                />
              </Space>
            ),
          },
          { title: t("lowerBound"), dataIndex: "lowerBound" },
          { title: t("upperBound"), dataIndex: "upperBound" },
          { title: t("model"), dataIndex: "modelVersion" },
        ]}
      />
    </>
  );

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          {t("performanceManagement")}
        </Title>
        <Space>
          <DatePicker.RangePicker
            value={[range[0], range[1]]}
            onChange={(v) => v?.[0] && v?.[1] && setRange([v[0], v[1]])}
          />
          <Button icon={<ReloadOutlined />} onClick={refresh} />
        </Space>
      </div>
      <Tabs
        items={[
          { key: "overview", label: t("overview"), children: overview },
          { key: "invoices", label: t("invoices"), children: invoiceTab },
          { key: "budgets", label: t("budgets"), children: budgetTab },
          { key: "capture", label: t("dataCapture"), children: captureTab },
          { key: "forecasts", label: t("forecasts"), children: forecastTab },
        ]}
      />

      <Modal
        open={invoiceOpen}
        title={t("newInvoice")}
        onCancel={() => setInvoiceOpen(false)}
        onOk={() => invoiceForm.submit()}
        destroyOnHidden
      >
        <Form
          form={invoiceForm}
          layout="vertical"
          onFinish={(v) =>
            mutate.mutate(() =>
              performanceManagementApi.invoices
                .create({
                  ...v,
                  issueDate: v.issueDate.format("YYYY-MM-DD"),
                  dueDate: v.dueDate.format("YYYY-MM-DD"),
                  serviceFrom: v.serviceRange[0].format("YYYY-MM-DD"),
                  serviceTo: v.serviceRange[1].format("YYYY-MM-DD"),
                })
                .then((r) => {
                  setInvoiceOpen(false);
                  invoiceForm.resetFields();
                  return r;
                }),
            )
          }
        >
          <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={companyOptions} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="issueDate" label={t("issueDate")} rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dueDate" label={t("dueDate")} rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="serviceRange" label={t("servicePeriod")} rules={[{ required: true }]}>
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.List name="lines" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Space key={key} align="baseline" wrap>
                    <Form.Item name={[name, "description"]} rules={[{ required: true }]}>
                      <Input placeholder={t("description")} />
                    </Form.Item>
                    <Form.Item name={[name, "quantity"]} initialValue={1}>
                      <InputNumber min={0.01} placeholder={t("quantity")} />
                    </Form.Item>
                    <Form.Item name={[name, "unitPrice"]} rules={[{ required: true }]}>
                      <InputNumber min={0} placeholder={t("unitPrice")} />
                    </Form.Item>
                    <Form.Item name={[name, "taxRate"]} initialValue={0}>
                      <InputNumber min={0} max={100} suffix="%" />
                    </Form.Item>
                    {fields.length > 1 && <Button onClick={() => remove(name)}>×</Button>}
                  </Space>
                ))}
                <Button onClick={() => add()} icon={<PlusOutlined />}>
                  {t("addLine")}
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
      <Modal
        open={!!paymentInvoice}
        title={t("recordPayment")}
        onCancel={() => setPaymentInvoice(null)}
        onOk={() => paymentForm.submit()}
        destroyOnHidden
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={(v) =>
            paymentInvoice &&
            mutate.mutate(() =>
              performanceManagementApi.invoices
                .pay(paymentInvoice.id, { ...v, paidAt: v.paidAt.toISOString() })
                .then((r) => {
                  setPaymentInvoice(null);
                  paymentForm.resetFields();
                  return r;
                }),
            )
          }
        >
          <Form.Item name="amount" label={t("amount")} rules={[{ required: true }]}>
            <InputNumber min={0.01} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="paidAt"
            label={t("date")}
            rules={[{ required: true }]}
            initialValue={dayjs()}
          >
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="method" label={t("paymentMethod")} rules={[{ required: true }]}>
            <Select
              options={["BANK_TRANSFER", "CARD", "CASH", "OTHER"].map((v) => ({
                value: v,
                label: enumLabel("paymentMethod", v),
              }))}
            />
          </Form.Item>
          <Form.Item name="reference" label={t("reference")}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={budgetOpen}
        title={t("newBudget")}
        onCancel={() => setBudgetOpen(false)}
        onOk={() => budgetForm.submit()}
        destroyOnHidden
      >
        <Form
          form={budgetForm}
          layout="vertical"
          onFinish={(v) =>
            mutate.mutate(() =>
              performanceManagementApi.budgets.create(v).then((r) => {
                setBudgetOpen(false);
                budgetForm.resetFields();
                return r;
              }),
            )
          }
        >
          <Form.Item
            name="fiscalYear"
            label={t("fiscalYear")}
            initialValue={dayjs().year()}
            rules={[{ required: true }]}
          >
            <InputNumber min={2020} />
          </Form.Item>
          <Form.Item name="companyId" label={t("company")}>
            <Select allowClear options={companyOptions} />
          </Form.Item>
          <Form.List
            name="lines"
            initialValue={[{ period: `${dayjs().year()}-01`, costCenter: "OPERATIONS" }]}
          >
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Space key={key} align="baseline" wrap>
                    <Form.Item name={[name, "period"]} rules={[{ required: true }]}>
                      <Input placeholder="YYYY-MM" />
                    </Form.Item>
                    <Form.Item name={[name, "costCenter"]} rules={[{ required: true }]}>
                      <Select
                        placeholder={t("costCenter")}
                        options={[{ value: "OPERATIONS", label: t("costCenterOperations") }]}
                      />
                    </Form.Item>
                    <Form.Item name={[name, "accountCode"]}>
                      <Input placeholder={t("accountCode")} />
                    </Form.Item>
                    <Form.Item name={[name, "amount"]} rules={[{ required: true }]}>
                      <InputNumber min={0} placeholder={t("amount")} />
                    </Form.Item>
                    {fields.length > 1 && <Button onClick={() => remove(name)}>×</Button>}
                  </Space>
                ))}
                <Button onClick={() => add()} icon={<PlusOutlined />}>
                  {t("addLine")}
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}

export default PerformanceManagementPage;
