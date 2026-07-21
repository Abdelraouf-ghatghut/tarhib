import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import {
  BottomTabs,
  Screen,
  adjustInventory,
  createReplenishmentRequest,
  createSnowStyles,
  fetchDashboardStats,
  fetchEmployeeCatalog,
  fetchInventory,
  fetchKitchenQueue,
  fetchCompanies,
  fetchBranches,
  fetchDeliveryQueue,
  fetchOrders,
  markDelivered,
  markReady,
  orderStatusLabel,
  priorityRank,
  reportOrderIncident,
  spacing,
  startPreparation,
  t,
  useAuthStore,
  useOrderEvents,
  type InventoryItem,
  type DeliveryTask,
  type Lang,
  type Order,
  type OrderStatus,
  type SnowTheme,
  type StockZone,
} from "@tarhib/mobile-shared";

import { AdjustStockPanel } from "../components/AdjustStockPanel";
import { OpsHeader } from "../components/ui";
import { useOperationsNotifications } from "../hooks/useOperationsNotifications";
import { arOrEn, displayEmployeeName, orderCode, productName } from "../lib/format";
import { HistoryModal } from "../modals/HistoryModal";
import { NotificationsModal } from "../modals/NotificationsModal";
import { OrderDetailModal } from "../modals/OrderDetailModal";
import { DashboardTab } from "./tabs/DashboardTab";
import { ProfileTab } from "./tabs/ProfileTab";
import { QueueTab, type QueueFilter } from "./tabs/QueueTab";
import { StockTab, isLowStock } from "./tabs/StockTab";
import { WorkplaceTab } from "./tabs/WorkplaceTab";
import { ResourcesTab } from "./tabs/ResourcesTab";
import { CleaningTab } from "./tabs/CleaningTab";
import { DeliveryTab, ScopeFilterModal } from "./tabs/DeliveryTab";
import { MeetingsTab } from "./tabs/MeetingsTab";
import { MoreTab, type OperationsModuleItem } from "./tabs/MoreTab";
import { ProcurementTab } from "./tabs/ProcurementTab";
import { IncidentsTab } from "./tabs/IncidentsTab";

type Tab =
  | "workplace"
  | "dashboard"
  | "kitchen"
  | "delivery"
  | "stock"
  | "transfers"
  | "replenishments"
  | "vip"
  | "procurement"
  | "cleaning"
  | "meetings"
  | "incidents"
  | "more"
  | "profile";

