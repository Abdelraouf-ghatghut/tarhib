import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
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

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as Employee[]),
  });
  const employeeName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    if (!e) return id.slice(0, 8);
    return isAr ? `${e.firstNameAr} ${e.lastNameAr}` : `${e.firstNameEn} ${e.lastNameEn}`;
  };

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["hr", "leave-types"],
    queryFn: () => hrApi.leaveTypes.list().then((r) => r.data as LeaveType[]),
  });
  const leaveTypeName = (id: string) => {
    const lt = leaveTypes.find((x) => x.id === id);
    return lt ? (isAr ? lt.nameAr : lt.nameEn) : id.slice(0, 8);
  };

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["hr", "leave-requests"],
    queryFn: () => hrApi.leaveRequests.list().then((r) => r.data as LeaveRequest[]),
  });

  const { data: balances = [] } = useQuery({
    queryKey: ["hr", "leave-balances"],
    queryFn: () => hrApi.leaveBalances.list().then((r) => r.data as LeaveBalance[]),
  });

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
    </div>
  );
}

export default LeaveRequestsPage;
