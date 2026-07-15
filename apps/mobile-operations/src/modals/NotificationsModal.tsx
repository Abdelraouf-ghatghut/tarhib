import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Card,
  IconBubble,
  createSnowStyles,
  directionalIcon,
  spacing,
  type Copy,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { ui } from "../components/ui";
import type { OpsNotifications } from "../hooks/useOperationsNotifications";

export const NotificationsModal = ({
  visible,
  theme,
  copy,
  notifications,
  onClose,
}: {
  visible: boolean;
  theme: SnowTheme;
  copy: Copy;
  notifications: OpsNotifications;
  onClose: () => void;
}) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.root, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          style={[styles.roundButton, { backgroundColor: theme.surface }]}
        >
          <Ionicons name={directionalIcon("arrow-back")} size={20} color={theme.text} />
        </Pressable>
        <Text style={[ui.screenTitle, { color: theme.text }]}>{copy.notifications}</Text>
        <View style={styles.roundButtonPlaceholder} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {notifications.items.length === 0 ? (
          <View style={styles.empty}>
            <IconBubble icon="notifications-off-outline" theme={theme} />
            <Text style={[ui.small, { color: theme.muted }]}>{copy.noNotifications}</Text>
          </View>
        ) : (
          <>
            {notifications.unreadCount > 0 ? (
              <Pressable onPress={notifications.markAllRead} style={styles.markAllRead}>
                <Text style={[ui.small, { color: theme.primaryStrong }]}>{copy.markAllRead}</Text>
              </Pressable>
            ) : null}
            {notifications.items.map((notification) => (
              <Pressable
                key={notification.id}
                onPress={() => notifications.markRead(notification.id)}
              >
                <Card theme={theme} style={styles.row}>
                  <IconBubble icon="alert-circle-outline" theme={theme} />
                  <View style={ui.rowInfo}>
                    <Text style={[ui.orderId, { color: theme.text }]}>{notification.title}</Text>
                    <Text numberOfLines={2} style={[ui.small, { color: theme.muted }]}>
                      {notification.body}
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
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roundButtonPlaceholder: { width: 38, height: 38 },
  content: { padding: spacing.lg, gap: spacing.sm },
  empty: { minHeight: 220, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  markAllRead: { alignSelf: "flex-start", paddingVertical: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  unreadDot: { width: 9, height: 9, borderRadius: 5 },
});
