import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

import {
  Card,
  PillButton,
  createSnowStyles,
  spacing,
  stockZoneLabel,
  type Copy,
  type InventoryItem,
  type Lang,
  type SnowTheme,
  type StockZone,
} from "@tarhib/mobile-shared";

import { CenteredTitle, EmptyText, LoadingCard, ui } from "../../components/ui";
import { arOrEn } from "../../lib/format";

export const isLowStock = (item: InventoryItem): boolean =>
  item.belowThreshold || item.quantity <= item.minThreshold;

export const StockTab = ({
  theme,
  lang,
  copy,
  loading,
  items,
  zone,
  hasBranchContext,
  productNameFor,
  onZoneChange,
  onAdjust,
  onReportShortage,
  canRequestReplenishment,
  onRequestReplenishment,
}: {
  theme: SnowTheme;
  lang: Lang;
  copy: Copy;
  loading: boolean;
  items: InventoryItem[];
  zone: StockZone;
  hasBranchContext: boolean;
  productNameFor: (item: InventoryItem) => string;
  onZoneChange: (zone: StockZone) => void;
  onAdjust: (item: InventoryItem) => void;
  onReportShortage: (item: InventoryItem) => void;
  canRequestReplenishment?: boolean;
  onRequestReplenishment?: (item: InventoryItem) => void;
}) => (
  <>
    <CenteredTitle title={copy.stock} theme={theme} />
    <View style={ui.chips}>
      {(["KITCHEN", "BRANCH", "CENTRAL"] as StockZone[]).map((item) => (
        <PillButton
          key={item}
          label={stockZoneLabel(item, lang)}
          active={zone === item}
          theme={theme}
          onPress={() => onZoneChange(item)}
        />
      ))}
    </View>
    {loading ? <LoadingCard theme={theme} /> : null}
    {items.map((item) => (
      <StockCard
        key={item.id}
        theme={theme}
        lang={lang}
        copy={copy}
        item={item}
        productName={productNameFor(item)}
        onAdjust={() => onAdjust(item)}
        onReportShortage={() => onReportShortage(item)}
        canRequestReplenishment={canRequestReplenishment && item.zone === "KITCHEN"}
        onRequestReplenishment={() => onRequestReplenishment?.(item)}
      />
    ))}
    {items.length === 0 && !loading ? (
      <EmptyText
        theme={theme}
        text={hasBranchContext ? copy.noStockItems : copy.branchUnavailable}
      />
    ) : null}
  </>
);

const StockCard = ({
  theme,
  lang,
  copy,
  item,
  productName,
  onAdjust,
  onReportShortage,
  canRequestReplenishment,
  onRequestReplenishment,
}: {
  theme: SnowTheme;
  lang: Lang;
  copy: Copy;
  item: InventoryItem;
  productName: string;
  onAdjust: () => void;
  onReportShortage: () => void;
  canRequestReplenishment?: boolean;
  onRequestReplenishment?: () => void;
}) => {
  const alert = isLowStock(item);
  return (
    <Card theme={theme} style={styles.stockCard}>
      <Pressable onPress={onAdjust} style={styles.stockCardTop}>
        <View
          style={[
            styles.stockIcon,
            { backgroundColor: alert ? `${theme.danger}14` : theme.primarySoft },
          ]}
        >
          <Ionicons
            name={alert ? "warning-outline" : "cube-outline"}
            size={22}
            color={alert ? theme.danger : theme.primaryStrong}
          />
        </View>
        <View style={ui.rowInfo}>
          <Text style={[ui.orderId, { color: theme.text }]}>{productName}</Text>
          <Text style={[ui.small, { color: theme.muted }]}>
            {copy.minimumLabel} {item.minThreshold} - {stockZoneLabel(item.zone, lang)}
          </Text>
        </View>
        <Text style={[styles.stockQty, { color: alert ? theme.danger : theme.primaryStrong }]}>
          {item.quantity}
        </Text>
      </Pressable>
      {alert ? (
        <Pressable
          onPress={onReportShortage}
          style={[styles.shortageButton, { borderColor: theme.danger }]}
        >
          <Ionicons name="alert-circle-outline" size={15} color={theme.danger} />
          <Text style={[ui.small, { color: theme.danger }]}>{copy.reportShortage}</Text>
        </Pressable>
      ) : null}
      {canRequestReplenishment ? (
        <Pressable
          onPress={onRequestReplenishment}
          style={[styles.shortageButton, { borderColor: theme.primaryStrong }]}
        >
          <Ionicons name="arrow-up-circle-outline" size={15} color={theme.primaryStrong} />
          <Text style={[ui.small, { color: theme.primaryStrong }]}>
            {arOrEn(lang, "طلب إعادة تزويد", "Request replenishment")}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
};

const styles = createSnowStyles({
  stockCard: { gap: spacing.sm },
  stockCardTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stockIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stockQty: { fontSize: 26, fontWeight: "700" },
  shortageButton: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
});
