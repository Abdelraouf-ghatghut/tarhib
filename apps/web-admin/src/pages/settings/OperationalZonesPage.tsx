import { useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined, TeamOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";
import { useScope } from "../../contexts/ScopeContext";
import { useAuth } from "../../hooks/useAuth";
import { branchesApi, companiesApi, employeesApi, operationalZonesApi } from "../../lib/api";
import { bilingualName } from "../../lib/bilingualName";
import { getErrorMessage } from "../../lib/errors";

const { Title, Text } = Typography;
type ZoneType = "DELIVERY" | "CLEANING";

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string | null;
  companyId?: string;
}
interface Employee {
  id: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
  email: string;
  scope: string | null;
  companyId: string | null;
  branchId: string | null;
  active: boolean;
}
interface OperationalZone {
  id: string;
  companyId: string;
  branchId: string;
  type: ZoneType;
  nameAr: string;
  nameEn: string | null;
  floors: string[];
  active: boolean;
}
interface ZoneAssignment {
  id: string;
  zoneId: string;
  employeeId: string;
  startsAt: string;
  endsAt: string | null;
  active: boolean;
  assignedBy: string;
  createdAt: string;
}
interface ZoneFormValues {
  companyId: string;
  branchId: string;
  type: ZoneType;
  nameAr: string;
  nameEn?: string;
  floors: string[];
}
interface AssignmentFormValues {
  employeeId: string;
  period?: [Dayjs, Dayjs];
}

