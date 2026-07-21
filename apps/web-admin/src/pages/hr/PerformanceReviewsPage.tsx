import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Rate,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
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
}

interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  reviewDate: string;
  rating: number;
  strengths: string | null;
  areasForImprovement: string | null;
  comments: string | null;
  status: "DRAFT" | "FINALIZED";
}

export function PerformanceReviewsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const { hasPermission } = useAuth();
  const canManage = hasPermission("hr.review.manage");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PerformanceReview | null>(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as Employee[]),
  });
  const employeeName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    if (!e) return id.slice(0, 8);
    return isAr ? `${e.firstNameAr} ${e.lastNameAr}` : `${e.firstNameEn} ${e.lastNameEn}`;
  };

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["hr", "performance-reviews"],
    queryFn: () => hrApi.performanceReviews.list().then((r) => r.data as PerformanceReview[]),
  });

  const save = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        reviewDate: dayjs(values.reviewDate as dayjs.Dayjs).format("YYYY-MM-DD"),
      };
      return editing
        ? hrApi.performanceReviews.update(editing.id, payload)
        : hrApi.performanceReviews.create(payload);
    },
    onSuccess: () => {
      message.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["hr", "performance-reviews"] });
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (r: PerformanceReview) => {
    setEditing(r);
    form.setFieldsValue({ ...r, reviewDate: dayjs(r.reviewDate) });
    setModalOpen(true);
  };

  const columns = [
    { title: t("employee"), dataIndex: "employeeId", key: "employeeId", render: employeeName },
    { title: t("reviewDate"), dataIndex: "reviewDate", key: "reviewDate" },
    {
      title: t("rating"),
      dataIndex: "rating",
      key: "rating",
      render: (v: number) => <Rate disabled value={v} />,
    },
    {
      title: t("status"),
      dataIndex: "status",
      key: "status",
      render: (v: PerformanceReview["status"]) => (
        <Tag color={v === "FINALIZED" ? "green" : "orange"}>{t(`reviewStatus_${v}`)}</Tag>
      ),
    },
    ...(canManage
      ? [
          {
            title: t("actions"),
            key: "actions",
            render: (_: unknown, r: PerformanceReview) => (
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
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
          {t("performanceReviews")}
        </Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("add")}
          </Button>
        )}
      </div>

      <Table
        rowKey="id"
        dataSource={reviews}
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
          <Form.Item name="employeeId" label={t("employee")} rules={[{ required: true }]}>
            <Select
              disabled={!!editing}
              showSearch
              optionFilterProp="label"
              options={employees.map((e) => ({ value: e.id, label: employeeName(e.id) }))}
            />
          </Form.Item>
          <Form.Item name="reviewerId" label={t("reviewer")} rules={[{ required: true }]}>
            <Select
              disabled={!!editing}
              showSearch
              optionFilterProp="label"
              options={employees.map((e) => ({ value: e.id, label: employeeName(e.id) }))}
            />
          </Form.Item>
          <Form.Item name="reviewDate" label={t("reviewDate")} rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="rating" label={t("rating")} rules={[{ required: true }]}>
            <Rate />
          </Form.Item>
          <Form.Item name="strengths" label={t("strengths")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="areasForImprovement" label={t("areasForImprovement")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="comments" label={t("comments")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="status" label={t("status")} initialValue="DRAFT">
            <Select
              options={["DRAFT", "FINALIZED"].map((v) => ({
                value: v,
                label: t(`reviewStatus_${v}`),
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default PerformanceReviewsPage;
