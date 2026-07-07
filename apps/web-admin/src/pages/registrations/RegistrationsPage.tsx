import {
  Button,
  Card,
  Radio,
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
import { registrationsApi, rolesApi, branchesApi, companiesApi } from "../../lib/api";
import { useScope } from "../../contexts/ScopeContext";
import { useAuth } from "../../hooks/useAuth";
import { ScopeFilterBar } from "../../components/ScopeFilterBar";
import { getErrorMessage } from "../../lib/errors";
import { bilingualName } from "../../lib/bilingualName";

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
  scope: "TARHIB" | "CLIENT";
  companyId: string | null;
}

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
}

export function RegistrationsPage() {
  const { t, i18n } = useTranslation();
  const { companyId: scopeCompanyId } = useScope();
  const { companyId: authCompanyId, isSuperadmin } = useAuth();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";
  const [inviteForm] = Form.useForm();
  const [inviting, setInviting] = useState(false);

  const companyId = scopeCompanyId ?? authCompanyId ?? undefined;

  // Cascade du formulaire d'invitation : société choisie → branches de cette
  // société ; type interne/externe → rôles du scope correspondant
  const employeeType = (Form.useWatch("employeeType", inviteForm) ?? "CLIENT") as
    | "CLIENT"
    | "TARHIB";
  const formCompanyId = Form.useWatch("companyId", inviteForm) as string | undefined;

  const { data: pending = [], isPending } = useQuery({
    queryKey: ["pending-registrations", companyId],
    queryFn: () => registrationsApi.listPending(companyId).then((r) => r.data as PendingEmployee[]),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.list().then((r) => r.data as Role[]),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
    enabled: isSuperadmin,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", formCompanyId],
    queryFn: () => branchesApi.list(formCompanyId).then((r) => r.data as NamedEntity[]),
    enabled: !!formCompanyId,
  });

  const roleOptions = roles.filter((r) =>
    employeeType === "TARHIB"
      ? r.scope === "TARHIB"
      : r.scope === "CLIENT" && (!r.companyId || !formCompanyId || r.companyId === formCompanyId),
  );

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
      const values = (await inviteForm.validateFields()) as Record<string, unknown>;
      setInviting(true);
      // employeeType ne sert qu'au filtrage des rôles côté formulaire
      const payload = { ...values };
      delete payload.employeeType;
      await registrationsApi.invite(payload);
      inviteForm.resetFields();
      void message.success(t("inviteSent"));
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return;
      void message.error(getErrorMessage(err, t));
    } finally {
      setInviting(false);
    }
  }

  const label = (e: { nameAr: string; nameEn: string }) => bilingualName(e.nameAr, e.nameEn, isAr);

  const pendingTab = (
    <Table<PendingEmployee>
      rowKey="id"
      dataSource={pending}
      loading={isPending}
      pagination={{ pageSize: 20 }}
      size="middle"
      scroll={{ x: "max-content" }}
      columns={[
        { title: t("email"), dataIndex: "email" },
        {
          title: t("name"),
          key: "name",
          render: (_, r) => `${r.firstNameEn} ${r.lastNameEn}`.trim() || "—",
        },
        {
          title: t("phone"),
          dataIndex: "phoneNumber",
          render: (v: string) => <span dir="ltr">{v}</span>,
        },
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
      <Form
        form={inviteForm}
        layout="vertical"
        onFinish={handleInvite}
        initialValues={{
          employeeType: "CLIENT",
          companyId: isSuperadmin ? undefined : authCompanyId,
        }}
      >
        <Form.Item name="email" label={t("email")} rules={[{ required: true, type: "email" }]}>
          <Input prefix={<MailOutlined />} placeholder="employe@company.com" />
        </Form.Item>

        {/* Interne / externe : filtre les rôles proposés par scope */}
        <Form.Item name="employeeType" label={t("employeeType")} rules={[{ required: true }]}>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            options={[
              { value: "CLIENT", label: t("employeeTypeClient") },
              { value: "TARHIB", label: t("employeeTypeInternal") },
            ]}
            onChange={() => inviteForm.setFieldValue("roleId", undefined)}
          />
        </Form.Item>

        <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
          <Select
            options={
              isSuperadmin
                ? companies.map((c) => ({ value: c.id, label: label(c) }))
                : authCompanyId
                  ? [{ value: authCompanyId, label: t("company") }]
                  : []
            }
            showSearch
            optionFilterProp="label"
            disabled={!isSuperadmin}
            onChange={() => {
              // La branche et le rôle dépendent de la société choisie
              inviteForm.setFieldValue("branchId", undefined);
              inviteForm.setFieldValue("roleId", undefined);
            }}
          />
        </Form.Item>

        <Form.Item name="branchId" label={t("branch")} rules={[{ required: true }]}>
          <Select
            options={branches.map((b) => ({ value: b.id, label: label(b) }))}
            showSearch
            optionFilterProp="label"
            disabled={!formCompanyId}
            placeholder={!formCompanyId ? t("noCompanySelected") : undefined}
          />
        </Form.Item>

        <Form.Item name="roleId" label={t("roleLabel")}>
          <Select
            allowClear
            options={roleOptions.map((r) => ({ value: r.id, label: label(r) }))}
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
      <ScopeFilterBar showBranch={false} />
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
