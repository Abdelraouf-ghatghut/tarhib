import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined, CheckOutlined, CloseOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
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
  scope: "TARHIB" | "CLIENT" | null;
}

interface LeaveType {
  id: string;
  nameAr: string;
  nameEn: string;
  defaultDaysPerYear: number;
  active: boolean;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approverId: string | null;
  reason: string | null;
}

interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  entitled: number;
  taken: number;
  remaining: number;
}

const STATUS_COLOR: Record<LeaveRequest["status"], string> = {
  PENDING: "orange",
  APPROVED: "green",
  REJECTED: "red",
};

export function LeaveRequestsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const { hasPermission } = useAuth();
  const canManage = hasPermission("hr.leave.manage");
  const canApprove = hasPermission("hr.leave.approve");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [typeForm] = Form.useForm();
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as Employee[]),
  });
  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const employeeName = useCallback(
    (id: string) => {
      const e = employeeMap.get(id);
      if (!e) return id.slice(0, 8);
      return isAr ? `${e.firstNameAr} ${e.lastNameAr}` : `${e.firstNameEn} ${e.lastNameEn}`;
    },
    [employeeMap, isAr],
  );

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["hr", "leave-types"],
    queryFn: () => hrApi.leaveTypes.list().then((r) => r.data as LeaveType[]),
  });
  const leaveTypeMap = useMemo(() => new Map(leaveTypes.map((lt) => [lt.id, lt])), [leaveTypes]);
  const leaveTypeName = useCallback(
    (id: string) => {
      const lt = leaveTypeMap.get(id);
      return lt ? (isAr ? lt.nameAr : lt.nameEn) : id.slice(0, 8);
    },
    [leaveTypeMap, isAr],
  );

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["hr", "leave-requests"],
    queryFn: () => hrApi.leaveRequests.list().then((r) => r.data as LeaveRequest[]),
  });

  const { data: balances = [] } = useQuery({
    queryKey: ["hr", "leave-balances"],
    queryFn: () => hrApi.leaveBalances.list().then((r) => r.data as LeaveBalance[]),
  });

  const watchedEmployeeId = Form.useWatch("employeeId", form);
  const watchedLeaveTypeId = Form.useWatch("leaveTypeId", form);
  const watchedStartDate = Form.useWatch("startDate", form);
  const selectedYear = watchedStartDate ? dayjs(watchedStartDate).year() : dayjs().year();
  const selectedBalance = balances.find(
    (b) =>
      b.employeeId === watchedEmployeeId &&
      b.leaveTypeId === watchedLeaveTypeId &&
      b.year === selectedYear,
  );
  const selectedLeaveType = leaveTypes.find((lt) => lt.id === watchedLeaveTypeId);
  const remainingForSelection = selectedBalance
    ? selectedBalance.remaining
    : (selectedLeaveType?.defaultDaysPerYear ?? null);

  const create = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      hrApi.leaveRequests.create({
        ...values,
        startDate: dayjs(values.startDate as dayjs.Dayjs).format("YYYY-MM-DD"),
        endDate: dayjs(values.endDate as dayjs.Dayjs).format("YYYY-MM-DD"),
      }),
    onSuccess: () => {
      message.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["hr", "leave-requests"] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const approve = useMutation({
    mutationFn: (id: string) => hrApi.leaveRequests.approve(id),
    onSuccess: () => {
      message.success(t("leaveApproved"));
      queryClient.invalidateQueries({ queryKey: ["hr", "leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["hr", "leave-balances"] });
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const reject = useMutation({
    mutationFn: (id: string) => hrApi.leaveRequests.reject(id),
    onSuccess: () => {
      message.success(t("leaveRejected"));
      queryClient.invalidateQueries({ queryKey: ["hr", "leave-requests"] });
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const saveType = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      editingType
        ? hrApi.leaveTypes.update(editingType.id, values)
        : hrApi.leaveTypes.create(values),
    onSuccess: () => {
      message.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["hr", "leave-types"] });
      setTypeModalOpen(false);
      setEditingType(null);
      typeForm.resetFields();
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const openCreateType = () => {
    setEditingType(null);
    typeForm.resetFields();
    setTypeModalOpen(true);
  };

  const openEditType = (lt: LeaveType) => {
    setEditingType(lt);
    typeForm.setFieldsValue(lt);
    setTypeModalOpen(true);
  };

  const columns = [
    { title: t("employee"), dataIndex: "employeeId", key: "employeeId", render: employeeName },
    { title: t("leaveType"), dataIndex: "leaveTypeId", key: "leaveTypeId", render: leaveTypeName },
    { title: t("startDate"), dataIndex: "startDate", key: "startDate" },
    { title: t("endDate"), dataIndex: "endDate", key: "endDate" },
    { title: t("daysCount"), dataIndex: "daysCount", key: "daysCount" },
    {
      title: t("status"),
      dataIndex: "status",
      key: "status",
      render: (v: LeaveRequest["status"]) => (
        <Tag color={STATUS_COLOR[v]}>{t(`leaveStatus_${v}`)}</Tag>
      ),
    },
    {
      title: t("correctionReason"),
      dataIndex: "reason",
      key: "reason",
      render: (v: string | null) => v ?? "—",
    },
    ...(canApprove
      ? [
          {
            title: t("actions"),
            key: "actions",
            render: (_: unknown, r: LeaveRequest) =>
              r.status === "PENDING" ? (
                <Space>
                  <Button
                    size="small"
                    icon={<CheckOutlined />}
                    loading={approve.isPending}
                    onClick={() => approve.mutate(r.id)}
                  />
                  <Button
                    size="small"
                    danger
                    icon={<CloseOutlined />}
                    loading={reject.isPending}
                    onClick={() => reject.mutate(r.id)}
                  />
                </Space>
              ) : null,
          },
        ]
      : []),
  ];

  const typeColumns = [
    { title: t("leaveTypeNameAr"), dataIndex: "nameAr", key: "nameAr" },
    { title: t("leaveTypeNameEn"), dataIndex: "nameEn", key: "nameEn" },
    { title: t("defaultDaysPerYear"), dataIndex: "defaultDaysPerYear", key: "defaultDaysPerYear" },
    {
      title: t("active"),
      dataIndex: "active",
      key: "active",
      render: (v: boolean) => (
        <Tag color={v ? "green" : "default"}>{v ? t("activeYes") : t("activeNo")}</Tag>
      ),
    },
    ...(canManage
      ? [
          {
            title: t("actions"),
            key: "actions",
            render: (_: unknown, r: LeaveType) => (
              <Button size="small" icon={<EditOutlined />} onClick={() => openEditType(r)} />
            ),
          },
        ]
      : []),
  ];

  const balanceColumns = [
    { title: t("employee"), dataIndex: "employeeId", key: "employeeId", render: employeeName },
    { title: t("leaveType"), dataIndex: "leaveTypeId", key: "leaveTypeId", render: leaveTypeName },
    { title: t("year"), dataIndex: "year", key: "year" },
    { title: t("entitled"), dataIndex: "entitled", key: "entitled" },
    { title: t("taken"), dataIndex: "taken", key: "taken" },
    { title: t("remaining"), dataIndex: "remaining", key: "remaining" },
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
          {t("leaveRequests")}
        </Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            {t("add")}
          </Button>
        )}
      </div>

      <Tabs
        items={[
          {
            key: "requests",
            label: t("leaveRequests"),
            children: (
              <Table
                rowKey="id"
                dataSource={requests}
                columns={columns}
                loading={isLoading}
                pagination={{ pageSize: 20 }}
                scroll={{ x: "max-content" }}
              />
            ),
          },
          {
            key: "balances",
            label: t("leaveBalances"),
            children: (
              <Table
                rowKey="id"
                dataSource={balances}
                columns={balanceColumns}
                pagination={{ pageSize: 20 }}
                scroll={{ x: "max-content" }}
              />
            ),
          },
          {
            key: "types",
            label: t("leaveTypes"),
            children: (
              <>
                {canManage && (
                  <div style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateType}>
                      {t("add")}
                    </Button>
                  </div>
                )}
                <Table
                  rowKey="id"
                  dataSource={leaveTypes}
                  columns={typeColumns}
                  pagination={{ pageSize: 20 }}
                  scroll={{ x: "max-content" }}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        title={t("newLeaveRequest")}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={create.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => create.mutate(v)}>
          <Form.Item name="employeeId" label={t("employee")} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={employees.map((e) => ({ value: e.id, label: employeeName(e.id) }))}
            />
          </Form.Item>
          <Form.Item name="leaveTypeId" label={t("leaveType")} rules={[{ required: true }]}>
            <Select
              options={leaveTypes
                .filter((lt) => lt.active)
                .map((lt) => ({ value: lt.id, label: isAr ? lt.nameAr : lt.nameEn }))}
            />
          </Form.Item>
          {watchedEmployeeId && watchedLeaveTypeId && (
            <Alert
              type={
                remainingForSelection !== null && remainingForSelection <= 0 ? "warning" : "info"
              }
              showIcon
              style={{ marginBottom: 16 }}
              message={
                remainingForSelection !== null
                  ? t("leaveRemainingBalanceInfo", { count: remainingForSelection })
                  : t("leaveRemainingBalanceUnknown")
              }
            />
          )}
          <Form.Item name="startDate" label={t("startDate")} rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="endDate" label={t("endDate")} rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="reason" label={t("correctionReason")}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={typeModalOpen}
        title={editingType ? t("edit") : t("add")}
        onCancel={() => {
          setTypeModalOpen(false);
          setEditingType(null);
          typeForm.resetFields();
        }}
        onOk={() => typeForm.submit()}
        confirmLoading={saveType.isPending}
        destroyOnClose
      >
        <Form form={typeForm} layout="vertical" onFinish={(v) => saveType.mutate(v)}>
          <Form.Item name="nameAr" label={t("leaveTypeNameAr")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="nameEn" label={t("leaveTypeNameEn")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="defaultDaysPerYear"
            label={t("defaultDaysPerYear")}
            rules={[{ required: true }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="active" label={t("active")} valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default LeaveRequestsPage;
