import { Form, Input, Select, Tag, Typography, message } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import { meetingServicePackagesApi } from "../../lib/api";
import { useScope } from "../../contexts/ScopeContext";
import { useAuth } from "../../hooks/useAuth";

const { Title } = Typography;

interface ServicePackage {
  id: string;
  nameAr: string;
  nameEn: string;
  type: "BREAKFAST" | "LUNCH" | "CUSTOM";
  descriptionAr: string | null;
  descriptionEn: string | null;
  isActive: boolean;
  companyId: string;
}

const TYPE_COLORS = { BREAKFAST: "orange", LUNCH: "blue", CUSTOM: "default" } as const;

export function MeetingServicePackagesPage() {
  const { t, i18n } = useTranslation();
  const { companyId: scopeCompanyId } = useScope();
  const { companyId: authCompanyId } = useAuth();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";

  const companyId = scopeCompanyId ?? authCompanyId ?? undefined;

  const { data, isPending } = useQuery({
    queryKey: ["meeting-service-packages", companyId],
    queryFn: () =>
      meetingServicePackagesApi.list(companyId).then((r) => r.data as ServicePackage[]),
  });

  async function onSave(values: Record<string, unknown>, id?: string) {
    try {
      const payload = { ...values, companyId };
      if (id) await meetingServicePackagesApi.update(id, payload);
      else await meetingServicePackagesApi.create(payload);
      void qc.invalidateQueries({ queryKey: ["meeting-service-packages"] });
    } catch (err) {
      void message.error(String(err));
    }
  }

  async function onDelete(id: string) {
    await meetingServicePackagesApi.remove(id);
    void qc.invalidateQueries({ queryKey: ["meeting-service-packages"] });
  }

  const typeLabel = (type: string) => {
    if (type === "BREAKFAST") return t("packageBreakfast");
    if (type === "LUNCH") return t("packageLunch");
    return t("packageCustom");
  };

  return (
    <>
      <Title level={4}>{t("meetingServicePackages")}</Title>

      <CrudTable<ServicePackage>
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        columns={[
          {
            title: isAr ? t("nameAr") : t("nameEn"),
            key: "name",
            render: (_, r) => (isAr ? r.nameAr : r.nameEn),
          },
          {
            title: t("packageType"),
            dataIndex: "type",
            render: (v: string) => (
              <Tag color={TYPE_COLORS[v as keyof typeof TYPE_COLORS] ?? "default"}>
                {typeLabel(v)}
              </Tag>
            ),
          },
          {
            title: t("description"),
            key: "desc",
            render: (_, r) => (isAr ? r.descriptionAr : r.descriptionEn) ?? "—",
          },
          {
            title: t("active"),
            dataIndex: "isActive",
            render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "✓" : "✗"}</Tag>,
            width: 80,
          },
        ]}
        formContent={() => (
          <>
            <Form.Item name="nameAr" label={t("nameAr")} rules={[{ required: true }]}>
              <Input dir="rtl" />
            </Form.Item>
            <Form.Item name="nameEn" label={t("nameEn")} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="type" label={t("packageType")} initialValue="CUSTOM">
              <Select
                options={[
                  { value: "BREAKFAST", label: t("packageBreakfast") },
                  { value: "LUNCH", label: t("packageLunch") },
                  { value: "CUSTOM", label: t("packageCustom") },
                ]}
              />
            </Form.Item>
            <Form.Item name="descriptionAr" label={t("descriptionAr")}>
              <Input.TextArea dir="rtl" rows={2} />
            </Form.Item>
            <Form.Item name="descriptionEn" label={t("descriptionEn")}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        )}
      />
    </>
  );
}
