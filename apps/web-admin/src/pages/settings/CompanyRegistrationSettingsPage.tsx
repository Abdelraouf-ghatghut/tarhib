import {
  Alert,
  Button,
  Card,
  Form,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { CopyOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { branchesApi, companiesApi, departmentsApi, rolesApi } from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";

const { Title, Text, Paragraph } = Typography;

type RegistrationMode = "CLOSED" | "APPROVAL_REQUIRED" | "AUTO_APPROVED" | "INVITE_ONLY";
type NamedEntity = {
  id: string;
  nameAr: string;
  nameEn: string | null;
  companyId?: string;
  branchId?: string;
  active?: boolean;
};
type Role = NamedEntity & { scope: "TARHIB" | "CLIENT"; companyId: string | null };
type Settings = {
  mode: RegistrationMode;
  hasRegistrationCode: boolean;
  codeRotatedAt: string | null;
  codeExpiresAt: string | null;
  options: Array<{
    id: string;
    branch: NamedEntity;
    department: NamedEntity;
    role: NamedEntity;
  }>;
};
type FormValues = {
  mode: RegistrationMode;
  options: Array<{ branchId: string; departmentId: string; roleId: string }>;
};

const modeOptions = [
  { value: "CLOSED", label: "مغلق — لا يسمح بالتسجيل" },
  { value: "APPROVAL_REQUIRED", label: "يتطلب موافقة المسؤول" },
  { value: "AUTO_APPROVED", label: "موافقة تلقائية وتفعيل مباشر" },
  { value: "INVITE_ONLY", label: "عن طريق الدعوة فقط" },
];

export default function CompanyRegistrationSettingsPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm<FormValues>();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>();
  const [generatedCode, setGeneratedCode] = useState<string>();
  const selectedMode = Form.useWatch("mode", form);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((response) => response.data as NamedEntity[]),
  });
  const companyId = selectedCompanyId ?? (companies.length === 1 ? companies[0].id : undefined);

  const { data: settings, isPending: loadingSettings } = useQuery({
    queryKey: ["company-registration-settings", companyId],
    queryFn: () =>
      companiesApi.registrationSettings(companyId!).then((response) => response.data as Settings),
    enabled: Boolean(companyId),
  });
  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: () => branchesApi.list(companyId).then((response) => response.data as NamedEntity[]),
    enabled: Boolean(companyId),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", { companyId }],
    queryFn: () =>
      departmentsApi
        .list({ companyId: companyId! })
        .then((response) => response.data as NamedEntity[]),
    enabled: Boolean(companyId),
  });
  const { data: allRoles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.list().then((response) => response.data as Role[]),
  });
  const roles = useMemo(
    () =>
      allRoles.filter(
        (role) => role.scope === "CLIENT" && (!role.companyId || role.companyId === companyId),
      ),
    [allRoles, companyId],
  );

  useEffect(() => {
    if (!settings) return;
    form.setFieldsValue({
      mode: settings.mode,
      options: settings.options.map((option) => ({
        branchId: option.branch.id,
        departmentId: option.department.id,
        roleId: option.role.id,
      })),
    });
  }, [form, settings]);

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      companiesApi.updateRegistrationSettings(companyId!, {
        mode: values.mode,
        codeExpiresAt: null,
        options: values.options ?? [],
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["company-registration-settings", companyId],
      });
      void message.success("تم حفظ إعدادات التسجيل");
    },
    onError: (error) => void message.error(getErrorMessage(error, t)),
  });

  const rotate = useMutation({
    mutationFn: () => companiesApi.rotateRegistrationCode(companyId!),
    onSuccess: (response) => {
      setGeneratedCode(response.data.code);
      void queryClient.invalidateQueries({
        queryKey: ["company-registration-settings", companyId],
      });
    },
    onError: (error) => void message.error(getErrorMessage(error, t)),
  });

  const companyOptions = companies.map((company) => ({ value: company.id, label: company.nameAr }));

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Title level={4} style={{ marginBottom: 4 }}>
          إعدادات تسجيل موظفي الشركات
        </Title>
        <Text type="secondary">
          حدد طريقة التسجيل والاختيارات التي تظهر لموظفي الشركة في تطبيق ترحيب.
        </Text>
      </div>

      <Card>
        <Form layout="vertical">
          <Form.Item label="الشركة" required>
            <Select
              value={companyId}
              options={companyOptions}
              onChange={(value) => {
                setSelectedCompanyId(value);
                form.resetFields();
              }}
              showSearch
              optionFilterProp="label"
              placeholder="اختر الشركة"
            />
          </Form.Item>
        </Form>
      </Card>

      {!companyId ? (
        <Alert type="info" showIcon message="اختر شركة لعرض إعدادات التسجيل" />
      ) : loadingSettings ? (
        <Spin />
      ) : (
        <Card>
          <Form<FormValues>
            form={form}
            layout="vertical"
            initialValues={{ mode: "CLOSED", options: [] }}
            onFinish={(values) => save.mutate(values)}
          >
            <Form.Item name="mode" label="طريقة التسجيل" rules={[{ required: true }]}>
              <Select options={modeOptions} />
            </Form.Item>

            {selectedMode === "AUTO_APPROVED" ? (
              <Alert
                type="warning"
                showIcon
                message="الموافقة التلقائية"
                description="سيتم إرسال رمز التفعيل مباشرة بعد التحقق من هاتف الموظف. لا تنشر إلا الأدوار المناسبة للتسجيل الذاتي."
                style={{ marginBottom: 20 }}
              />
            ) : null}

            <Form.List name="options">
              {(fields, { add, remove }) => (
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  <Space wrap>
                    <Text strong>الاختيارات المتاحة للموظفين</Text>
                    <Tag>{fields.length}</Tag>
                  </Space>
                  {fields.map((field) => {
                    const branchId = form.getFieldValue(["options", field.name, "branchId"]);
                    return (
                      <Card key={field.key} size="small">
                        <Space wrap align="start" style={{ width: "100%" }}>
                          <Form.Item
                            {...field}
                            name={[field.name, "branchId"]}
                            label="الفرع"
                            rules={[{ required: true }]}
                            style={{ minWidth: 220, flex: 1 }}
                          >
                            <Select
                              options={branches.map((branch) => ({
                                value: branch.id,
                                label: branch.nameAr,
                              }))}
                              onChange={() =>
                                form.setFieldValue(
                                  ["options", field.name, "departmentId"],
                                  undefined,
                                )
                              }
                            />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            name={[field.name, "departmentId"]}
                            label="القسم"
                            rules={[{ required: true }]}
                            style={{ minWidth: 220, flex: 1 }}
                          >
                            <Select
                              disabled={!branchId}
                              options={departments
                                .filter((department) => department.branchId === branchId)
                                .map((department) => ({
                                  value: department.id,
                                  label: department.nameAr,
                                }))}
                            />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            name={[field.name, "roleId"]}
                            label="الدور"
                            rules={[{ required: true }]}
                            style={{ minWidth: 220, flex: 1 }}
                          >
                            <Select
                              options={roles.map((role) => ({
                                value: role.id,
                                label: role.nameAr,
                              }))}
                            />
                          </Form.Item>
                          <Button
                            danger
                            type="text"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(field.name)}
                          >
                            حذف
                          </Button>
                        </Space>
                      </Card>
                    );
                  })}
                  <Button icon={<PlusOutlined />} onClick={() => add()} block>
                    إضافة اختيار
                  </Button>
                </Space>
              )}
            </Form.List>

            <Space wrap style={{ marginTop: 24 }}>
              <Button type="primary" htmlType="submit" loading={save.isPending}>
                حفظ الإعدادات
              </Button>
              <Button
                icon={<ReloadOutlined />}
                loading={rotate.isPending}
                disabled={!settings}
                onClick={() =>
                  Modal.confirm({
                    title: settings?.hasRegistrationCode
                      ? "تجديد رمز التسجيل؟"
                      : "إنشاء رمز التسجيل؟",
                    content: settings?.hasRegistrationCode
                      ? "سيتوقف الرمز السابق فوراً عن العمل."
                      : "سيظهر الرمز مرة واحدة فقط بعد إنشائه.",
                    okText: "تأكيد",
                    cancelText: "إلغاء",
                    onOk: () => rotate.mutateAsync(),
                  })
                }
              >
                {settings?.hasRegistrationCode ? "تجديد رمز التسجيل" : "إنشاء رمز التسجيل"}
              </Button>
              {settings?.hasRegistrationCode ? (
                <Tag color="green">يوجد رمز نشط</Tag>
              ) : (
                <Tag>لم يتم إنشاء رمز</Tag>
              )}
            </Space>
          </Form>
        </Card>
      )}

      <Modal
        open={Boolean(generatedCode)}
        title="رمز التسجيل الجديد"
        footer={
          <Button type="primary" onClick={() => setGeneratedCode(undefined)}>
            تم الحفظ
          </Button>
        }
        closable={false}
      >
        <Alert type="warning" showIcon message="انسخ الرمز الآن؛ لن يظهر مرة أخرى." />
        <Paragraph
          copyable={{ text: generatedCode }}
          style={{ marginTop: 20, textAlign: "center" }}
        >
          <Text code style={{ fontSize: 20 }}>
            <CopyOutlined /> {generatedCode}
          </Text>
        </Paragraph>
      </Modal>
    </Space>
  );
}
