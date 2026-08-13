import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useRef, useState } from "react";
import { Alert, Platform, ScrollView } from "react-native";

import {
  BottomTabs,
  Screen,
  createOrder,
  cancelMyOrder,
  createSnowStyles,
  fetchEmployeeCatalog,
  fetchMyOrders,
  fetchMyQuotas,
  generateClientRequestId,
  orderStatusLabel,
  spacing,
  t,
  useAuthStore,
  useNotificationTapHandler,
  useOrderEvents,
  type CreateOrderInput,
  type Lang,
  type Order,
  type SnowTheme,
  type ThemeMode,
} from "@tarhib/mobile-shared";

import { useCart } from "../hooks/useCart";
import { useNotifications } from "../hooks/useNotifications";
import { arOrEn, orderCode, orderErrorMessage, orderGroup } from "../lib/format";
import { NotificationsModal } from "../modals/NotificationsModal";
import { RoomsModal } from "../modals/RoomsModal";
import { SettingsModal } from "../modals/SettingsModal";
import { TrackingModal } from "../modals/TrackingModal";
import { CartTab } from "./tabs/CartTab";
import { HomeTab } from "./tabs/HomeTab";
import { OrdersTab, type OrderFilter } from "./tabs/OrdersTab";
import { ProfileTab } from "./tabs/ProfileTab";

type Tab = "home" | "orders" | "cart" | "profile";
/** Onglet virtuel : n'ouvre pas de contenu de tab, déclenche RoomsModal. */
type NavKey = Tab | "rooms";

