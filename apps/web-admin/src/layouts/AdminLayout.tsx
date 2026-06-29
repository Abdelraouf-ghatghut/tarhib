import { useMemo, useState } from "react";
import { Layout, Menu, Button, Space, Typography, Dropdown, Select } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  BankOutlined,
  BranchesOutlined,
  ApartmentOutlined,
  TeamOutlined,
  ShoppingOutlined,
  InboxOutlined,
  FileTextOutlined,
  PercentageOutlined,
  BarChartOutlined,
  LogoutOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyOutlined,
  CalendarOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useScope } from "../contexts/ScopeContext";
import { companiesApi, branchesApi } from "../lib/api";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
}

export function AdminLayout() {
  const { t, i18n } = useTranslation();
  const { logout, email, hasPermission, isSuperadmin } = useAuth();
  const { companyId, branchId, setCompanyId, setBranchId } = useScope();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const isAr = i18n.language === "ar";

  const { data: companies = [] } = useQuery<NamedEntity[]>({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
    enabled: isSuperadmin,
  });

  const { data: branches = [] } = useQuery<NamedEntity[]>({
    queryKey: ["branches", companyId],
    queryFn: () => branchesApi.list(companyId ?? undefined).then((r) => r.data as NamedEntity[]),
    enabled: !!companyId,
  });

  const label = (e: NamedEntity) => (isAr ? e.nameAr : e.nameEn);

  const menuItems: MenuProps["items"] = useMemo(() => {
    const items: MenuProps["items"] = [
      { key: "/", icon: <DashboardOutlined />, label: t("dashboard") },
    ];

    const configChildren: MenuProps["items"] = [];
    if (hasPermission("role.manage")) {
      configChildren.push({ key: "/roles", icon: <SafetyOutlined />, label: t("roles") });
    }
    if (hasPermission("company.manage")) {
      configChildren.push({ key: "/companies", icon: <BankOutlined />, label: t("companies") });
    }
    if (hasPermission("company.manage") || hasPermission("branch.manage")) {
      configChildren.push(
        { key: "/branches", icon: <BranchesOutlined />, label: t("branches") },
        { key: "/departments", icon: <ApartmentOutlined />, label: t("departments") },
      );
    }
    if (hasPermission("employee.manage")) {
      configChildren.push({ key: "/employees", icon: <TeamOutlined />, label: t("employees") });
      configChildren.push({
        key: "/registrations",
        icon: <UserAddOutlined />,
        label: t("pendingRegistrations"),
      });
    }
    if (hasPermission("company.manage")) {
      configChildren.push({ key: "/products", icon: <ShoppingOutlined />, label: t("products") });
    }
    if (hasPermission("inventory.manage") || hasPermission("company.manage")) {
      configChildren.push({ key: "/inventory", icon: <InboxOutlined />, label: t("inventory") });
    }
    if (hasPermission("branch.manage") || hasPermission("company.manage")) {
      configChildren.push(
        {
          key: "/meeting-rooms-admin",
          icon: <CalendarOutlined />,
          label: t("meetingRoomsAdmin"),
        },
        {
          key: "/meeting-service-packages",
          icon: <CalendarOutlined />,
          label: t("meetingServicePackages"),
        },
      );
    }

    if (configChildren.length > 0) {
      items.push({
        key: "config",
        label: t("configuration"),
        type: "group",
        children: configChildren,
      });
    }

    items.push({
      key: "operations",
      label: t("operations"),
      type: "group",
      children: [
        { key: "/orders", icon: <FileTextOutlined />, label: t("orders") },
        { key: "/quotas", icon: <PercentageOutlined />, label: t("quotas") },
      ],
    });

    if (
      hasPermission("report.view") ||
      hasPermission("company.manage") ||
      hasPermission("branch.manage")
    ) {
      items.push({
        key: "reports",
        label: t("reports"),
        type: "group",
        children: [{ key: "/reports", icon: <BarChartOutlined />, label: t("reports") }],
      });
    }

    return items;
  }, [t, hasPermission]);

  const langItems: MenuProps["items"] = [
    { key: "ar", label: t("arabic") },
    { key: "en", label: t("english") },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={220}
        style={{
          position: "fixed",
          insetBlockStart: 0,
          insetBlockEnd: 0,
          overflow: "auto",
          zIndex: 10,
        }}
      >
        <div
          style={{
            padding: "16px",
            color: "white",
            fontWeight: "bold",
            fontSize: collapsed ? 14 : 18,
          }}
        >
          {collapsed ? "T" : t("appTitle")}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout style={{ marginInlineStart: collapsed ? 80 : 220, transition: "margin 0.2s" }}>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            background: "#fff",
            borderBlockEnd: "1px solid #f0f0f0",
            gap: 12,
          }}
        >
          {/* Left: collapse + scope selectors */}
          <Space size={8}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />

            {isSuperadmin && (
              <Select
                allowClear
                placeholder={t("allCompanies")}
                style={{ minWidth: 160 }}
                value={companyId ?? undefined}
                onChange={(v) => setCompanyId(v ?? null)}
                options={companies.map((c) => ({ value: c.id, label: label(c) }))}
                size="middle"
              />
            )}

            <Select
              allowClear
              placeholder={t("allBranches")}
              style={{ minWidth: 160 }}
              value={branchId ?? undefined}
              onChange={(v) => setBranchId(v ?? null)}
              options={branches.map((b) => ({ value: b.id, label: label(b) }))}
              disabled={!companyId}
              size="middle"
            />
          </Space>

          {/* Right: email, lang, logout */}
          <Space>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {email}
            </Text>
            <Dropdown
              menu={{
                items: langItems,
                onClick: ({ key }) => i18n.changeLanguage(key),
              }}
            >
              <Button icon={<GlobalOutlined />} type="text">
                {i18n.language === "ar" ? "AR" : "EN"}
              </Button>
            </Dropdown>
            <Button icon={<LogoutOutlined />} type="text" onClick={logout}>
              {t("logout")}
            </Button>
          </Space>
        </Header>

        <Content style={{ margin: "24px", overflow: "initial" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
