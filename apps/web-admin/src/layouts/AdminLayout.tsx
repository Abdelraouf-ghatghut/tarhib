import { useMemo, useState } from "react";
import {
  Layout,
  Menu,
  Button,
  Space,
  Typography,
  Dropdown,
  Select,
  Avatar,
  Breadcrumb,
} from "antd";
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
      configChildren.push({
        key: "/inventory-transfers",
        icon: <InboxOutlined />,
        label: t("inventoryTransfers"),
      });
      configChildren.push({
        key: "/vip-tasks",
        icon: <InboxOutlined />,
        label: t("vipSelfService"),
      });
      configChildren.push({
        key: "/suppliers",
        icon: <InboxOutlined />,
        label: t("suppliers"),
      });
      configChildren.push({
        key: "/procurement",
        icon: <InboxOutlined />,
        label: t("procurement"),
      });
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

    if (hasPermission("company.manage")) {
      items.push({
        key: "system",
        label: t("audit.menuGroup"),
        type: "group",
        children: [{ key: "/audit", icon: <FileTextOutlined />, label: t("audit.title") }],
      });
    }

    return items;
  }, [t, hasPermission]);

  const langItems: MenuProps["items"] = [
    { key: "ar", label: t("arabic") },
    { key: "en", label: t("english") },
  ];

  // Breadcrumb: Dashboard > groupe > page, derive du menu (guide section 5)
  const breadcrumbItems = useMemo(() => {
    const items: Array<{ title: React.ReactNode }> = [
      {
        title:
          location.pathname === "/" ? (
            t("dashboard")
          ) : (
            <a onClick={() => navigate("/")}>{t("dashboard")}</a>
          ),
      },
    ];
    for (const item of menuItems ?? []) {
      if (item && "children" in item && item.children) {
        const child = item.children.find((c) => c && c.key === location.pathname);
        if (child && "label" in child) {
          if ("label" in item && item.label) items.push({ title: item.label });
          items.push({ title: child.label });
          break;
        }
      }
    }
    return items;
  }, [menuItems, location.pathname, navigate, t]);

  const siderWidth = collapsed ? 72 : 240;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={240}
        collapsedWidth={72}
        style={{
          position: "fixed",
          insetBlockStart: 0,
          insetBlockEnd: 0,
          overflow: "auto",
          zIndex: 10,
          background: "#FFFFFF",
          borderInlineEnd: "1px solid #E2E8F0",
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            paddingInline: 20,
            gap: 10,
            borderBlockEnd: "1px solid #E2E8F0",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            T
          </div>
          {!collapsed && (
            <Text strong style={{ fontSize: 15, color: "#0F172A" }}>
              {t("appTitle")}
            </Text>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ border: "none", paddingBlock: 8 }}
        />

        {/* Collapse toggle at bottom */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            padding: "12px 16px",
            borderBlockStart: "1px solid #E2E8F0",
            background: "#FFFFFF",
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: "100%", justifyContent: collapsed ? "center" : "flex-start" }}
          />
        </div>
      </Sider>

      <Layout style={{ marginInlineStart: siderWidth, transition: "margin 0.2s" }}>
        <Header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            height: 56,
            background: "#FFFFFF",
            borderBlockEnd: "1px solid #E2E8F0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            gap: 12,
          }}
        >
          {/* Left: scope selectors */}
          <Space size={8}>
            {isSuperadmin && (
              <Select
                allowClear
                placeholder={t("allCompanies")}
                style={{ minWidth: 160 }}
                value={companyId ?? undefined}
                onChange={(v) => setCompanyId(v ?? null)}
                options={companies.map((c) => ({ value: c.id, label: label(c) }))}
                size="middle"
                variant="filled"
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
              variant="filled"
            />
          </Space>

          {/* Right: lang, avatar, logout */}
          <Space>
            <Dropdown
              menu={{
                items: langItems,
                onClick: ({ key }) => i18n.changeLanguage(key),
              }}
            >
              <Button icon={<GlobalOutlined />} type="text" size="small">
                {i18n.language === "ar" ? "AR" : "EN"}
              </Button>
            </Dropdown>

            <Avatar
              size={30}
              style={{ background: "#2563EB", cursor: "default", fontSize: 12, fontWeight: 700 }}
            >
              {(email ?? "U").charAt(0).toUpperCase()}
            </Avatar>

            <Button icon={<LogoutOutlined />} type="text" size="small" onClick={logout}>
              {t("logout")}
            </Button>
          </Space>
        </Header>

        <Content style={{ margin: "24px", overflow: "initial" }}>
          <Breadcrumb items={breadcrumbItems} style={{ marginBlockEnd: 16 }} />
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
