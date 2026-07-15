import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Card,
  IconBubble,
  createSnowStyles,
  spacing,
  type Lang,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { ModalHeader, ui } from "../components/ui";
import type { Notifications } from "../hooks/useNotifications";
import { arOrEn, formatDateTime } from "../lib/format";

/**
 * Fil de notifications réel, dérivé des événements temps réel de mes
 * commandes (voir hooks/useNotifications.ts) — rendu comme modale de haut
 * niveau (comme RoomsModal/TrackingModal) pour être ouvrable depuis
 * n'importe quel onglet (icône cloche de l'accueil, ligne الإشعارات du profil).
 */
export const NotificationsModal = ({
  visible,
  theme,
  lang,
  notifications,
  onClose,
  onOpenOrder,
}: {
  visible: boolean;
  theme: SnowTheme;
  lang: Lang;
  notifications: Notifications;
  onClose: () => void;
  onOpenOrder: (orderId: string) => void;
}) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.root, { backgroundColor: theme.background }]}
    >
      <ModalHeader
        theme={theme}
        lang={lang}
        title={arOrEn(lang, "الإشعارات", "Notifications")}
        onBack={onClose}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {notifications.items.length === 0 ? (
          <View style={styles.empty}>
            <IconBubble icon="notifications-off-outline" theme={theme} />
            <Text style={[ui.productName, { color: theme.text }]}>
              {arOrEn(lang, "لا توجد إشعارات بعد", "No notifications yet")}
            </Text>
            <Text style={[ui.small, ui.centerText, { color: theme.muted }]}>
              {arOrEn(
                lang,
                "ستظهر هنا تحديثات حالة طلباتك فور حدوثها",
                "Updates on your order statuses will show up here as they happen",
              )}
            </Text>
          </View>
        ) : (
          <>
            {notifications.unreadCount > 0 ? (
              <Pressable onPress={notifications.markAllRead} style={styles.markAllRead}>
                <Text style={[ui.small, { color: theme.primaryStrong }]}>
                  {arOrEn(lang, "تحديد الكل كمقروء", "Mark all as read")}
                </Text>
              </Pressable>
            ) : null}
            {notifications.items.map((notification) => (
              <Pressable
                key={notification.id}
                onPress={() => {
                  notifications.markRead(notification.id);
                  onOpenOrder(notification.orderId);
                }}
              >
                <Card theme={theme} style={styles.row}>
                  <IconBubble icon="receipt-outline" theme={theme} />
                  <View style={ui.rowInfo}>
                    <Text style={[ui.productName, { color: theme.text }]}>
                      {notification.title}
                    </Text>
                    <Text numberOfLines={1} style={[ui.small, { color: theme.muted }]}>
                      {notification.body}
                    </Text>
                    <Text style={[ui.small, { color: theme.muted }]}>
                      {formatDateTime(notification.createdAt, lang)}
                    </Text>
                  </View>
                  {!notification.read ? (
                    <View style={[styles.unreadDot, { backgroundColor: theme.danger }]} />
                  ) : null}
                </Card>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  </Modal>
);

const styles = createSnowStyles({
  root: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  empty: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  markAllRead: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});
