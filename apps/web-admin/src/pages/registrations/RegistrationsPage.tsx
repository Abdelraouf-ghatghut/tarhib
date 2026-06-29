import {
  Button,
  Card,
  Space,
  Table,
  Tag,
  Tabs,
  Form,
  Input,
  Select,
  Typography,
  message,
} from "antd";
import { CheckOutlined, CloseOutlined, MailOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { registrationsApi, rolesApi, branchesApi } from "../../lib/api";
import { useScope } from "../../contexts/ScopeContext";
import { useAuth } from "../../hooks/useAuth";

const { Title } = Typography;

interface PendingEmployee {
  id: string;
  email: string;
  firstNameEn: string;
  lastNameEn: string;
  phoneNumber: string;
  createdAt: string;
}

interface Role {
  id: string;
  nameAr: string;
  nameEn: string;
}

interface Branch {
  id: string;
  nameAr: string;
  nameEn: string;
}

export function RegistrationsPage() {
  const { t, i18n } = useTranslation();
  const { companyId: scopeCompanyId } = useScope();
  const { companyId: authCompanyId } = useAuth();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";
  const [inviteForm] = Form.useForm();
  const [inviting, setInviting] = useState(false);

  const companyId = scopeCompanyId ?? authCompanyId ?? undefined;

  const { data: pending = [], isPending } = useQuery({
    queryKey: ["pending-registrations", companyId],
    queryFn: () => registrationsApi.listPending(companyId).then((r) => r.data as PendingEmployee[]),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.list().then((r) => r.data as Role[]),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: () => branchesApi.list(companyId).then((r) => r.data as Branch[]),
    enabled: !!companyId,
  });

  async function handleApprove(id: string) {
    try {
      await registrationsApi.approve(id);
      void qc.invalidateQueries({ queryKey: ["pending-registrations"] });
      void message.success(t("approved"));
    } catch {
      void message.error(t("errorOccurred"));
    }
  }

  async function handleReject(id: string) {
    try {
      await registrationsApi.reject(id);
      void qc.invalidateQueries({ queryKey: ["pending-registrations"] });
      void message.success(t("rejected"));
    } catch {
      void message.error(t("errorOccurred"));
    }
  }

  async function handleInvite() {
    try {
      const values = await inviteForm.validateFields();
      setInviting(true);
      await registrationsApi.invite({ ...values, companyId });
      inviteForm.resetFields();
      void message.success(t("inviteSent"));
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      void message.error(String(err));
    } finally {
      setInviting(false);
    }
  }

  const label = (e: { nameAr: string; nameEn: string }) => (isAr ? e.nameAr : e.nameEn);

  const pendingTab = (
    <Table<PendingEmployee>
      rowKey="id"
      dataSource={pending}
      loading={isPending}
      pagination={{ pageSize: 20 }}
      size="middle"
      columns={[
        { title: t("email"), dataIndex: "email" },
        {
          title: t("name"),
          key: "name",
          render: (_, r) => `${r.firstNameEn} ${r.lastNameEn}`.trim() || "—",
        },
        { title: t("phone"), dataIndex: "phoneNumber" },
        {
          title: t("date"),
          dataIndex: "createdAt",
          render: (v: string) => v?.slice(0, 10),
        },
        {
          title: t("status"),
          key: "status",
          render: () => <Tag color="orange">{t("statusPending")}</Tag>,
        },
        {
          title: t("actions"),
          key: "_actions",
          render: (_, r) => (
            <Space>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(r.id)}
              >
                {t("approve")}
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleReject(r.id)}
              >
                {t("reject")}
              </Button>
            </Space>
          ),
        },
      ]}
    />
  );

  const inviteTab = (
    <Card style={{ maxWidth: 480 }}>
      <Form form={inviteForm} layout="vertical" onFinish={handleInvite}>
        <Form.Item name="email" label={t("email")} rules={[{ required: true, type: "email" }]}>
          <Input prefix={<MailOutlined />} placeholder="employe@company.com" />
        </Form.Item>
        <Form.Item name="branchId" label={t("branch")} rules={[{ required: true }]}>
          <Select
            options={branches.map((b) => ({ value: b.id, label: label(b) }))}
            showSearch
            optionFilterProp="label"
            disabled={!companyId}
          />
        </Form.Item>
        <Form.Item name="roleId" label={t("roleLabel")}>
          <Select
            allowClear
            options={roles.map((r) => ({ value: r.id, label: label(r) }))}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={inviting} block>
          {t("sendInvite")}
        </Button>
      </Form>
    </Card>
  );

  return (
    <>
      <Title level={4}>{t("pendingRegistrations")}</Title>
      <Tabs
        items={[
          {
            key: "pending",
            label: `${t("pendingRegistrations")} (${pending.length})`,
            children: pendingTab,
          },
          { key: "invite", label: t("inviteEmployee"), children: inviteTab },
        ]}
      />
    </>
  );
}