export const EmployeeApp = ({
  lang,
  theme,
  onLogout,
  onSetTheme,
  onSetLang,
}: {
  lang: Lang;
  theme: SnowTheme;
  onLogout: () => void;
  onSetTheme: (mode: ThemeMode) => void;
  onSetLang: (lang: Lang) => void;
}) => {
  const copy = t(lang);
  const [tab, setTab] = useState<Tab>("home");
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("history");
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [orderError, setOrderError] = useState<string | null>(null);
  const employee = useAuthStore((s) => s.employee);
  const roles = useAuthStore((s) => s.roles);
  const permissions = useAuthStore((s) => s.permissions);
  const canBookRooms = permissions.includes("meeting.book");

  const notifications = useNotifications();
  const queryClient = useQueryClient();
  // Temps réel : toute création/transition de commande invalide les caches
  // et, si la commande m'appartient, alimente le fil de notifications local
  // (aucun backend notifications n'existe — voir useNotifications.ts).
  useOrderEvents(queryClient, undefined, (event) => {
    if (!event.status) return;
    const myOrders = queryClient.getQueryData<Order[]>(["my-orders"]) ?? [];
    if (!myOrders.some((order) => order.id === event.orderId)) return;
    notifications.add({
      orderId: event.orderId,
      title: orderStatusLabel(event.status, lang),
      body: arOrEn(
        lang,
        `تحديث حالة الطلب ${orderCode(event.orderId)}`,
        `Status update for order ${orderCode(event.orderId)}`,
      ),
      createdAt: new Date().toISOString(),
    });
  });
  // Tap sur une notification push (data.orderId, voir orders.service.ts →
  // sendPush) : ouvre directement le suivi de la commande concernée.
  useNotificationTapHandler(setTrackedOrderId);

  const catalogQuery = useQuery({
    queryKey: ["employee-catalog"],
    queryFn: fetchEmployeeCatalog,
    refetchOnMount: true,
    staleTime: 30_000,
  });
  const ordersQuery = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => fetchMyOrders(),
    // Filet de sécurité si la socket /sla est coupée.
    refetchInterval: 20_000,
  });
  // Anneaux de quota de l'écran profil (used/max par produit).
  const quotasQuery = useQuery({
    queryKey: ["my-quotas"],
    queryFn: fetchMyQuotas,
    staleTime: 30_000,
  });

  const catalogProducts = catalogQuery.data ?? [];
  const cart = useCart(catalogProducts);
  const productsById = useMemo(
    () => new Map(catalogProducts.map((product) => [product.id, product])),
    [catalogProducts],
  );
  const myOrders = ordersQuery.data ?? [];
  const filteredOrders = useMemo(
    () =>
      myOrders.filter((order) => {
        const group = orderGroup(order.status);
        return orderFilter === "active" ? group === "active" : group !== "active";
      }),
    [myOrders, orderFilter],
  );
  const trackedOrder = trackedOrderId
    ? (myOrders.find((order) => order.id === trackedOrderId) ?? null)
    : null;
  // PR-0.4b : un retry manuel (après timeout axios/erreur réseau) du MÊME
  // panier doit réutiliser le même clientRequestId pour que le serveur
  // l'absorbe au lieu de créer une commande en double — la signature
  // détecte quand le panier a réellement changé pour en générer un nouveau.
  const pendingRequestRef = useRef<{ id: string; signature: string } | null>(null);
  const orderMutation = useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: (order) => {
      pendingRequestRef.current = null;
      cart.clear();
      setNote("");
      setOrderError(null);
      // Le stock et les quotas viennent de changer côté serveur.
      void queryClient.invalidateQueries({ queryKey: ["employee-catalog"] });
      void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["my-quotas"] });
      queryClient.setQueryData<Order[]>(["my-orders"], (old) => [order, ...(old ?? [])]);
      setTab("orders");
      // Après la confirmation, redirection automatique vers le suivi temps réel.
      setTrackedOrderId(order.id);
    },
    onError: (err) => setOrderError(orderErrorMessage(err, lang, productsById)),
  });
  const cancelMutation = useMutation({
    mutationFn: cancelMyOrder,
    onSuccess: (cancelled) => {
      queryClient.setQueryData<Order[]>(["my-orders"], (current) =>
        (current ?? []).map((order) => (order.id === cancelled.id ? cancelled : order)),
      );
      void queryClient.invalidateQueries({ queryKey: ["employee-catalog"] });
      void queryClient.invalidateQueries({ queryKey: ["my-quotas"] });
    },
  });
  const requestCancellation = (order: Order) => {
    const execute = () => cancelMutation.mutate(order.id);
    if (Platform.OS === "web") {
      if (globalThis.confirm?.(arOrEn(lang, "هل تريد إلغاء الطلب؟", "Cancel this order?")))
        execute();
      return;
    }
    Alert.alert(
      arOrEn(lang, "إلغاء الطلب", "Cancel order"),
      arOrEn(
        lang,
        "يمكن إلغاء الطلب قبل بدء التحضير فقط.",
        "The order can only be cancelled before preparation starts.",
      ),
      [
        { text: arOrEn(lang, "رجوع", "Keep order"), style: "cancel" },
        {
          text: arOrEn(lang, "إلغاء الطلب", "Cancel order"),
          style: "destructive",
          onPress: execute,
        },
      ],
    );
  };
  const confirmOrder = () => {
    if (orderMutation.isPending || cart.lines.length === 0) return;
    setOrderError(null);
    const lines = cart.lines.map((product) => ({
      productId: product.id,
      quantity: cart.quantities[product.id] ?? 0,
    }));
    const trimmedNote = note.trim() || undefined;
    const signature = JSON.stringify([
      [...lines].sort((a, b) => a.productId.localeCompare(b.productId)),
      trimmedNote ?? null,
    ]);
    if (pendingRequestRef.current?.signature !== signature) {
      pendingRequestRef.current = { id: generateClientRequestId(), signature };
    }
    orderMutation.mutate({
      lines,
      note: trimmedNote,
      clientRequestId: pendingRequestRef.current.id,
    });
  };

  const goHome = () => {
    setRoomsOpen(false);
    setTab("home");
  };
  const reorder = (order: Order) => {
    const merged = { ...cart.quantities };
    for (const line of order.lines) {
      merged[line.productId] = (merged[line.productId] ?? 0) + line.quantity;
    }
    cart.setLines(merged);
    if (order.note) setNote(order.note);
    setTab("cart");
  };

  return (
    <>
      <Screen theme={theme}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {tab === "home" ? (
            <HomeTab
              theme={theme}
              lang={lang}
              employee={employee}
              catalogQuery={catalogQuery}
              quantities={cart.quantities}
              totalItems={cart.totalItems}
              onAdd={cart.add}
              onRemove={cart.remove}
              onGoToCart={() => setTab("cart")}
            />
          ) : tab === "cart" ? (
            <CartTab
              theme={theme}
              lang={lang}
              cart={cart}
              note={note}
              orderError={orderError}
              isSubmitting={orderMutation.isPending}
              onNoteChange={setNote}
              onConfirm={confirmOrder}
              onOpenCatalog={goHome}
            />
          ) : tab === "orders" ? (
            <OrdersTab
              theme={theme}
              lang={lang}
              ordersQuery={ordersQuery}
              orders={filteredOrders}
              productsById={productsById}
              filter={orderFilter}
              onFilterChange={setOrderFilter}
              onTrackOrder={setTrackedOrderId}
              onReorder={reorder}
              onOpenCatalog={goHome}
            />
          ) : (
            <ProfileTab
              theme={theme}
              lang={lang}
              employee={employee}
              roles={roles}
              quotas={quotasQuery.data ?? []}
              productsById={productsById}
              unreadNotifications={notifications.unreadCount}
              onOpenNotifications={() => setNotificationsOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onLogout={onLogout}
            />
          )}
        </ScrollView>
        <BottomTabs
          active={roomsOpen ? "rooms" : tab}
          onChange={(key) => {
            if (key === "rooms") {
              setRoomsOpen(true);
              return;
            }
            setRoomsOpen(false);
            setTab(key as Tab);
          }}
          theme={theme}
          tabs={[
            { key: "home", label: arOrEn(lang, "الرئيسية", "Home"), icon: "home" },
            { key: "orders", label: copy.orders, icon: "bag-handle" },
            ...(canBookRooms
              ? [
                  {
                    key: "rooms" as NavKey,
                    label: arOrEn(lang, "الحجز", "Reserve"),
                    icon: "calendar" as const,
                  },
                ]
              : []),
            { key: "profile", label: arOrEn(lang, "الحساب", "Account"), icon: "person" },
          ]}
        />
      </Screen>
      <TrackingModal
        order={trackedOrder}
        productsById={productsById}
        lang={lang}
        theme={theme}
        canBookRooms={canBookRooms}
        cancellationPending={cancelMutation.isPending}
        onCancelOrder={requestCancellation}
        onNavigate={(target) => {
          setTrackedOrderId(null);
          if (target === "rooms") {
            setRoomsOpen(true);
            return;
          }
          setTab(target);
        }}
        onClose={() => {
          setTrackedOrderId(null);
        }}
      />
      <RoomsModal
        visible={roomsOpen}
        lang={lang}
        theme={theme}
        onClose={() => setRoomsOpen(false)}
      />
      <SettingsModal
        visible={settingsOpen}
        lang={lang}
        theme={theme}
        onClose={() => setSettingsOpen(false)}
        onSetLang={onSetLang}
        onSetTheme={onSetTheme}
      />
      <NotificationsModal
        visible={notificationsOpen}
        theme={theme}
        lang={lang}
        notifications={notifications}
        onClose={() => setNotificationsOpen(false)}
        onOpenOrder={(orderId) => {
          setNotificationsOpen(false);
          setTrackedOrderId(orderId);
        }}
      />
    </>
  );
};

const styles = createSnowStyles({
  scroll: {
    flexGrow: 1,
    paddingBottom: 112,
    gap: spacing.md,
  },
});
