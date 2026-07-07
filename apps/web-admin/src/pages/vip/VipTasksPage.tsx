import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Tag,
  Button,
  Space,
  Select,
  Typography,
  Row,
  Col,
  Statistic,
  Card,
  message,
  Tooltip,
  Modal,
  Form,
  Input,
  InputNumber,
  Drawer,
  Descriptions,
  Popconfirm,
} from "antd";
import {
  CheckOutlined,
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  vipSelfServiceApi,
  companiesApi,
  branchesApi,
  departmentsApi,
  employeesApi,
  productsAdminApi,
} from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";
import { bilingualName } from "../../lib/bilingualName";

const { Title } = Typography;

type TaskStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED";

interface VipTask {
  id: string;
  productId: string;
  branchId: string;
  companyId: string;
  locationName: string | null;
  requestedQty: number;
  status: TaskStatus;
  assignedAgentId: string | null;
  completedBy: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface VipLocation {
  id: string;
  vipLocationId: string;
  productId: string;
  productNameAr: string;
  productNameEn: string;
  locationName: string | null;
  branchId: string;
  companyId: string;
  departmentId: string | null;
  assignedEmployeeId: string | null;
  currentStock: number;
  minThreshold: number;
  maxThreshold: number | null;
  belowThreshold: boolean;
  openTaskId: string | null;
}

interface GroupedLocation {
  vipLocationId: string;
  companyId: string;
  branchId: string;
  departmentId: string | null;
  assignedEmployeeId: string | null;
  locationName: string | null;
  products: VipLocation[];
}

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
  companyId?: string;
  branchId?: string;
}

interface Employee {
  id: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
  email: string;
  companyId: string | null;
}

interface VipProduct {
  id: string;
  nameAr: string;
  nameEn: string;
  type: string;
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  OPEN: "orange",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
};

