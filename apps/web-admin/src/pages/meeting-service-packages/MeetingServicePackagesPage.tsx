import { Form, Input, Select, Tag, Typography } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import { meetingServicePackagesApi, companiesApi } from "../../lib/api";
import { bilingualName } from "../../lib/bilingualName";
import { useScope } from "../../contexts/ScopeContext";
import { ScopeFilterBar } from "../../components/ScopeFilterBar";
import { useAuth } from "../../hooks/useAuth";

const { Title } = Typography;

interface ServicePackage {
  id: string;
  nameAr: string;
  nameEn: string | null;
  type: "BREAKFAST" | "LUNCH" | "CUSTOM";
  descriptionAr: string | null;
  descriptionEn: string | null;
  isActive: boolean;
  companyId: string;
}

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string | null;
}

const TYPE_COLORS = { BREAKFAST: "orange", LUNCH: "blue", CUSTOM: "default" } as const;

export function MeetingServicePackagesPage() {
  const { t, i18n } = useTranslation();
  const { companyId: scopeCompanyId } = useScope();
  const { companyId: authCompanyId, hasPermission } = useAuth();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";

  const companyId = scopeCompanyId ?? authCompanyId ?? undefined;
  // Aligné sur ScopeFilterBar/MeetingRoomsAdminPage : seul un profil avec
  // company.manage peut lister/choisir la société — les autres n'ont que la
  // leur (authCompanyId), jamais besoin d'un sélecteur.
  const canPickCompany = hasPermission("company.manage");

  const { data, isPending } = useQuery({
    queryKey: ["meeting-service-packages", companyId],
    queryFn: () =>
      meetingServicePackagesApi.list(companyId).then((r) => r.data as ServicePackage[]),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
    enabled: canPickCompany,
  });

  const label = (e: NamedEntity) => bilingualName(e.nameAr, e.nameEn, isAr);

  async function onSave(values: Record<string, unknown>, id?: string) {
    // Un superadmin choisit la société dans le formulaire (values.companyId) ;
    // un admin société n'a pas ce champ, on retombe sur la sienne — jamais de
    // companyId vide/undefined envoyé au backend (qui l'exige, cf. §3 CLAUDE.md
    // multi-tenant : les packages sont rattachés à une société comme les salles).
    const payload = { ...values, companyId: values.companyId ?? companyId };
    if (id) await meetingServicePackagesApi.update(id, payload);
    else await meetingServicePackagesApi.create(payload);
    void qc.invalidateQueries({ queryKey: ["meeting-service-packages"] });
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

      <ScopeFilterBar showBranch={false} />

      <CrudTable<ServicePackage>
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        columns={[
          {
            title: isAr ? t("nameAr") : t("nameEn"),
            key: "name",
            render: (_, r) => bilingualName(r.nameAr, r.nameEn, isAr),
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
            {canPickCompany && (
              <Form.Item
                name="companyId"
                label={t("company")}
                rules={[{ required: true }]}
                initialValue={companyId}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={companies.map((c) => ({ value: c.id, label: label(c) }))}
                />
              </Form.Item>
            )}
            <Form.Item name="nameAr" label={t("nameAr")} rules={[{ required: true }]}>
              <Input dir="rtl" />
            </Form.Item>
            <Form.Item name="nameEn" label={t("nameEnOptional")}>
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
