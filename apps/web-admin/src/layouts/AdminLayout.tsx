import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Layout,
  Menu,
  Button,
  Space,
  Typography,
  Dropdown,
  Avatar,
  Breadcrumb,
  Tooltip,
  Badge,
  Segmented,
  AutoComplete,
  Input,
  Grid,
  Popover,
} from "antd";
import type { MenuProps } from "antd";
import type { InputRef } from "antd";
import {
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
  MoonOutlined,
  SunOutlined,
  SafetyOutlined,
  CalendarOutlined,
  UserAddOutlined,
  AuditOutlined,
  SwapOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  CrownOutlined,
  GiftOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  BellOutlined,
  DownOutlined,
  MenuOutlined,
  HomeOutlined,
  IdcardOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { RightRail } from "../components/RightRail";
import { RAIL_WIDTH, useAdminNotifications } from "../hooks/useAdminNotifications";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

interface NavItem {
  key: string;
  label: string;
  icon: ReactNode;
}

interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

export function AdminLayout() {
  const { t, i18n } = useTranslation();
  const { logout, email, hasPermission, isSuperadmin } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1200);
  const [railOpen, setRailOpen] = useState(() => window.innerWidth >= 1440);
  const searchRef = useRef<InputRef>(null);
  const isAr = i18n.language.startsWith("ar");
  const notifications = useAdminNotifications();

  // Breakpoints : mobile < lg (sidebar off-canvas), tablette < xl (rail en
  // surimpression, recherche et scope repliés en popovers)
  const screens = Grid.useBreakpoint();
  const isMobile = screens.lg === false;
  const isCompact = screens.xl === false;

  // Le rail ne pousse le contenu que sur grand écran ; il se referme quand la
  // fenêtre passe sous xl (ajustement d'état pendant le rendu, pas d'effet)
  const [prevXl, setPrevXl] = useState(screens.xl);
  if (screens.xl !== prevXl) {
    setPrevXl(screens.xl);
    if (screens.xl === false && railOpen) setRailOpen(false);
  }

  // Raccourci Ctrl/Cmd+K → focus recherche
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Navigation groupée par sections (design SnowUI : Favoris / Configuration /
  // Opérations / Inventaire / Rapports), filtrée par permissions
  const navGroups: NavGroup[] = useMemo(() => {
    const groups: NavGroup[] = [
      {
        key: "favorites",
        label: t("favorites"),
        items: [{ key: "/", label: t("dashboard"), icon: <HomeOutlined /> }],
      },
    ];

    const config: NavItem[] = [];
    // Rôles & permissions en tête de section (demande métier)
    if (hasPermission("role.manage")) {
      config.push({ key: "/roles", label: t("rolesPermissions"), icon: <SafetyOutlined /> });
    }
    if (hasPermission("company.manage")) {
      config.push({ key: "/companies", label: t("companies"), icon: <BankOutlined /> });
    }
    if (hasPermission("company.manage") || hasPermission("branch.manage")) {
      config.push(
        { key: "/branches", label: t("branches"), icon: <BranchesOutlined /> },
        { key: "/departments", label: t("departments"), icon: <ApartmentOutlined /> },
      );
    }
    if (hasPermission("employee.manage")) {
      config.push(
        { key: "/employees/client", label: t("employeesClient"), icon: <TeamOutlined /> },
        { key: "/employees/internal", label: t("employeesInternal"), icon: <IdcardOutlined /> },
        { key: "/registrations", label: t("pendingRegistrations"), icon: <UserAddOutlined /> },
      );
    }
    if (hasPermission("company.manage")) {
      config.push({ key: "/products", label: t("products"), icon: <ShoppingOutlined /> });
    }
    if (hasPermission("company.manage")) {
      config.push({ key: "/audit", label: t("audit.title"), icon: <AuditOutlined /> });
    }
    if (config.length > 0) {
      groups.push({ key: "config", label: t("configuration"), items: config });
    }

    const operations: NavItem[] = [
      { key: "/orders", label: t("orders"), icon: <FileTextOutlined /> },
      { key: "/quotas", label: t("quotas"), icon: <PercentageOutlined /> },
    ];
    if (hasPermission("branch.manage") || hasPermission("company.manage")) {
      operations.push(
        { key: "/meeting-rooms-admin", label: t("meetingRoomsAdmin"), icon: <CalendarOutlined /> },
        {
          key: "/meeting-service-packages",
          label: t("meetingServicePackages"),
          icon: <GiftOutlined />,
        },
      );
    }
    groups.push({ key: "operations", label: t("operations"), items: operations });

    if (hasPermission("inventory.manage") || hasPermission("company.manage")) {
      groups.push({
        key: "inventory",
        label: t("inventoryGroup"),
        items: [
          { key: "/inventory", label: t("stock"), icon: <InboxOutlined /> },
          { key: "/inventory-transfers", label: t("inventoryTransfers"), icon: <SwapOutlined /> },
          { key: "/suppliers", label: t("suppliers"), icon: <ShopOutlined /> },
          { key: "/procurement", label: t("procurement"), icon: <ShoppingCartOutlined /> },
          { key: "/vip-tasks", label: t("vipSelfService"), icon: <CrownOutlined /> },
        ],
      });
    }

    if (
      hasPermission("report.view") ||
      hasPermission("company.manage") ||
      hasPermission("branch.manage")
    ) {
      groups.push({
        key: "reports",
        label: t("reports"),
        items: [{ key: "/reports", label: t("reports"), icon: <BarChartOutlined /> }],
      });
    }

    return groups;
  }, [t, hasPermission]);

  const menuItems: MenuProps["items"] = useMemo(
    () =>
      navGroups.map((g) => ({
        key: g.key,
        label: g.label,
        type: "group" as const,
        children: g.items.map((i) => ({ key: i.key, icon: i.icon, label: i.label })),
      })),
    [navGroups],
  );

  const searchOptions = useMemo(
    () => navGroups.flatMap((g) => g.items).map((i) => ({ value: i.key, label: i.label })),
    [navGroups],
  );

  // Breadcrumb : Tableau de bord / groupe / page (Vue d'ensemble sur l'accueil)
  const breadcrumbItems = useMemo(() => {
    const items: Array<{ title: ReactNode }> = [
      {
        title:
          location.pathname === "/" ? (
            t("dashboard")
          ) : (
            <a onClick={() => navigate("/")}>{t("dashboard")}</a>
          ),
      },
    ];
    if (location.pathname === "/") return items;
    for (const group of navGroups) {
      const item = group.items.find((i) => i.key === location.pathname);
      if (item) {
        if (group.key !== "favorites") items.push({ title: group.label });
        items.push({ title: item.label });
        break;
      }
    }
    return items;
  }, [navGroups, location.pathname, navigate, t]);

  const siderWidth = collapsed ? (isMobile ? 0 : 72) : 240;
  const displayName = (email ?? "user").split("@")[0];
  const userMenu: MenuProps["items"] = [
    {
      key: "profile",
      icon: <IdcardOutlined />,
      label: t("profile"),
      onClick: () => navigate("/profile"),
    },
    { type: "divider" },
    { key: "logout", icon: <LogoutOutlined />, label: t("logout"), onClick: logout },
  ];

  const goTo = (key: string) => {
    navigate(key);
    if (isMobile) setCollapsed(true);
  };

  const searchBox = (
    <div className="header-search-wrap">
      <AutoComplete
        options={searchOptions}
        onSelect={(key: string) => goTo(key)}
        filterOption={(input, option) =>
          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
        }
        style={{ width: "100%" }}
        popupMatchSelectWidth={280}
      >
        <Input
          ref={searchRef}
          className="header-search"
          allowClear
          prefix={<SearchOutlined style={{ color: "var(--fg-body-subtle)" }} />}
          placeholder={t("searchPlaceholder")}
          variant="filled"
          suffix={<Text className="header-search-kbd">⌘K</Text>}
        />
      </AutoComplete>
    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Scrim mobile : la sidebar ouverte recouvre le contenu */}
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            zIndex: 28,
          }}
        />
      )}
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={240}
        collapsedWidth={isMobile ? 0 : 72}
        breakpoint="xl"
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={{
          position: "fixed",
          insetBlockStart: 0,
          insetBlockEnd: 0,
          insetInlineStart: 0,
          overflow: "auto",
          zIndex: isMobile ? 30 : 10,
          display: "flex",
          flexDirection: "column",
          // SnowUI §5 : la sidebar reprend le fond de page, pas de surface blanche
          background: "var(--neutral-secondary-soft)",
          borderInlineEnd: "1px solid var(--border-default)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            paddingInline: 20,
            gap: 10,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "var(--brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            T
          </div>
          {!collapsed && (
            <Text strong style={{ fontSize: 15, color: "var(--fg-heading)" }}>
              {t("appTitle")}
            </Text>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => goTo(key)}
          style={{ border: "none", paddingBlock: 4 }}
        />

        {/* Aide & Support + collapse, épinglés en bas */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            padding: "10px 12px",
            borderBlockStart: "1px solid var(--border-default)",
            background: "var(--neutral-secondary-soft)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <Button
            type="text"
            icon={<QuestionCircleOutlined />}
            href="mailto:support@tarhib.app"
            style={{ width: "100%", justifyContent: collapsed ? "center" : "flex-start" }}
          >
            {!collapsed && t("helpSupport")}
          </Button>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: "100%", justifyContent: collapsed ? "center" : "flex-start" }}
          />
        </div>
      </Sider>

      <Layout
        style={{
          marginInlineStart: siderWidth,
          marginInlineEnd: railOpen && !isCompact ? RAIL_WIDTH : 0,
          transition: "margin 0.2s",
        }}
      >
        <Header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: screens.md ? "0 20px" : "0 12px",
            height: 64,
            // Header glass adaptatif (SnowUI §4)
            background: "var(--header-glass)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBlockEnd: "1px solid var(--border-default)",
            gap: 10,
          }}
        >
          {/* Gauche : burger + breadcrumb (les filtres société/branche vivent
              désormais dans les pages concernées via ScopeFilterBar) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: screens.md ? 14 : 6,
              minWidth: 0,
              flexShrink: 1,
              overflow: "hidden",
            }}
          >
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              aria-label="menu"
            />
            {screens.md && (
              <div style={{ whiteSpace: "nowrap", overflow: "hidden" }}>
                <Breadcrumb items={breadcrumbItems} />
              </div>
            )}
          </div>

          {/* Droite : recherche, langue, thème, notifications, profil */}
          <Space align="center" size={screens.md ? 10 : 4} style={{ flexShrink: 0 }}>
            {isCompact ? (
              <Popover trigger="click" placement="bottom" content={searchBox}>
                <Button type="text" icon={<SearchOutlined />} aria-label={t("search")} />
              </Popover>
            ) : (
              searchBox
            )}

            {screens.sm ? (
              <Segmented
                value={isAr ? "ar" : "en"}
                onChange={(v) => i18n.changeLanguage(String(v))}
                options={[
                  { label: "AR", value: "ar" },
                  { label: "EN", value: "en" },
                ]}
              />
            ) : (
              <Popover
                trigger="click"
                placement="bottom"
                content={
                  <Segmented
                    value={isAr ? "ar" : "en"}
                    onChange={(v) => i18n.changeLanguage(String(v))}
                    options={[
                      { label: "AR", value: "ar" },
                      { label: "EN", value: "en" },
                    ]}
                  />
                }
              >
                <Button
                  type="text"
                  className="header-icon-btn"
                  icon={<GlobalOutlined />}
                  aria-label={t("language")}
                />
              </Popover>
            )}

            <Tooltip title={t("toggleTheme")}>
              <Button
                type="text"
                className="header-icon-btn"
                aria-label={t("toggleTheme")}
                icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggleTheme}
              />
            </Tooltip>

            <Badge count={notifications.length} size="small" offset={isAr ? [4, 4] : [-4, 4]}>
              <Button
                type="text"
                className="header-icon-btn"
                icon={<BellOutlined />}
                aria-label={t("notifications")}
                onClick={() => setRailOpen((o) => !o)}
              />
            </Badge>

            <Dropdown menu={{ items: userMenu }} trigger={["click"]}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <Avatar
                  size={32}
                  style={{ background: "var(--brand)", fontSize: 12, fontWeight: 700 }}
                >
                  {displayName.slice(0, 2).toUpperCase()}
                </Avatar>
                {screens.md && (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                      <Text strong style={{ fontSize: 13, color: "var(--fg-heading)" }}>
                        {displayName}
                      </Text>
                      <Text style={{ fontSize: 11, color: "var(--fg-body-subtle)" }}>
                        {isSuperadmin ? t("superadmin") : t("administrator")}
                      </Text>
                    </div>
                    <DownOutlined style={{ fontSize: 10, color: "var(--fg-body-subtle)" }} />
                  </>
                )}
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: screens.md ? 24 : 12, overflow: "initial" }}>
          <Outlet />
        </Content>
      </Layout>

      {/* Rail : pousse le contenu sur grand écran, surimpression avec scrim en dessous */}
      {railOpen && isCompact && (
        <div
          onClick={() => setRailOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            zIndex: 28,
          }}
        />
      )}
      {railOpen && <RightRail notifications={notifications} zIndex={isCompact ? 30 : 8} />}
    </Layout>
  );
}
