import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Form, InputNumber, Modal, Table, Tabs, Typography, message } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { hrApi, employeesApi } from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";
import { useAuth } from "../../hooks/useAuth";

const { Title } = Typography;

interface Employee {
  id: string;
  firstNameAr: string;
  firstNameEn: string;
  lastNameAr: string;
  lastNameEn: string;
}

interface Payslip {
  id: string;
  employeeId: string;
  period: string;
  grossSalary: number;
  cnssEmployeeContribution: number;
  cnssEmployerContribution: number;
  solidarityFundAmount: number;
  jihadTaxAmount: number;
  incomeTaxAmount: number;
  stampDutyAmount: number;
  netPay: number;
}

interface PayrollTaxConfig {
  incomeTaxBracket1Rate: number;
  incomeTaxBracket1Ceiling: number;
  incomeTaxBracket2Rate: number;
  personalExemptionThreshold: number;
  jihadTaxIndividualRate: number;
  solidarityFundRate: number;
  payrollStampDutyRate: number;
  cnssEmployeeRate: number;
  cnssEmployerRate: number;
}

const money = (v: number) => v.toFixed(2);

export function PayslipsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const { hasPermission } = useAuth();
  const canManage = hasPermission("employee.salary.manage");
  const queryClient = useQueryClient();
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as Employee[]),
  });
  const employeeName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    if (!e) return id.slice(0, 8);
    return isAr ? `${e.firstNameAr} ${e.lastNameAr}` : `${e.firstNameEn} ${e.lastNameEn}`;
  };

  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ["hr", "payslips"],
    queryFn: () => hrApi.payslips.list().then((r) => r.data as Payslip[]),
    enabled: canManage,
  });

  const { data: config } = useQuery({
    queryKey: ["hr", "payroll-tax-config"],
    queryFn: () => hrApi.payrollTaxConfig.get().then((r) => r.data as PayrollTaxConfig),
    enabled: canManage,
  });

  const saveConfig = useMutation({
    mutationFn: (values: Record<string, unknown>) => hrApi.payrollTaxConfig.update(values),
    onSuccess: () => {
      message.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["hr", "payroll-tax-config"] });
      setConfigModalOpen(false);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const openConfig = () => {
    form.setFieldsValue(config);
    setConfigModalOpen(true);
  };

  const columns = [
    { title: t("employee"), dataIndex: "employeeId", key: "employeeId", render: employeeName },
    { title: t("payrollPeriod"), dataIndex: "period", key: "period" },
    { title: t("grossSalary"), dataIndex: "grossSalary", key: "grossSalary", render: money },
    {
      title: t("cnssEmployee"),
      dataIndex: "cnssEmployeeContribution",
      key: "cnssEmployeeContribution",
      render: money,
    },
    {
      title: t("solidarityFund"),
      dataIndex: "solidarityFundAmount",
      key: "solidarityFundAmount",
      render: money,
    },
    { title: t("jihadTax"), dataIndex: "jihadTaxAmount", key: "jihadTaxAmount", render: money },
    { title: t("incomeTax"), dataIndex: "incomeTaxAmount", key: "incomeTaxAmount", render: money },
    { title: t("stampDuty"), dataIndex: "stampDutyAmount", key: "stampDutyAmount", render: money },
    { title: t("netPay"), dataIndex: "netPay", key: "netPay", render: money },
    {
      title: t("cnssEmployer"),
      dataIndex: "cnssEmployerContribution",
      key: "cnssEmployerContribution",
      render: money,
    },
  ];

  if (!canManage) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={3}>{t("payslips")}</Title>
        <p>{t("payslipsNoAccess")}</p>
      </div>
    );
  }

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
          {t("payslips")}
        </Title>
        <Button icon={<SettingOutlined />} onClick={openConfig}>
          {t("payrollTaxConfig")}
        </Button>
      </div>

      <Table
        rowKey="id"
        dataSource={payslips}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: "max-content" }}
      />

      <Modal
        open={configModalOpen}
        title={t("payrollTaxConfig")}
        onCancel={() => setConfigModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveConfig.isPending}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveConfig.mutate(v)}>
          <Tabs
            items={[
              {
                key: "income-tax",
                label: t("incomeTax"),
                children: (
                  <>
                    <Form.Item name="incomeTaxBracket1Rate" label={t("incomeTaxBracket1Rate")}>
                      <InputNumber min={0} addonAfter="%" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item
                      name="incomeTaxBracket1Ceiling"
                      label={t("incomeTaxBracket1Ceiling")}
                    >
                      <InputNumber
                        min={0}
                        addonAfter={t("currencyUnit")}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                    <Form.Item name="incomeTaxBracket2Rate" label={t("incomeTaxBracket2Rate")}>
                      <InputNumber min={0} addonAfter="%" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item
                      name="personalExemptionThreshold"
                      label={t("personalExemptionThreshold")}
                    >
                      <InputNumber
                        min={0}
                        addonAfter={t("currencyUnit")}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: "other",
                label: t("otherRates"),
                children: (
                  <>
                    <Form.Item name="jihadTaxIndividualRate" label={t("jihadTaxIndividualRate")}>
                      <InputNumber min={0} addonAfter="%" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="solidarityFundRate" label={t("solidarityFundRateLabel")}>
                      <InputNumber min={0} addonAfter="%" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="payrollStampDutyRate" label={t("payrollStampDutyRate")}>
                      <InputNumber min={0} addonAfter="%" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="cnssEmployeeRate" label={t("cnssEmployeeRate")}>
                      <InputNumber min={0} addonAfter="%" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="cnssEmployerRate" label={t("cnssEmployerRate")}>
                      <InputNumber min={0} addonAfter="%" style={{ width: "100%" }} />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </div>
  );
}

export default PayslipsPage;