export const OperationsApp = ({
  lang,
  theme,
  onLogout,
  onToggleTheme,
  onToggleLang,
}: {
  lang: Lang;
  theme: SnowTheme;
  onLogout: () => void;
  onToggleTheme: () => void;
  onToggleLang: () => void;
}) => {
  const copy = t(lang);
  const [tab, setTab] = useState<Tab>("workplace");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("ALL");
  const [stockZone, setStockZone] = useState<StockZone>("KITCHEN");
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustReason, setAdjustReason] = useState<string | undefined>(undefined);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [scopeFilterOpen, setScopeFilterOpen] = useState(false);
  const [scopeFilterPicker, setScopeFilterPicker] = useState<"company" | "branch" | null>(null);
  const companyId = useAuthStore((s) => s.companyId);
  const branchId = useAuthStore((s) => s.branchId);
  const employee = useAuthStore((s) => s.employee);
  const roles = useAuthStore((s) => s.roles);
  const dataScope = useAuthStore((s) => s.dataScope);
  const permissions = useAuthStore((s) => s.permissions);
  const capabilities = useAuthStore((s) => s.capabilities);
  const queryClient = useQueryClient();
  const primaryRole = roles.find((role) => role.primary);
  const roleLabel = primaryRole
    ? lang === "ar"
      ? primaryRole.nameAr
      : primaryRole.nameEn || primaryRole.nameAr
    : copy.operations;
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(companyId);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(branchId);
  const effectiveCompanyId = dataScope === "GLOBAL" ? selectedCompanyId : companyId;
  const effectiveBranchId =
    dataScope === "GLOBAL" || dataScope === "COMPANY" ? selectedBranchId : branchId;

  useEffect(() => {
    setSelectedCompanyId(companyId);
    setSelectedBranchId(branchId);
  }, [companyId, branchId]);

  const companiesQuery = useQuery({
    queryKey: ["scope-companies"],
    queryFn: fetchCompanies,
    enabled: dataScope === "GLOBAL",
    staleTime: 300_000,
  });
  const branchesQuery = useQuery({
    queryKey: ["scope-branches", effectiveCompanyId],
    queryFn: () => fetchBranches(effectiveCompanyId!),
    enabled: Boolean(effectiveCompanyId && ["GLOBAL", "COMPANY"].includes(dataScope ?? "")),
    staleTime: 300_000,
  });

  // Rôle réel côté client, en miroir de allowedTransitions() côté backend
  // (orders.service.ts) — un Cuisinier ne voit que start/ready, un Livreur
  // ne voit que deliver.
  const canPrepare = permissions.includes("order.prepare");
  const canDeliver = permissions.includes("order.deliver");
  const canManageQueue = permissions.includes("order.queue.manage");
  const canSeeMeetingPrep =
    capabilities.canViewMeetingPreparations === true ||
    permissions.includes("meeting.order_services");
  const canViewDashboard = capabilities.canViewOperationsDashboard === true;
  const canViewStock =
    capabilities.canViewStock === true || capabilities.canViewKitchenStock === true;
  const canViewVip = capabilities.canViewVip === true;
  const canManageVip = capabilities.canManageVip === true;
  const canViewProcurement = capabilities.canViewProcurement === true;
  const canManageProcurement = capabilities.canManageProcurement === true;
  const canTransferStock = capabilities.canTransferStock === true;
  const canRequestReplenishment = capabilities.canRequestKitchenReplenishment === true;
  const canViewCleaning = capabilities.canViewCleaningTasks === true;
  const canCompleteCleaning = capabilities.canCompleteCleaningTasks === true;

  const notifications = useOperationsNotifications(lang);

  useOrderEvents(queryClient, undefined, (event) => {
    if (!event.status) return;
    notifications.add({
      refId: event.orderId,
      title: orderStatusLabel(event.status, lang),
      body: `${orderCode(event.orderId)}`,
      createdAt: new Date().toISOString(),
    });
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: 30_000,
  });
  const ordersQuery = useQuery({
    queryKey: ["operations-orders", effectiveCompanyId, effectiveBranchId],
    queryFn: () => fetchOrders({ companyId: effectiveCompanyId, branchId: effectiveBranchId }),
    enabled: permissions.includes("order.queue.manage") || canViewDashboard,
    refetchInterval: 20_000,
  });
  const kitchenQuery = useQuery({
    queryKey: ["kitchen-queue", effectiveBranchId],
    queryFn: () => fetchKitchenQueue(effectiveBranchId ?? undefined),
    enabled: canPrepare,
    refetchInterval: 20_000,
  });
  const deliveryQuery = useQuery({
    queryKey: ["delivery-queue", effectiveBranchId],
    queryFn: () => fetchDeliveryQueue(effectiveBranchId ?? undefined),
    enabled: canDeliver || canManageQueue,
    refetchInterval: 20_000,
  });
  const inventoryQuery = useQuery({
    queryKey: ["inventory", effectiveCompanyId, effectiveBranchId, stockZone],
    queryFn: () =>
      fetchInventory({
        companyId: effectiveCompanyId ?? undefined,
        branchId: effectiveBranchId ?? undefined,
      }),
    enabled: Boolean(effectiveCompanyId && effectiveBranchId),
    refetchInterval: 30_000,
  });
  const catalogQuery = useQuery({
    queryKey: ["ops-catalog-names"],
    queryFn: fetchEmployeeCatalog,
    staleTime: 60_000,
  });

  const productsById = useMemo(
    () => new Map((catalogQuery.data ?? []).map((product) => [product.id, product])),
    [catalogQuery.data],
  );
  const orders = useMemo(() => {
    const merged = [
      ...(ordersQuery.data ?? []),
      ...(kitchenQuery.data ?? []),
      ...(deliveryQuery.data ?? []).map((task) => task.order),
    ];
    return [...new Map(merged.map((order) => [order.id, order])).values()];
  }, [ordersQuery.data, kitchenQuery.data, deliveryQuery.data]);
  const queueOrders = useMemo(() => {
    const statuses: OrderStatus[] = ["APPROVED", "IN_PROGRESS", "READY"];
    return orders
      .filter((order) => statuses.includes(order.status))
      .filter((order) => queueFilter === "ALL" || order.status === queueFilter)
      .sort((a, b) => {
        const rankDiff = priorityRank(a.priority) - priorityRank(b.priority);
        if (rankDiff !== 0) return rankDiff;
        return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime();
      });
  }, [orders, queueFilter]);
  const kitchenOrders = useMemo(
    () => orders.filter((order) => ["APPROVED", "IN_PROGRESS"].includes(order.status)),
    [orders],
  );
  const deliveryTasks = deliveryQuery.data ?? [];
  const deliveryOrders = useMemo(() => deliveryTasks.map((task) => task.order), [deliveryTasks]);
  const inventoryItems = inventoryQuery.data ?? [];
  const lowStock = inventoryItems.filter(isLowStock);

  // Alerte stock bas → fil de notifications local (pas de backend dédié,
  // voir useOperationsNotifications.ts). Dédoublonné par item+quantité dans
  // le hook, donc un re-fetch identique ne spamme pas.
  useEffect(() => {
    lowStock.forEach((item) => {
      notifications.add({
        refId: item.id,
        title: copy.lowStock,
        body: `${productName(productsById.get(item.productId), lang, item.productId)} — ${item.quantity}/${item.minThreshold}`,
        createdAt: new Date().toISOString(),
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowStock, productsById]);

  const invalidateOps = () => {
    void queryClient.invalidateQueries({ queryKey: ["operations-orders"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    void queryClient.invalidateQueries({ queryKey: ["kitchen-queue"] });
  };

  type OptimisticOrderContext = {
    orderQueries: Array<[readonly unknown[], Order[] | undefined]>;
    kitchenQueries: Array<[readonly unknown[], Order[] | undefined]>;
    deliveryQueries: Array<[readonly unknown[], DeliveryTask[] | undefined]>;
    selected: Order | null;
  };
  const optimisticallySetOrderStatus = (
    orderId: string,
    status: OrderStatus,
  ): OptimisticOrderContext => {
    const context: OptimisticOrderContext = {
      orderQueries: queryClient.getQueriesData<Order[]>({ queryKey: ["operations-orders"] }),
      kitchenQueries: queryClient.getQueriesData<Order[]>({ queryKey: ["kitchen-queue"] }),
      deliveryQueries: queryClient.getQueriesData<DeliveryTask[]>({ queryKey: ["delivery-queue"] }),
      selected: selectedOrder,
    };
    const update = (order: Order) => (order.id === orderId ? { ...order, status } : order);
    queryClient.setQueriesData<Order[]>({ queryKey: ["operations-orders"] }, (current) =>
      current?.map(update),
    );
    queryClient.setQueriesData<Order[]>({ queryKey: ["kitchen-queue"] }, (current) =>
      current?.map(update),
    );
    queryClient.setQueriesData<DeliveryTask[]>({ queryKey: ["delivery-queue"] }, (current) =>
      current?.map((task) => ({ ...task, order: update(task.order) })),
    );
    setSelectedOrder((current) => (current?.id === orderId ? update(current) : current));
    return context;
  };
  const rollbackOrder = (context?: OptimisticOrderContext) => {
    if (!context) return;
    context.orderQueries.forEach(([key, data]) => queryClient.setQueryData(key, data));
    context.kitchenQueries.forEach(([key, data]) => queryClient.setQueryData(key, data));
    context.deliveryQueries.forEach(([key, data]) => queryClient.setQueryData(key, data));
    setSelectedOrder(context.selected);
  };

  const startMutation = useMutation({
    mutationFn: startPreparation,
    onMutate: (orderId) => optimisticallySetOrderStatus(orderId, "IN_PROGRESS"),
    onError: (_error, _orderId, context) => rollbackOrder(context),
    onSettled: invalidateOps,
  });
  const readyMutation = useMutation({
    mutationFn: markReady,
    onMutate: (orderId) => optimisticallySetOrderStatus(orderId, "READY"),
    onError: (_error, _orderId, context) => rollbackOrder(context),
    onSettled: invalidateOps,
  });
  const deliveredMutation = useMutation({
    mutationFn: markDelivered,
    onMutate: (orderId) => optimisticallySetOrderStatus(orderId, "DELIVERED"),
    onError: (_error, _orderId, context) => rollbackOrder(context),
    onSettled: invalidateOps,
  });
  const incidentMutation = useMutation({
    mutationFn: (input: { orderId: string; reason: string; description: string }) =>
      reportOrderIncident(input.orderId, input.reason, input.description),
    onSuccess: () => {
      setSelectedOrder(null);
      invalidateOps();
      void queryClient.invalidateQueries({ queryKey: ["delivery-queue"] });
    },
  });
  const stockMutation = useMutation({
    mutationFn: (input: { itemId: string; quantity: number; reason: string }) =>
      adjustInventory(input.itemId, "AJUSTEMENT", input.quantity, input.reason),
    onSuccess: () => {
      setAdjustingItem(null);
      setAdjustReason(undefined);
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
  const replenishmentMutation = useMutation({
    mutationFn: (item: InventoryItem) =>
      createReplenishmentRequest({
        companyId: item.companyId,
        branchId: item.branchId,
        productId: item.productId,
        requestedQty: Math.max(1, (item.maxThreshold ?? item.minThreshold * 2) - item.quantity),
        note: arOrEn(lang, "طلب من تطبيق عمليات ترحيب", "Request from Tarhib Operations"),
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["operations-resource", "replenishments"] }),
  });

  const queueBusy =
    startMutation.isPending ||
    readyMutation.isPending ||
    deliveredMutation.isPending ||
    incidentMutation.isPending;
  const itemName = (item: InventoryItem) =>
    productName(productsById.get(item.productId), lang, item.productId);
  const moduleTabs: OperationsModuleItem[] = [
    ...(canPrepare
      ? [
          {
            key: "kitchen",
            label: arOrEn(lang, "المطبخ", "Kitchen"),
            icon: "restaurant" as const,
            badge: kitchenOrders.length,
          },
        ]
      : []),
    ...(canDeliver || canManageQueue
      ? [
          {
            key: "delivery",
            label: arOrEn(lang, "التوصيل", "Delivery"),
            icon: "bicycle" as const,
            badge: deliveryOrders.length,
          },
        ]
      : []),
    ...(canViewStock
      ? [{ key: "stock", label: copy.stock, icon: "cube" as const, badge: lowStock.length }]
      : []),
    ...(canTransferStock
      ? [
          {
            key: "transfers",
            label: arOrEn(lang, "التحويلات", "Transfers"),
            icon: "swap-horizontal" as const,
          },
        ]
      : []),
    ...(canTransferStock
      ? [
          {
            key: "replenishments",
            label: arOrEn(lang, "طلبات المطبخ", "Requests"),
            icon: "arrow-up-circle" as const,
          },
        ]
      : []),
    ...(canViewVip ? [{ key: "vip", label: "VIP", icon: "diamond" as const }] : []),
    ...(canViewProcurement
      ? [
          {
            key: "procurement",
            label: arOrEn(lang, "المشتريات", "Purchasing"),
            icon: "cart" as const,
          },
        ]
      : []),
    ...(canViewCleaning
      ? [{ key: "cleaning", label: arOrEn(lang, "التنظيف", "Cleaning"), icon: "sparkles" as const }]
      : []),
    ...(canSeeMeetingPrep
      ? [
          {
            key: "meetings",
            label: arOrEn(lang, "الاجتماعات", "Meetings"),
            icon: "calendar" as const,
          },
        ]
      : []),
    ...(canManageQueue
      ? [
          {
            key: "incidents",
            label: arOrEn(lang, "الحوادث", "Incidents"),
            icon: "alert-circle" as const,
            badge: deliveryTasks.filter((task) => task.status === "ISSUE_REPORTED").length,
          },
        ]
      : []),
    ...(canViewDashboard
      ? [{ key: "dashboard", label: copy.dashboard, icon: "bar-chart" as const }]
      : []),
  ];
  const taskModule = moduleTabs.find((item) => item.key === (canPrepare ? "kitchen" : "delivery"));
  const stockModule = moduleTabs.find((item) => item.key === "stock");
  const fixedKeys = new Set([taskModule?.key, stockModule?.key].filter(Boolean));
  const primaryModules = [taskModule, stockModule].filter((item): item is OperationsModuleItem =>
    Boolean(item),
  );
  const overflowModules = moduleTabs.filter((item) => !fixedKeys.has(item.key));

  return (
    <Screen theme={theme}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {!(["kitchen", "delivery", "stock", "more"] as Tab[]).includes(tab) ? (
          <OpsHeader
            theme={theme}
            copy={copy}
            employeeName={displayEmployeeName(employee, copy)}
            roleLabel={roleLabel}
            unreadNotifications={notifications.unreadCount}
            onOpenNotifications={() => setNotificationsOpen(true)}
          />
        ) : null}

        {["GLOBAL", "COMPANY"].includes(dataScope ?? "") &&
        !["profile", "workplace", "more", "delivery", "kitchen", "stock"].includes(tab) ? (
          <>
            <View pointerEvents="box-none" style={styles.scopeTriggerLayer}>
              <Pressable onPress={() => setScopeFilterOpen(true)} style={styles.scopeTrigger}>
                <Ionicons name="filter-outline" size={25} color={theme.text} />
              </Pressable>
            </View>
            <ScopeFilterModal
              visible={scopeFilterOpen}
              picker={scopeFilterPicker}
              theme={theme}
              lang={lang}
              scope={{
                companies: companiesQuery.data ?? [],
                branches: branchesQuery.data ?? [],
                companyId: effectiveCompanyId,
                branchId: effectiveBranchId,
                canChangeCompany: dataScope === "GLOBAL",
                onCompanyChange: (id) => {
                  setSelectedCompanyId(id);
                  setSelectedBranchId(null);
                },
                onBranchChange: setSelectedBranchId,
              }}
              onPickerChange={setScopeFilterPicker}
              onClose={() => {
                setScopeFilterPicker(null);
                setScopeFilterOpen(false);
              }}
            />
          </>
        ) : null}

        {tab === "workplace" ? (
          <WorkplaceTab
            theme={theme}
            lang={lang}
            employeeName={displayEmployeeName(employee, copy)}
            activeOrders={kitchenOrders}
            readyOrders={deliveryOrders}
            lowStockCount={lowStock.length}
            onOpenKitchen={canPrepare ? () => setTab("kitchen") : undefined}
            onOpenDelivery={canDeliver ? () => setTab("delivery") : undefined}
            onOpenStock={canViewStock ? () => setTab("stock") : undefined}
            onOpenIncidents={
              canPrepare || canDeliver || canManageQueue ? () => setTab("incidents") : undefined
            }
            incidentsCount={deliveryTasks.filter((task) => task.status === "ISSUE_REPORTED").length}
            onOpenMessages={() => setNotificationsOpen(true)}
            unreadMessages={notifications.unreadCount}
            scope={
              ["GLOBAL", "COMPANY"].includes(dataScope ?? "")
                ? {
                    companies: companiesQuery.data ?? [],
                    branches: branchesQuery.data ?? [],
                    companyId: effectiveCompanyId,
                    branchId: effectiveBranchId,
                    canChangeCompany: dataScope === "GLOBAL",
                    onCompanyChange: (id) => {
                      setSelectedCompanyId(id);
                      setSelectedBranchId(null);
                    },
                    onBranchChange: setSelectedBranchId,
                  }
                : undefined
            }
          />
        ) : null}

        {tab === "dashboard" ? (
          <DashboardTab
            theme={theme}
            lang={lang}
            copy={copy}
            loading={dashboardQuery.isLoading || ordersQuery.isLoading}
            stats={dashboardQuery.data}
            ordersCount={orders.length}
            queueOrders={queueOrders}
            lowStockCount={lowStock.length}
            productsById={productsById}
          />
        ) : null}

        {tab === "kitchen" ? (
          <QueueTab
            theme={theme}
            lang={lang}
            copy={copy}
            loading={kitchenQuery.isLoading}
            orders={kitchenOrders}
            filter={queueFilter}
            busy={queueBusy}
            canPrepare={canPrepare}
            canDeliver={false}
            allowedFilters={["ALL", "APPROVED", "IN_PROGRESS"]}
            productsById={productsById}
            onFilterChange={setQueueFilter}
            onStart={(orderId) => startMutation.mutate(orderId)}
            onReady={(orderId) => readyMutation.mutate(orderId)}
            onDeliver={(orderId) => deliveredMutation.mutate(orderId)}
            onOpenOrder={setSelectedOrder}
            scope={
              ["GLOBAL", "COMPANY"].includes(dataScope ?? "")
                ? {
                    companies: companiesQuery.data ?? [],
                    branches: branchesQuery.data ?? [],
                    companyId: effectiveCompanyId,
                    branchId: effectiveBranchId,
                    canChangeCompany: dataScope === "GLOBAL",
                    onCompanyChange: (id) => {
                      setSelectedCompanyId(id);
                      setSelectedBranchId(null);
                    },
                    onBranchChange: setSelectedBranchId,
                  }
                : undefined
            }
          />
        ) : null}

        {tab === "delivery" ? (
          <DeliveryTab
            theme={theme}
            lang={lang}
            tasks={deliveryTasks}
            loading={deliveryQuery.isLoading}
            canManage={canManageQueue}
            productsById={productsById}
            scope={
              ["GLOBAL", "COMPANY"].includes(dataScope ?? "")
                ? {
                    companies: companiesQuery.data ?? [],
                    branches: branchesQuery.data ?? [],
                    companyId: effectiveCompanyId,
                    branchId: effectiveBranchId,
                    canChangeCompany: dataScope === "GLOBAL",
                    onCompanyChange: (id) => {
                      setSelectedCompanyId(id);
                      setSelectedBranchId(null);
                    },
                    onBranchChange: setSelectedBranchId,
                  }
                : undefined
            }
          />
        ) : null}

        {tab === "stock" ? (
          <StockTab
            theme={theme}
            lang={lang}
            copy={copy}
            loading={inventoryQuery.isLoading}
            items={inventoryItems}
            zone={stockZone}
            hasBranchContext={Boolean(effectiveCompanyId && effectiveBranchId)}
            productNameFor={itemName}
            productsById={productsById}
            onZoneChange={setStockZone}
            scope={
              ["GLOBAL", "COMPANY"].includes(dataScope ?? "")
                ? {
                    companies: companiesQuery.data ?? [],
                    branches: branchesQuery.data ?? [],
                    companyId: effectiveCompanyId,
                    branchId: effectiveBranchId,
                    canChangeCompany: dataScope === "GLOBAL",
                    onCompanyChange: (id) => {
                      setSelectedCompanyId(id);
                      setSelectedBranchId(null);
                    },
                    onBranchChange: setSelectedBranchId,
                  }
                : undefined
            }
            onAdjust={(item) => {
              setAdjustingItem(item);
              setAdjustReason(undefined);
            }}
            onReportShortage={(item) => {
              setAdjustingItem(item);
              setAdjustReason(copy.reportShortage);
            }}
            canRequestReplenishment={canRequestReplenishment}
            onRequestReplenishment={(item) => replenishmentMutation.mutate(item)}
          />
        ) : null}

        {tab === "transfers" ? (
          <ResourcesTab kind="transfers" theme={theme} lang={lang} canWrite={canTransferStock} />
        ) : null}
        {tab === "replenishments" ? (
          <ResourcesTab
            kind="replenishments"
            theme={theme}
            lang={lang}
            canWrite={canTransferStock}
          />
        ) : null}
        {tab === "vip" ? (
          <ResourcesTab kind="vip" theme={theme} lang={lang} canWrite={canManageVip} />
        ) : null}
        {tab === "procurement" ? (
          <ProcurementTab theme={theme} lang={lang} permissions={permissions} />
        ) : null}
        {tab === "cleaning" ? (
          <CleaningTab
            theme={theme}
            lang={lang}
            canComplete={canCompleteCleaning}
            canManage={permissions.some((permission) =>
              ["cleaning.task.assign", "cleaning.task.manage"].includes(permission),
            )}
            canViewProducts={permissions.some((permission) =>
              ["cleaning.product.view", "cleaning.product.manage"].includes(permission),
            )}
            canRequestStock={permissions.some((permission) =>
              ["cleaning.product.request", "cleaning.product.manage"].includes(permission),
            )}
          />
        ) : null}
        {tab === "meetings" ? (
          <MeetingsTab
            theme={theme}
            lang={lang}
            canManage={permissions.includes("meeting.preparation.manage")}
          />
        ) : null}
        {tab === "incidents" ? (
          <IncidentsTab theme={theme} lang={lang} tasks={deliveryTasks} />
        ) : null}
        {tab === "more" ? (
          <MoreTab
            theme={theme}
            lang={lang}
            modules={overflowModules}
            unreadNotifications={notifications.unreadCount}
            onOpenNotifications={() => setNotificationsOpen(true)}
            onSelect={(key) => setTab(key as Tab)}
          />
        ) : null}

        {tab === "profile" ? (
          <ProfileTab
            theme={theme}
            lang={lang}
            copy={copy}
            employeeName={displayEmployeeName(employee, copy)}
            employee={employee}
            roles={roles}
            canSeeMeetingPrep={canSeeMeetingPrep}
            onToggleTheme={onToggleTheme}
            onToggleLang={onToggleLang}
            onOpenNotifications={() => setNotificationsOpen(true)}
            onOpenHistory={() => setHistoryOpen(true)}
            onOpenMeetingPrep={() => setTab("meetings")}
            onLogout={onLogout}
          />
        ) : null}
      </ScrollView>

      {adjustingItem ? (
        <AdjustStockPanel
          key={adjustingItem.id}
          theme={theme}
          copy={copy}
          productName={itemName(adjustingItem)}
          initialQuantity={adjustingItem.quantity}
          initialReason={adjustReason}
          pending={stockMutation.isPending}
          onClose={() => {
            setAdjustingItem(null);
            setAdjustReason(undefined);
          }}
          onSubmit={(quantity, reason) =>
            stockMutation.mutate({ itemId: adjustingItem.id, quantity, reason })
          }
        />
      ) : null}

      <BottomTabs
        active={overflowModules.some((item) => item.key === tab) ? "more" : tab}
        onChange={(key) => setTab(key as Tab)}
        theme={theme}
        tabs={[
          { key: "workplace", label: arOrEn(lang, "عملي", "My work"), icon: "briefcase" },
          ...primaryModules,
          ...(overflowModules.length
            ? [{ key: "more", label: arOrEn(lang, "المزيد", "More"), icon: "grid" as const }]
            : []),
          { key: "profile", label: copy.profile, icon: "person-circle" },
        ]}
      />

      <OrderDetailModal
        order={selectedOrder}
        theme={theme}
        lang={lang}
        copy={copy}
        productsById={productsById}
        canPrepare={canPrepare}
        canDeliver={canDeliver}
        busy={queueBusy}
        onStart={(orderId) => startMutation.mutate(orderId)}
        onReady={(orderId) => readyMutation.mutate(orderId)}
        onDeliver={(orderId) => deliveredMutation.mutate(orderId)}
        onReportIncident={(orderId, reason, description) =>
          incidentMutation.mutate({ orderId, reason, description })
        }
        onClose={() => setSelectedOrder(null)}
      />

      <NotificationsModal
        visible={notificationsOpen}
        theme={theme}
        copy={copy}
        notifications={notifications}
        onClose={() => setNotificationsOpen(false)}
      />

      <HistoryModal
        visible={historyOpen}
        theme={theme}
        lang={lang}
        copy={copy}
        orders={orders}
        onClose={() => setHistoryOpen(false)}
      />
    </Screen>
  );
};

const styles = createSnowStyles({
  scroll: { paddingBottom: 112, gap: spacing.md },
  scopeTriggerLayer: { position: "relative", height: 0, zIndex: 20 },
  scopeTrigger: {
    position: "absolute",
    left: 0,
    top: 18,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
