import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import {
  PrimaryButton,
  createSnowStyles,
  spacing,
  type Copy,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { ui } from "./ui";

// Valeur d'audit envoyée au backend quand l'agent ne saisit pas de motif.
const DEFAULT_REASON = "Mobile Operations adjustment";

export const AdjustStockPanel = ({
  theme,
  copy,
  productName,
  initialQuantity,
  initialReason,
  pending,
  onClose,
  onSubmit,
}: {
  theme: SnowTheme;
  copy: Copy;
  productName: string;
  initialQuantity: number;
  initialReason?: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (quantity: number, reason: string) => void;
}) => {
  const [quantity, setQuantity] = useState(String(initialQuantity));
  const [reason, setReason] = useState(initialReason ?? "");

  const submit = () => {
    const parsed = Number.parseInt(quantity, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    onSubmit(parsed, reason.trim() || DEFAULT_REASON);
  };

  return (
    <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.panelHeader}>
        <Pressable onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={20} color={theme.text} />
        </Pressable>
        <Text style={[ui.sectionTitle, { color: theme.text }]}>{copy.adjustStock}</Text>
      </View>
      <Text style={[ui.small, { color: theme.muted }]}>{productName}</Text>
      <TextInput
        keyboardType="number-pad"
        value={quantity}
        onChangeText={setQuantity}
        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
        placeholder={copy.quantity}
        placeholderTextColor={theme.muted}
      />
      <TextInput
        value={reason}
        onChangeText={setReason}
        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
        placeholder={copy.reason}
        placeholderTextColor={theme.muted}
      />
      <PrimaryButton
        label={pending ? copy.saving : copy.saveAdjustment}
        icon="save"
        theme={theme}
        disabled={pending}
        onPress={submit}
      />
    </View>
  );
};

const styles = createSnowStyles({
  panel: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: 92,
    borderWidth: 1,
    borderRadius: 13,
    padding: spacing.md,
    gap: spacing.sm,
  },
  panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
});
