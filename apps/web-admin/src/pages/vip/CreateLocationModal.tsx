import { Button, Form, Input, InputNumber, Modal, Select, Space } from "antd";
import { useTranslation } from "react-i18next";
import type { UseMutationResult } from "@tanstack/react-query";
import type { Employee, NamedEntity, VipProduct } from "./types";

export function CreateLocationModal({
  open,
  onClose,
  companies,
  branches,
  departments,
  employees,
  vipProducts,
  createCompanyId,
  createBranchId,
  createLocation,
  label,
  employeeLabel,
  productLabel,
  form,
}: {
  open: boolean;
  onClose: () => void;
  companies: NamedEntity[];
  branches: NamedEntity[];
  departments: NamedEntity[];
  employees: Employee[];
  vipProducts: VipProduct[];
  createCompanyId: string | undefined;
  createBranchId: string | undefined;
  createLocation: UseMutationResult<unknown, unknown, Record<string, unknown>>;
  label: (e: NamedEntity) => string;
  employeeLabel: (e: Employee) => string;
  productLabel: (p: VipProduct) => string;
  form: ReturnType<typeof Form.useForm>[0];
}) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      title={t("newVipLocation")}
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={createLocation.isPending}
      okText={t("save")}
      cancelText={t("cancel")}
      destroyOnClose
      width={640}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginBlockStart: 16 }}
        onFinish={(v) => createLocation.mutate(v as Record<string, unknown>)}
      >
        <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            options={companies.map((c) => ({ value: c.id, label: label(c) }))}
            onChange={() => {
              form.setFieldValue("branchId", undefined);
              form.setFieldValue("departmentId", undefined);
              form.setFieldValue("assignedEmployeeId", undefined);
            }}
          />
        </Form.Item>
        <Form.Item name="branchId" label={t("branch")} rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            disabled={!createCompanyId}
            placeholder={!createCompanyId ? t("noCompanySelected") : undefined}
            options={branches.map((b) => ({ value: b.id, label: label(b) }))}
            onChange={() => form.setFieldValue("departmentId", undefined)}
          />
        </Form.Item>
        <Form.Item name="departmentId" label={t("department")} tooltip={t("vipDepartmentHint")}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={!createBranchId}
            options={departments.map((d) => ({ value: d.id, label: label(d) }))}
          />
        </Form.Item>
        <Form.Item
          name="assignedEmployeeId"
          label={t("assignedEmployee")}
          tooltip={t("vipEmployeeHint")}
        >
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={!createCompanyId}
            options={employees.map((e) => ({ value: e.id, label: employeeLabel(e) }))}
          />
        </Form.Item>
        <Form.Item name="locationName" label={t("locationName")}>
          <Input placeholder={t("locationNamePlaceholder")} />
        </Form.Item>

        <Form.List name="products" initialValue={[{}]}>
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
                      options={vipProducts.map((p) => ({ value: p.id, label: productLabel(p) }))}
                      style={{ minWidth: 200 }}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[name, "quantity"]}
                    initialValue={0}
                    rules={[{ required: true }]}
                  >
                    <InputNumber min={0} placeholder={t("quantity")} />
                  </Form.Item>
                  <Form.Item name={[name, "minThreshold"]} initialValue={0}>
                    <InputNumber min={0} placeholder={t("minThreshold")} />
                  </Form.Item>
                  <Form.Item name={[name, "maxThreshold"]}>
                    <InputNumber min={1} placeholder={t("maxThreshold")} />
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
  );
}