export default function OperationalZonesPage() {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const { hasPermission } = useAuth();
  const { companyId: scopeCompanyId, branchId: scopeBranchId } = useScope();
  const queryClient = useQueryClient();
  const isAr = i18n.language === "ar";
  const [zoneForm] = Form.useForm<ZoneFormValues>();
  const [assignmentForm] = Form.useForm<AssignmentFormValues>();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<OperationalZone | null>(null);
  const selectedCompanyId = Form.useWatch("companyId", zoneForm);

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["operational-zones", scopeCompanyId, scopeBranchId],
    queryFn: () =>
      operationalZonesApi
        .list({
          ...(scopeCompanyId ? { companyId: scopeCompanyId } : {}),
          ...(scopeBranchId ? { branchId: scopeBranchId } : {}),
        })
        .then((response) => response.data as OperationalZone[]),
  });
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((response) => response.data as NamedEntity[]),
  });
  const { data: branches = [] } = useQuery({
    queryKey: ["branches", selectedCompanyId],
    queryFn: () =>
      branchesApi.list(selectedCompanyId).then((response) => response.data as NamedEntity[]),
    enabled: Boolean(selectedCompanyId),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees", "TARHIB"],
    queryFn: () =>
      employeesApi.list({ scope: "TARHIB" }).then((response) => response.data as Employee[]),
  });
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["operational-zone-assignments", selectedZone?.id],
    queryFn: () =>
      operationalZonesApi
        .assignments(selectedZone!.id)
        .then((response) => response.data as ZoneAssignment[]),
    enabled: Boolean(selectedZone),
  });

  const createZone = useMutation({
    mutationFn: (values: ZoneFormValues) =>
      operationalZonesApi.create({ ...values, nameEn: values.nameEn?.trim() || undefined }),
    onSuccess: () => {
      void message.success(t("saved"));
      setCreateOpen(false);
      zoneForm.resetFields();
      void queryClient.invalidateQueries({ queryKey: ["operational-zones"] });
    },
    onError: (error) => void message.error(getErrorMessage(error, t)),
  });
  const assign = useMutation({
    mutationFn: (values: AssignmentFormValues) =>
      operationalZonesApi.assign(selectedZone!.id, {
        employeeId: values.employeeId,
        startsAt: values.period?.[0].startOf("minute").toISOString(),
        endsAt: values.period?.[1].endOf("minute").toISOString(),
      }),
    onSuccess: () => {
      void message.success(t("saved"));
      assignmentForm.resetFields();
      void queryClient.invalidateQueries({ queryKey: ["operational-zone-assignments"] });
    },
    onError: (error) => void message.error(getErrorMessage(error, t)),
  });
  const setActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      operationalZonesApi.setAssignmentActive(id, active),
    onSuccess: () => {
      void message.success(t("saved"));
      void queryClient.invalidateQueries({ queryKey: ["operational-zone-assignments"] });
    },
    onError: (error) => void message.error(getErrorMessage(error, t)),
  });

  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );
  const eligibleEmployees = employees.filter(
    (employee) =>
      employee.active &&
      employee.scope === "TARHIB" &&
      employee.branchId === selectedZone?.branchId,
  );
  const employeeLabel = (employee: Employee) =>
    (isAr
      ? `${employee.firstNameAr} ${employee.lastNameAr}`
      : `${employee.firstNameEn} ${employee.lastNameEn}`
    ).trim() || employee.email;
  const canManage = (type: ZoneType) =>
    type === "DELIVERY"
      ? hasPermission("order.queue.manage")
      : hasPermission("cleaning.task.manage");
  const allowedTypes = (["DELIVERY", "CLEANING"] as ZoneType[]).filter(canManage);

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" gutter={[12, 12]}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            {t("operationalZones")}
          </Title>
          <Text type="secondary">{t("operationalZonesHint")}</Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              zoneForm.setFieldsValue({
                companyId: scopeCompanyId ?? undefined,
                branchId: scopeBranchId ?? undefined,
                type: allowedTypes[0],
              });
              setCreateOpen(true);
            }}
          >
            {t("addZone")}
          </Button>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Table<OperationalZone>
          rowKey="id"
          dataSource={zones}
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          locale={{ emptyText: <Empty description={t("noOperationalZones")} /> }}
          columns={[
            {
              title: t("zoneName"),
              render: (_, zone) => bilingualName(zone.nameAr, zone.nameEn, isAr),
            },
            {
              title: t("zoneType"),
              dataIndex: "type",
              render: (type: ZoneType) => (
                <Tag color={type === "DELIVERY" ? "blue" : "green"}>
                  {t(type === "DELIVERY" ? "deliveryZone" : "cleaningZone")}
                </Tag>
              ),
            },
            {
              title: t("floors"),
              dataIndex: "floors",
              render: (floors: string[]) => (
                <Space wrap>
                  {floors.map((floor) => (
                    <Tag key={floor}>{floor}</Tag>
                  ))}
                </Space>
              ),
            },
            {
              title: t("status"),
              dataIndex: "active",
              render: (active: boolean) => (
                <Tag color={active ? "success" : "default"}>
                  {t(active ? "active" : "inactive")}
                </Tag>
              ),
            },
            {
              title: t("actions"),
              render: (_, zone) => (
                <Button
                  icon={<TeamOutlined />}
                  disabled={!canManage(zone.type)}
                  onClick={() => setSelectedZone(zone)}
                >
                  {t("manageAssignments")}
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={createOpen}
        title={t("addZone")}
        onCancel={() => {
          setCreateOpen(false);
          zoneForm.resetFields();
        }}
        onOk={() => zoneForm.submit()}
        confirmLoading={createZone.isPending}
        destroyOnClose
      >
        <Form<ZoneFormValues>
          form={zoneForm}
          layout="vertical"
          onFinish={(values) => createZone.mutate(values)}
        >
          <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              onChange={() => zoneForm.setFieldValue("branchId", undefined)}
              options={companies.map((company) => ({
                value: company.id,
                label: bilingualName(company.nameAr, company.nameEn, isAr),
              }))}
            />
          </Form.Item>
          <Form.Item name="branchId" label={t("branch")} rules={[{ required: true }]}>
            <Select
              disabled={!selectedCompanyId}
              options={branches.map((branch) => ({
                value: branch.id,
                label: bilingualName(branch.nameAr, branch.nameEn, isAr),
              }))}
            />
          </Form.Item>
          <Form.Item name="type" label={t("zoneType")} rules={[{ required: true }]}>
            <Select
              options={allowedTypes.map((type) => ({
                value: type,
                label: t(type === "DELIVERY" ? "deliveryZone" : "cleaningZone"),
              }))}
            />
          </Form.Item>
          <Form.Item name="nameAr" label={t("nameAr")} rules={[{ required: true, min: 2 }]}>
            <Input dir="rtl" maxLength={120} />
          </Form.Item>
          <Form.Item name="nameEn" label={t("nameEnOptional")}>
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item
            name="floors"
            label={t("floors")}
            extra={t("floorsHint")}
            rules={[{ required: true, type: "array", min: 1 }]}
          >
            <Select mode="tags" tokenSeparators={[",", "،"]} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={Boolean(selectedZone)}
        width={720}
        title={
          selectedZone
            ? `${t("manageAssignments")} — ${bilingualName(selectedZone.nameAr, selectedZone.nameEn, isAr)}`
            : t("manageAssignments")
        }
        onClose={() => {
          setSelectedZone(null);
          assignmentForm.resetFields();
        }}
      >
        <Form<AssignmentFormValues>
          form={assignmentForm}
          layout="vertical"
          onFinish={(values) => assign.mutate(values)}
        >
          <Form.Item name="employeeId" label={t("employee")} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={eligibleEmployees.map((employee) => ({
                value: employee.id,
                label: employeeLabel(employee),
              }))}
            />
          </Form.Item>
          <Form.Item name="period" label={t("assignmentPeriod")}>
            <DatePicker.RangePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={assign.isPending}>
            {t("assignZone")}
          </Button>
        </Form>

        <Table<ZoneAssignment>
          style={{ marginTop: 24 }}
          rowKey="id"
          dataSource={assignments}
          loading={assignmentsLoading}
          pagination={false}
          columns={[
            {
              title: t("employee"),
              dataIndex: "employeeId",
              render: (id: string) => {
                const employee = employeeMap.get(id);
                return employee ? employeeLabel(employee) : id.slice(0, 8);
              },
            },
            {
              title: t("startDate"),
              dataIndex: "startsAt",
              render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
            },
            {
              title: t("endDate"),
              dataIndex: "endsAt",
              render: (value: string | null) =>
                value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "—",
            },
            {
              title: t("active"),
              dataIndex: "active",
              render: (active: boolean, assignment) => (
                <Switch
                  checked={active}
                  loading={setActive.isPending}
                  onChange={(checked) => setActive.mutate({ id: assignment.id, active: checked })}
                />
              ),
            },
          ]}
        />
      </Drawer>
    </div>
  );
}
