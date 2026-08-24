import { Avatar, Card, Col, Descriptions, Row, Space, Tag, Typography } from "antd";
import { SafetyOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { rolesApi, companiesApi, branchesApi } from "../lib/api";
import { bilingualName } from "../lib/bilingualName";
import { localizedPersonName } from "../lib/personName";

const { Title, Text } = Typography;

interface DynamicRole {
  id: string;
  nameAr: string;
  nameEn: string | null;
}

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
}

/**
 * Profil de l'utilisateur connecté au portail (personnel interne) :
 * identité, rôle et lieu d'affectation. Les permissions techniques restent
 * réservées à l'administration des rôles.
 */
export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const { email, roleId, companyId, branchId, firstNameAr, firstNameEn, lastNameAr, lastNameEn } =
    useAuth();

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.list().then((r) => r.data as DynamicRole[]),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
    enabled: !!companyId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list().then((r) => r.data as NamedEntity[]),
    enabled: !!branchId,
  });

  const label = (e: NamedEntity) => bilingualName(e.nameAr, e.nameEn, isAr);

  const fullName = localizedPersonName({ firstNameAr, firstNameEn, lastNameAr, lastNameEn }, isAr);
  const displayName = fullName || (email ?? "").split("@")[0];

  const roleEntity = roles.find((r) => r.id === roleId);
  const roleLabel = roleEntity ? bilingualName(roleEntity.nameAr, roleEntity.nameEn, isAr) : null;

  // Lieu d'affectation : société + branche (le personnel non affecté — ex.
  // superadmin — n'a ni l'une ni l'autre)
  const company = companies.find((c) => c.id === companyId);
  const branch = branches.find((b) => b.id === branchId);
  const assignmentSite = company
    ? branch
      ? `${label(company)} — ${label(branch)}`
      : label(company)
    : t("notAssigned");

  return (
    <>
      <Title level={3} style={{ marginBlockStart: 0 }}>
        {t("profile")}
      </Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card variant="borderless" styles={{ body: { textAlign: "center", padding: 32 } }}>
            <Avatar
              size={80}
              style={{
                background: "var(--brand)",
                fontSize: 28,
                fontWeight: 700,
                marginBlockEnd: 16,
              }}
            >
              {displayName.slice(0, 2).toUpperCase()}
            </Avatar>
            <Title level={4} style={{ marginBlock: 0 }}>
              {displayName}
            </Title>
            <Text type="secondary" style={{ display: "block", marginBlockEnd: 12 }}>
              {email}
            </Text>
            {roleLabel && (
              <Space size={6} wrap style={{ justifyContent: "center" }}>
                <Tag bordered={false} color="blue" icon={<SafetyOutlined />}>
                  {roleLabel}
                </Tag>
              </Space>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card variant="borderless">
            <Descriptions
              column={1}
              size="small"
              bordered
              items={[
                { key: "email", label: t("email"), children: email ?? "—" },
                { key: "role", label: t("roleLabel"), children: roleLabel ?? "—" },
                {
                  key: "assignment",
                  label: t("assignmentSite"),
                  children: assignmentSite,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
