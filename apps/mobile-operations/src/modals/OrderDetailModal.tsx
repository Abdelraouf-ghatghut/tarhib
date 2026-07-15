import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Card,
  PrimaryButton,
  createSnowStyles,
  directionalIcon,
  spacing,
  type CatalogProduct,
  type Copy,
  type Lang,
  type Order,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { PriorityBadge, StatusBadge, ui } from "../components/ui";
import { useNowTick } from "../hooks/useNowTick";
import { formatMinutesUntil, orderCode, productName } from "../lib/format";

export const OrderDetailModal = ({
  order,
  theme,
  lang,
  copy,
  productsById,
  canPrepare,
  canDeliver,
  busy,
  onStart,
  onReady,
  onDeliver,
  onReportIncident,
  onClose,
}: {
  order: Order | null;
  theme: SnowTheme;
  lang: Lang;
  copy: Copy;
  productsById: Map<string, CatalogProduct>;
  canPrepare: boolean;
  canDeliver: boolean;
  busy: boolean;
  onStart: (orderId: string) => void;
  onReady: (orderId: string) => void;
  onDeliver: (orderId: string) => void;
  onReportIncident: (orderId: string, reason: string) => void;
  onClose: () => void;
}) => {
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  useNowTick();

  if (!order) return null;

  const canAct =
    order.status === "APPROVED" || order.status === "IN_PROGRESS" || order.status === "READY";

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
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
          <Text style={[ui.screenTitle, { color: theme.text }]}>{copy.orderDetails}</Text>
          <View style={styles.roundButtonPlaceholder} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Card theme={theme} style={styles.topCard}>
            <View style={styles.topRow}>
              <Text style={[ui.orderId, { color: theme.primaryStrong }]}>
                {orderCode(order.id)}
              </Text>
              <StatusBadge status={order.status} theme={theme} lang={lang} />
            </View>
            <View style={styles.topRow}>
              <PriorityBadge priority={order.priority} theme={theme} lang={lang} />
              <Text style={[ui.small, { color: theme.muted }]}>
                SLA {formatMinutesUntil(order.slaDeadline, copy)}
              </Text>
            </View>
          </Card>

          <Card theme={theme} style={styles.linesCard}>
            {order.lines.map((line) => (
              <View key={line.productId} style={styles.lineRow}>
                <Text style={[ui.small, { color: theme.text }]}>
                  {productName(productsById.get(line.productId), lang, line.productId)}
                </Text>
                <Text style={[ui.small, { color: theme.muted }]}>× {line.quantity}</Text>
              </View>
            ))}
          </Card>

          {order.note ? (
            <Card theme={theme} style={styles.linesCard}>
              <Text style={[ui.small, { color: theme.muted }]}>{copy.reason}</Text>
              <Text style={[ui.small, { color: theme.text }]}>{order.note}</Text>
            </Card>
          ) : null}

          {reporting ? (
            <Card theme={theme} style={styles.linesCard}>
              <Text style={[ui.small, { color: theme.text }]}>{copy.reportProblem}</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder={copy.incidentReasonPlaceholder}
                placeholderTextColor={theme.muted}
                multiline
                style={[styles.reasonInput, { borderColor: theme.border, color: theme.text }]}
              />
              <View style={styles.reasonActions}>
                <Pressable
                  onPress={() => {
                    setReporting(false);
                    setReason("");
                  }}
                  style={[styles.outlineButton, { borderColor: theme.border }]}
                >
                  <Text style={[ui.small, { color: theme.text }]}>{copy.cancel}</Text>
                </Pressable>
                <PrimaryButton
                  label={copy.submitReport}
                  theme={theme}
                  variant="danger"
                  disabled={busy || !reason.trim()}
                  onPress={() => {
                    onReportIncident(order.id, reason.trim());
                    setReporting(false);
                    setReason("");
                  }}
                />
              </View>
            </Card>
          ) : null}
        </ScrollView>

        <View
          style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}
        >
          {order.status === "APPROVED" && canPrepare ? (
            <PrimaryButton
              label={copy.startPreparation}
              icon="play"
              theme={theme}
              disabled={busy}
              onPress={() => onStart(order.id)}
            />
          ) : null}
          {order.status === "IN_PROGRESS" && canPrepare ? (
            <PrimaryButton
              label={copy.markReady}
              icon="checkmark"
              theme={theme}
              disabled={busy}
              onPress={() => onReady(order.id)}
            />
          ) : null}
          {order.status === "READY" && canDeliver ? (
            <PrimaryButton
              label={copy.markDelivered}
              icon="bicycle"
              theme={theme}
              disabled={busy}
              onPress={() => onDeliver(order.id)}
            />
          ) : null}
          {canAct && !reporting ? (
            <Pressable
              onPress={() => setReporting(true)}
              style={[styles.outlineButton, { borderColor: theme.danger }]}
            >
              <Ionicons name="warning-outline" size={16} color={theme.danger} />
              <Text style={[ui.small, { color: theme.danger }]}>{copy.reportProblem}</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

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
  content: { padding: spacing.lg, gap: spacing.md },
  topCard: { gap: spacing.sm },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  linesCard: { gap: spacing.sm },
  lineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reasonInput: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  reasonActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
  outlineButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  footer: { padding: spacing.lg, borderTopWidth: 1, gap: spacing.sm },
});
