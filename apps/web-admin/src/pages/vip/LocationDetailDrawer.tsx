import {
  App,
  Button,
  Descriptions,
  Drawer,
  Form,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { UseMutationResult } from "@tanstack/react-query";
import type { GroupedLocation, NamedEntity, VipLocation, VipProduct } from "./types";

export function LocationDetailDrawer({
  selectedLocation,
  onClose,
  isRtl,
  companies,
  label,
  branchName,
  departmentName,
  employeeName,
  productLabel,
  availableProducts,
  addProduct,
  removeProduct,
  onEditProduct,
  replenishPending,
  onReplenish,
  addProductForm,
}: {
  selectedLocation: GroupedLocation | null;
  onClose: () => void;
  isRtl: boolean;
  companies: NamedEntity[];
  label: (e: NamedEntity) => string;
  branchName: (id: string) => string;
  departmentName: (id: string | null) => string;
  employeeName: (id: string | null) => string;
  productLabel: (p: VipProduct) => string;
  availableProducts: VipProduct[];
  addProduct: UseMutationResult<unknown, unknown, Record<string, unknown>>;
  removeProduct: UseMutationResult<unknown, unknown, string>;
  onEditProduct: (product: VipLocation) => void;
  replenishPending: boolean;
  onReplenish: (product: VipLocation) => void;
  addProductForm: ReturnType<typeof Form.useForm>[0];
}) {
  const { t } = useTranslation();
  const { modal } = App.useApp();

  const productColumns = [
    {
      title: isRtl ? t("nameAr") : t("nameEn"),
      key: "name",
      render: (_: unknown, r: VipLocation) => (isRtl ? r.productNameAr : r.productNameEn),
    },
    { title: t("currentStock"), dataIndex: "currentStock", key: "currentStock" },
    { title: t("minThreshold"), dataIndex: "minThreshold", key: "minThreshold" },
    {
      title: t("maxThreshold"),
      dataIndex: "maxThreshold",
      key: "maxThreshold",
      render: (v: number | null) => v ?? "—",
    },
    {
      title: t("status"),
      key: "belowThreshold",
      render: (_: unknown, r: VipLocation) => (
        <Tag color={r.belowThreshold ? "red" : "green"}>
          {r.belowThreshold ? t("belowThreshold") : t("ok")}
        </Tag>
      ),
    },
    {
      title: t("actions"),
      key: "actions",
      render: (_: unknown, r: VipLocation) => (
        <Space>
          {r.belowThreshold && (
            <Button size="small" loading={replenishPending} onClick={() => onReplenish(r)}>
              {t("replenish")}
            </Button>
          )}
          <Tooltip title={t("edit")}>
            <Button size="small" icon={<EditOutlined />} onClick={() => onEditProduct(r)} />
          </Tooltip>
          <Tooltip title={t("removeProduct")}>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() =>
                modal.confirm({
                  title: t("removeProductConfirm"),
                  okText: t("confirm"),
                  cancelText: t("cancel"),
                  okButtonProps: { danger: true },
                  onOk: () => removeProduct.mutateAsync(r.id),
                })
              }
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Drawer
      title={selectedLocation ? (selectedLocation.locationName ?? t("vipLocations")) : ""}
      open={!!selectedLocation}
      onClose={onClose}
      width={560}
    >
      {selectedLocation && (
        <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label={t("company")}>
              {companies.find((c) => c.id === selectedLocation.companyId)
                ? label(companies.find((c) => c.id === selectedLocation.companyId)!)
                : selectedLocation.companyId.slice(0, 8)}
            </Descriptions.Item>
            <Descriptions.Item label={t("branch")}>
              {branchName(selectedLocation.branchId)}
            </Descriptions.Item>
            <Descriptions.Item label={t("department")}>
              {departmentName(selectedLocation.departmentId)}
            </Descriptions.Item>
            <Descriptions.Item label={t("assignedEmployee")}>
              {employeeName(selectedLocation.assignedEmployeeId)}
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginBlockStart: 20, marginBlockEnd: 8 }}>
            {t("productCount")}
          </Typography.Title>
          <Table
            rowKey="id"
            size="small"
            dataSource={selectedLocation.products}
            columns={productColumns}
            pagination={false}
          />

          <Typography.Title level={5} style={{ marginBlockStart: 20, marginBlockEnd: 8 }}>
            {t("addProductToLocation")}
          </Typography.Title>
          {availableProducts.length === 0 ? (
            <Typography.Text type="secondary">{t("noProductsAvailable")}</Typography.Text>
          ) : (
            <Form
              form={addProductForm}
              layout="inline"
              onFinish={(v) => addProduct.mutate(v as Record<string, unknown>)}
              style={{ rowGap: 8 }}
            >
              <Form.Item name="productId" rules={[{ required: true }]} style={{ minWidth: 200 }}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder={t("product")}
                  options={availableProducts.map((p) => ({
                    value: p.id,
                    label: productLabel(p),
                  }))}
                />
              </Form.Item>
              <Form.Item name="quantity" initialValue={0} rules={[{ required: true }]}>
                <InputNumber min={0} placeholder={t("quantity")} />
              </Form.Item>
              <Form.Item name="minThreshold" initialValue={0}>
                <InputNumber min={0} placeholder={t("minThreshold")} />
              </Form.Item>
              <Form.Item name="maxThreshold">
                <InputNumber min={1} placeholder={t("maxThreshold")} />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlusOutlined />}
                  loading={addProduct.isPending}
                >
                  {t("addProduct")}
                </Button>
              </Form.Item>
            </Form>
          )}
        </>
      )}
    </Drawer>
  );
}
