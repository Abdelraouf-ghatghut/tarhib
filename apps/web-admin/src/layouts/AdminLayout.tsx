import { useMemo, useState } from "react";
import { Layout, Menu, Button, Space, Typography, Dropdown } from "antd";
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
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

export function AdminLayout() {
  const { t, i18n } = useTranslation();
  const { logout, email, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems: MenuProps["items"] = useMemo(() => {
    const items: MenuProps["items"] = [
      { key: "/", icon: <DashboardOutlined />, label: t("dashboard") },
    ];

    // Configuration section
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
    }
    if (hasPermission("company.manage")) {
      configChildren.push({ key: "/products", icon: <ShoppingOutlined />, label: t("products") });
    }
    if (hasPermission("inventory.manage") || hasPermission("company.manage")) {
      configChildren.push({ key: "/inventory", icon: <InboxOutlined />, label: t("inventory") });
    }
    if (hasPermission("branch.manage") || hasPermission("company.manage")) {
      configChildren.push({
        key: "/meeting-rooms-admin",
        icon: <CalendarOutlined />,
        label: t("meetingRoomsAdmin"),
      });
    }

    if (configChildren.length > 0) {
      items.push({
        key: "config",
        label: t("configuration"),
        type: "group",
        children: configChildren,
      });
    }

    // Operations section — always visible
    items.push({
      key: "operations",
      label: t("operations"),
      type: "group",
      children: [
        { key: "/orders", icon: <FileTextOutlined />, label: t("orders") },
        { key: "/quotas", icon: <PercentageOutlined />, label: t("quotas") },
      ],
    });

    // Reports section
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
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Space>
            <Text type="secondary">{email}</Text>
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