export default function VipTasksPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isRtl = i18n.dir() === "rtl";
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>(undefined);

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery<VipTask[]>({
    queryKey: ["vipTasks", statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await vipSelfServiceApi.tasks(params);
      return res.data as VipTask[];
    },
  });

  const {
    data: locations = [],
    isLoading: locationsLoading,
    refetch: refetchLocations,
  } = useQuery<VipLocation[]>({
    queryKey: ["vipLocations"],
    queryFn: async () => {
      const res = await vipSelfServiceApi.locations();
      return res.data as VipLocation[];
    },
  });

  const groupedLocations = useMemo<GroupedLocation[]>(() => {
    const map = new Map<string, GroupedLocation>();
    for (const loc of locations) {
      let group = map.get(loc.vipLocationId);
      if (!group) {
        group = {
          vipLocationId: loc.vipLocationId,
          companyId: loc.companyId,
          branchId: loc.branchId,
          departmentId: loc.departmentId,
          assignedEmployeeId: loc.assignedEmployeeId,
          locationName: loc.locationName,
          products: [],
        };
        map.set(loc.vipLocationId, group);
      }
      group.products.push(loc);
    }
    return Array.from(map.values());
  }, [locations]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const createCompanyId = Form.useWatch("companyId", createForm) as string | undefined;
  const createBranchId = Form.useWatch("branchId", createForm) as string | undefined;

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const selectedLocation =
    groupedLocations.find((g) => g.vipLocationId === selectedLocationId) ?? null;

  const [addProductForm] = Form.useForm();
  const [editingProduct, setEditingProduct] = useState<VipLocation | null>(null);
  const [editForm] = Form.useForm();

  // Chargés une fois globalement (résolution des noms dans le tableau +
  // options des sélecteurs en cascade du formulaire de création)
  const { data: companies = [] } = useQuery<NamedEntity[]>({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
  });
  const { data: allBranches = [] } = useQuery<NamedEntity[]>({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list().then((r) => r.data as NamedEntity[]),
  });
  const { data: allDepartments = [] } = useQuery<NamedEntity[]>({
    queryKey: ["departments"],
    queryFn: () => departmentsApi.list().then((r) => r.data as NamedEntity[]),
  });
  const { data: allEmployees = [] } = useQuery<(Employee & { scope?: string })[]>({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as (Employee & { scope?: string })[]),
  });
  const employees = allEmployees.filter((e) => (e.scope ?? "CLIENT") === "CLIENT");
  const branches = createCompanyId
    ? allBranches.filter((b) => b.companyId === createCompanyId)
    : allBranches;
  const departments = createBranchId
    ? allDepartments.filter((d) => d.branchId === createBranchId)
    : allDepartments;
  const { data: allProducts = [] } = useQuery<VipProduct[]>({
    queryKey: ["products-admin"],
    queryFn: () => productsAdminApi.list().then((r) => r.data as VipProduct[]),
  });
  const vipProducts = allProducts.filter((p) => p.type === "LIBRE_SERVICE_VIP");

  const label = (e: NamedEntity) => bilingualName(e.nameAr, e.nameEn, isRtl);
  const productLabel = (p: VipProduct) => bilingualName(p.nameAr, p.nameEn, isRtl);
  const employeeLabel = (e: Employee) =>
    (isRtl ? `${e.firstNameAr} ${e.lastNameAr}` : `${e.firstNameEn} ${e.lastNameEn}`).trim() ||
    e.email;
  const branchName = (id: string) => {
    const b = allBranches.find((x) => x.id === id);
    return b ? label(b) : id.substring(0, 8);
  };
  const departmentName = (id: string | null) => {
    if (!id) return "—";
    const d = allDepartments.find((x) => x.id === id);
    return d ? label(d) : id.substring(0, 8);
  };
  const employeeName = (id: string | null) => {
    if (!id) return "—";
    const e = allEmployees.find((x) => x.id === id);
    return e ? employeeLabel(e) : id.substring(0, 8);
  };

  const invalidateVip = () => {
    queryClient.invalidateQueries({ queryKey: ["vipLocations"] });
    queryClient.invalidateQueries({ queryKey: ["vipTasks"] });
  };

  const createLocation = useMutation({
    mutationFn: (values: Record<string, unknown>) => vipSelfServiceApi.createLocation(values),
    onSuccess: () => {
      message.success(t("saved"));
      invalidateVip();
      setCreateOpen(false);
      createForm.resetFields();
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const addProduct = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      vipSelfServiceApi.addProduct(selectedLocation!.vipLocationId, values),
    onSuccess: () => {
      message.success(t("productAdded"));
      invalidateVip();
      addProductForm.resetFields();
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const removeProduct = useMutation({
    mutationFn: (locationProductId: string) => vipSelfServiceApi.removeProduct(locationProductId),
    onSuccess: () => {
      message.success(t("productRemoved"));
      invalidateVip();
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const adjustProduct = useMutation({
    mutationFn: (vars: { id: string; values: Record<string, unknown> }) =>
      vipSelfServiceApi.adjustProduct(vars.id, vars.values),
    onSuccess: () => {
      message.success(t("productUpdated"));
      invalidateVip();
      setEditingProduct(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const completeTask = useMutation({
    mutationFn: (taskId: string) => vipSelfServiceApi.completeTask(taskId),
    onSuccess: () => {
      message.success(t("vipTaskCompleted"));
      invalidateVip();
    },
    onError: () => message.error(t("errorOccurred")),
  });

  const replenish = useMutation({
    mutationFn: (locationProductId: string) => vipSelfServiceApi.replenish(locationProductId),
    onSuccess: () => {
      message.success(t("vipReplenished"));
      invalidateVip();
    },
    onError: () => message.error(t("errorOccurred")),
  });

  const openCount = tasks.filter((t) => t.status === "OPEN").length;
  const belowThresholdCount = locations.filter((l) => l.belowThreshold).length;

  const taskColumns = [
    {
      title: t("location"),
      dataIndex: "locationName",
      key: "locationName",
      render: (v: string | null) => v ?? "—",
    },
    {
      title: t("requestedQty"),
      dataIndex: "requestedQty",
      key: "requestedQty",
    },
    {
      title: t("status"),
      dataIndex: "status",
      key: "status",
      render: (s: TaskStatus) => <Tag color={STATUS_COLOR[s]}>{t(`vipTaskStatus_${s}`)}</Tag>,
    },
    {
      title: t("date"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d: string) => new Date(d).toLocaleString(isRtl ? "ar" : "en-GB"),
    },
    {
      title: t("completedAt"),
      dataIndex: "completedAt",
      key: "completedAt",
      render: (d: string | null) => (d ? new Date(d).toLocaleString(isRtl ? "ar" : "en-GB") : "—"),
    },
    {
      title: t("actions"),
      key: "actions",
      render: (_: unknown, record: VipTask) =>
        record.status !== "COMPLETED" ? (
          <Tooltip title={t("markComplete")}>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              loading={completeTask.isPending}
              onClick={() => completeTask.mutate(record.id)}
            >
              {t("complete")}
            </Button>
          </Tooltip>
        ) : null,
    },
  ];

  const locationColumns = [
    {
      title: t("branch"),
      dataIndex: "branchId",
      key: "branchId",
      render: (v: string) => branchName(v),
    },
    {
      title: t("department"),
      dataIndex: "departmentId",
      key: "departmentId",
      render: (v: string | null) => departmentName(v),
    },
    {
      title: t("assignedEmployee"),
      dataIndex: "assignedEmployeeId",
      key: "assignedEmployeeId",
      render: (v: string | null) => employeeName(v),
    },
    {
      title: t("locationName"),
      dataIndex: "locationName",
      key: "locationName",
      render: (v: string | null) => v ?? "—",
    },
    {
      title: t("productCount"),
      key: "productCount",
      render: (_: unknown, r: GroupedLocation) => r.products.length,
    },
    {
      title: t("status"),
      key: "belowThreshold",
      render: (_: unknown, r: GroupedLocation) => {
        const below = r.products.some((p) => p.belowThreshold);
        return <Tag color={below ? "red" : "green"}>{below ? t("belowThreshold") : t("ok")}</Tag>;
      },
    },
  ];

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
            <Button
              size="small"
              loading={replenish.isPending}
              onClick={() => replenish.mutate(r.id)}
            >
              {t("replenish")}
            </Button>
          )}
          <Tooltip title={t("edit")}>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingProduct(r);
                editForm.setFieldsValue({
                  quantity: r.currentStock,
                  minThreshold: r.minThreshold,
                  maxThreshold: r.maxThreshold ?? undefined,
                });
              }}
            />
          </Tooltip>
          <Popconfirm
            title={t("removeProductConfirm")}
            onConfirm={() => removeProduct.mutate(r.id)}
            okText={t("confirm")}
            cancelText={t("cancel")}
          >
            <Tooltip title={t("removeProduct")}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const availableProductsForSelected = selectedLocation
    ? vipProducts.filter((p) => !selectedLocation.products.some((sp) => sp.productId === p.id))
    : [];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>{t("vipSelfService")}</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title={t("openTasks")}
              value={openCount}
              valueStyle={{ color: openCount > 0 ? "var(--fg-warning-subtle)" : undefined }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title={t("belowThreshold")}
              value={belowThresholdCount}
              valueStyle={{
                color: belowThresholdCount > 0 ? "var(--fg-danger)" : undefined,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Locations */}
      <Card
        title={t("vipLocations")}
        style={{ marginBottom: 24 }}
        extra={
          <Space wrap>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => setCreateOpen(true)}>
              {t("newVipLocation")}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => refetchLocations()}>
              {t("refresh")}
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="vipLocationId"
          dataSource={groupedLocations}
          columns={locationColumns}
          loading={locationsLoading}
          pagination={false}
          scroll={{ x: "max-content" }}
          onRow={(r) => ({
            onClick: () => setSelectedLocationId(r.vipLocationId),
            style: { cursor: "pointer" },
          })}
        />
      </Card>

      {/* Tasks */}
      <Card
        title={t("vipReplenishmentTasks")}
        extra={
          <Space wrap>
            <Select
              allowClear
              placeholder={t("filterByStatus")}
              style={{ width: 180 }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as TaskStatus | undefined)}
              options={[
                { value: "OPEN", label: t("vipTaskStatus_OPEN") },
                {
                  value: "IN_PROGRESS",
                  label: t("vipTaskStatus_IN_PROGRESS"),
                },
                {
                  value: "COMPLETED",
                  label: t("vipTaskStatus_COMPLETED"),
                },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => refetchTasks()}>
              {t("refresh")}
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          dataSource={tasks}
          columns={taskColumns}
          loading={tasksLoading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: "max-content" }}
        />
      </Card>

      <Modal
        open={createOpen}
        title={t("newVipLocation")}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        confirmLoading={createLocation.isPending}
        okText={t("save")}
        cancelText={t("cancel")}
        destroyOnClose
        width={640}
      >
        <Form
          form={createForm}
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
                createForm.setFieldValue("branchId", undefined);
                createForm.setFieldValue("departmentId", undefined);
                createForm.setFieldValue("assignedEmployeeId", undefined);
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
              onChange={() => createForm.setFieldValue("departmentId", undefined)}
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

      <Drawer
        title={selectedLocation ? (selectedLocation.locationName ?? t("vipLocations")) : ""}
        open={!!selectedLocation}
        onClose={() => setSelectedLocationId(null)}
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
            {availableProductsForSelected.length === 0 ? (
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
                    options={availableProductsForSelected.map((p) => ({
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

      <Modal
        open={!!editingProduct}
        title={
          editingProduct
            ? isRtl
              ? editingProduct.productNameAr
              : editingProduct.productNameEn
            : ""
        }
        onOk={() => editForm.submit()}
        onCancel={() => setEditingProduct(null)}
        confirmLoading={adjustProduct.isPending}
        okText={t("save")}
        cancelText={t("cancel")}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(v) => {
            if (!editingProduct) return;
            adjustProduct.mutate({ id: editingProduct.id, values: v as Record<string, unknown> });
          }}
        >
          <Form.Item name="quantity" label={t("quantity")} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="minThreshold" label={t("minThreshold")}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="maxThreshold" label={t("maxThreshold")}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
