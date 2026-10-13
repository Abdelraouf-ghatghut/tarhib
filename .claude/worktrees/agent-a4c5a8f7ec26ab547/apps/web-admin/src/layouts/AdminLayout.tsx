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
  Divider,
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
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { companiesApi, branchesApi } from "../lib/api";

const { Sider, Header, Content } = Layout;

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
}

export function AdminLayout() {
  const { t, i18n } = useTranslation();
  const { logout, email, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const isAr = i18n.language === "ar";
  const isSuperadmin = role?.toUpperCase() === "SUPERADMIN";

  const { data: companies = [] } = useQuery<NamedEntity[]>({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
    enabled: isSuperadmin,
  });

  const { data: branches = [] } = useQuery<NamedEntity[]>({
    queryKey: ["branches", companyId],
    queryFn: () =>
      branchesApi.list(companyId ?? undefined).then((r) => r.data as NamedEntity[]),
    enabled: !!companyId,
  });

  const label = (e: NamedEntity) => (isAr ? e.nameAr : e.nameEn);

  const menuItems: MenuProps["items"] = useMemo(
    () => [
      { key: "/", icon: <DashboardOutlined />, label: t("dashboard") },
      {
        key: "config",
        label: t("configuration"),
        type: "group",
        children: [
          { key: "/companies", icon: <BankOutlined />, label: t("companies") },
          { key: "/branches", icon: <BranchesOutlined />, label: t("branches") },
          { key: "/departments", icon: <ApartmentOutlined />, label: t("departments") },
          { key: "/employees", icon: <TeamOutlined />, label: t("employees") },
          { key: "/products", icon: <ShoppingOutlined />, label: t("products") },
          { key: "/inventory", icon: <InboxOutlined />, label: t("inventory") },
        ],
      },
      {
        key: "operations",
        label: t("operations"),
        type: "group",
        children: [
          { key: "/orders", icon: <FileTextOutlined />, label: t("orders") },
          { key: "/quotas", icon: <PercentageOutlined />, label: t("quotas") },
        ],
      },
      {
        key: "reports",
        label: t("reports"),
        type: "group",
        children: [
          { key: "/reports", icon: <BarChartOutlined />, label: t("reports") },
        ],
      },
    ],
    [t],
  );

  return (
    <Layout style={{ minHeight: "100vh", background: "#F8F9FC" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={240}
        collapsedWidth={64}
        style={{
          position: "fixed",
          insetBlockStart: 0,
          insetBlockEnd: 0,
          overflow: "auto",
          background: "#fff",
          borderInlineEnd: "1px solid #EBECF0",
          zIndex: 100,
        }}
      >
        {/* Logo / Brand */}
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            paddingInline: collapsed ? 20 : 24,
            borderBlockEnd: "1px solid #EBECF0",
            gap: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#0052CC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>T</span>
          </div>
          {!collapsed && (
            <Typography.Text
              strong
              style={{ fontSize: 16, color: "#172B4D", whiteSpace: "nowrap" }}
            >
              {t("appTitle")}
            </Typography.Text>
          )}
        </div>

        {/* Menu */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            border: "none",
            padding: "8px 0",
            background: "transparent",
          }}
        />
      </Sider>

      <Layout
        style={{
          marginInlineStart: collapsed ? 64 : 240,
          transition: "margin 0.2s ease",
          minHeight: "100vh",
        }}
      >
        {/* Header */}
        <Header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 99,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            height: 64,
            background: "#fff",
            borderBlockEnd: "1px solid #EBECF0",
            boxShadow: "0 1px 0 #EBECF0",
          }}
        >
          {/* Left: collapse button + scope selectors */}
          <Space size={12}>
            <Button
              type="text"
              size="small"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: "#6B778C" }}
            />
            {isSuperadmin && (
              <Select
                allowClear
                placeholder={t("allCompanies")}
                style={{ minWidth: 180 }}
                value={companyId ?? undefined}
                onChange={(v) => {
                  setCompanyId(v ?? null);
                  setBranchId(null);
                }}
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

          {/* Right: lang + user */}
          <Space size={8}>
            <Dropdown
              menu={{
                items: [
                  { key: "ar", label: "العربية" },
                  { key: "en", label: "English" },
                ],
                onClick: ({ key }) => i18n.changeLanguage(key),
                selectedKeys: [i18n.language],
              }}
            >
              <Button
                type="text"
                size="small"
                style={{ color: "#6B778C", fontWeight: 600 }}
              >
                {i18n.language === "ar" ? "AR" : "EN"}
              </Button>
            </Dropdown>
            <Divider type="vertical" style={{ margin: 0 }} />
            <Space size={8}>
              <Avatar
                size={32}
                style={{ background: "#0052CC", fontSize: 13, fontWeight: 600 }}
              >
                {email?.charAt(0).toUpperCase() ?? "U"}
              </Avatar>
              <Typography.Text
                style={{ fontSize: 13, color: "#172B4D", maxWidth: 140 }}
                ellipsis
              >
                {email}
              </Typography.Text>
              <Button
                type="text"
                size="small"
                icon={<LogoutOutlined />}
                onClick={logout}
                style={{ color: "#6B778C" }}
              />
            </Space>
          </Space>
        </Header>

        {/* Content */}
        <Content style={{ margin: 24, minHeight: "calc(100vh - 64px - 48px)" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
