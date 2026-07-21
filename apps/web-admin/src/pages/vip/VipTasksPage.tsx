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
  Form,
} from "antd";
import { CheckOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
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
import { useEntityLookup } from "../../hooks/useEntityLookup";
import { useAuth } from "../../hooks/useAuth";
import { CreateLocationModal } from "./CreateLocationModal";
import { LocationDetailDrawer } from "./LocationDetailDrawer";
import { EditProductModal } from "./EditProductModal";
import { SourceZoneModal } from "./SourceZoneModal";
import {
  STATUS_COLOR,
  type Employee,
  type GroupedLocation,
  type NamedEntity,
  type TaskStatus,
  type VipLocation,
  type VipProduct,
  type VipTask,
  type ZoneAction,
} from "./types";

const { Title } = Typography;

export default function VipTasksPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isRtl = i18n.dir() === "rtl";
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>(undefined);
  const { hasPermission } = useAuth();
  // Reflète exactement VipSelfServiceService.resolveSourceZone (backend) :
  // CENTRAL n'est jamais une source valide ici (transfert physique avec
  // délai — passer par Transferts de stock), et BRANCH n'est proposé que si
  // l'appelant a une visibilité stock au-delà de la cuisine.
  const allowedZones =
    hasPermission("stock.view") ||
    hasPermission("stock.manage") ||
    hasPermission("inventory.manage")
      ? (["KITCHEN", "BRANCH"] as const)
      : (["KITCHEN"] as const);

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
  const vipProducts = allProducts.filter((p) => p.isVipSelfService);

  const label = (e: NamedEntity) => bilingualName(e.nameAr, e.nameEn, isRtl);
  const productLabel = (p: VipProduct) => bilingualName(p.nameAr, p.nameEn, isRtl);
  const employeeLabel = (e: Employee) =>
    (isRtl ? `${e.firstNameAr} ${e.lastNameAr}` : `${e.firstNameEn} ${e.lastNameEn}`).trim() ||
    e.email;
  const lookupBranch = useEntityLookup(allBranches, (b) => b.id, label);
  const lookupDepartment = useEntityLookup(allDepartments, (d) => d.id, label);
  const lookupEmployee = useEntityLookup(allEmployees, (e) => e.id, employeeLabel);
  const branchName = (id: string) => lookupBranch(id) ?? "—";
  const departmentName = (id: string | null) => lookupDepartment(id) ?? "—";
  const employeeName = (id: string | null) => lookupEmployee(id) ?? "—";

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
    mutationFn: (vars: { id: string; sourceZone: string }) =>
      vipSelfServiceApi.completeTask(vars.id, vars.sourceZone),
    onSuccess: () => {
      message.success(t("vipTaskCompleted"));
      invalidateVip();
      setZoneAction(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const replenish = useMutation({
    mutationFn: (vars: { id: string; sourceZone: string }) =>
      vipSelfServiceApi.replenish(vars.id, vars.sourceZone),
    onSuccess: () => {
      message.success(t("vipReplenished"));
      invalidateVip();
      setZoneAction(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  // Zone source du réappro VIP : le stock peut être en CENTRAL/BRANCH/KITCHEN
  // avant d'être déplacé vers l'emplacement VIP (clarification métier) — on
  // demande la zone plutôt que de supposer BRANCH silencieusement.
  const [zoneAction, setZoneAction] = useState<ZoneAction | null>(null);
  const [zoneForm] = Form.useForm();

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
              onClick={() => setZoneAction({ kind: "task", id: record.id })}
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

      <CreateLocationModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        companies={companies}
        branches={branches}
        departments={departments}
        employees={employees}
        vipProducts={vipProducts}
        createCompanyId={createCompanyId}
        createBranchId={createBranchId}
        createLocation={createLocation}
        label={label}
        employeeLabel={employeeLabel}
        productLabel={productLabel}
        form={createForm}
      />

      <LocationDetailDrawer
        selectedLocation={selectedLocation}
        onClose={() => setSelectedLocationId(null)}
        isRtl={isRtl}
        companies={companies}
        label={label}
        branchName={branchName}
        departmentName={departmentName}
        employeeName={employeeName}
        productLabel={productLabel}
        availableProducts={availableProductsForSelected}
        addProduct={addProduct}
        removeProduct={removeProduct}
        onEditProduct={(product) => {
          setEditingProduct(product);
          editForm.setFieldsValue({
            quantity: product.currentStock,
            minThreshold: product.minThreshold,
            maxThreshold: product.maxThreshold ?? undefined,
          });
        }}
        replenishPending={replenish.isPending}
        onReplenish={(product) => setZoneAction({ kind: "location", id: product.id })}
        addProductForm={addProductForm}
      />

      <EditProductModal
        editingProduct={editingProduct}
        onClose={() => setEditingProduct(null)}
        isRtl={isRtl}
        adjustProduct={adjustProduct}
        form={editForm}
      />

      <SourceZoneModal
        zoneAction={zoneAction}
        allowedZones={allowedZones}
        onClose={() => setZoneAction(null)}
        loading={completeTask.isPending || replenish.isPending}
        onSubmit={(v) => {
          if (!zoneAction) return;
          if (zoneAction.kind === "task") {
            completeTask.mutate({ id: zoneAction.id, sourceZone: v.sourceZone });
          } else {
            replenish.mutate({ id: zoneAction.id, sourceZone: v.sourceZone });
          }
        }}
        form={zoneForm}
      />
    </div>
  );
}
