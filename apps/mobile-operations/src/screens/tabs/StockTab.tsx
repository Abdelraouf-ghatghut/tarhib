import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, Modal, Pressable, Text, TextInput, View } from "react-native";
import {
  createSnowStyles,
  PrimaryButton,
  spacing,
  stockZoneLabel,
  type CatalogProduct,
  type Copy,
  type InventoryItem,
  type Lang,
  type SnowTheme,
  type StockZone,
} from "@tarhib/mobile-shared";
import { LoadingCard } from "../../components/ui";
import { arOrEn } from "../../lib/format";
import { operationsProductImage } from "../../lib/productImages";
import { RecordDetailModal } from "../../modals/RecordDetailModal";
import { ScopeFilterModal, type DeliveryScope } from "./DeliveryTab";

export const isLowStock = (item: InventoryItem): boolean =>
  item.belowThreshold || item.quantity <= item.minThreshold;

type InventoryFilter = "ALL" | "BELOW" | "OUT" | "CRITICAL";
type InventoryView = "STOCK" | "ALERTS";

export const StockTab = ({
  theme,
  lang,
  copy,
  loading,
  items,
  zone,
  hasBranchContext,
  productNameFor,
  productsById,
  onZoneChange,
  onAdjust,
  scope,
}: {
  theme: SnowTheme;
  lang: Lang;
  copy: Copy;
  loading: boolean;
  items: InventoryItem[];
  zone: StockZone;
  hasBranchContext: boolean;
  productNameFor: (item: InventoryItem) => string;
  productsById?: Map<string, CatalogProduct>;
  onZoneChange: (zone: StockZone) => void;
  onAdjust: (item: InventoryItem) => void;
  scope?: DeliveryScope;
  onReportShortage: (item: InventoryItem) => void;
  canRequestReplenishment?: boolean;
  onRequestReplenishment?: (item: InventoryItem) => void;
}) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InventoryFilter>("ALL");
  const [view, setView] = useState<InventoryView>("STOCK");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [zonesOpen, setZonesOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopePicker, setScopePicker] = useState<"company" | "branch" | null>(null);
  const critical = items.filter((item) => item.quantity <= 0).length;
  const low = items.filter((item) => item.quantity > 0 && isLowStock(item)).length;
  const healthy = items.length - critical - low;
  const normalized = search.trim().toLocaleLowerCase();
  const matchesFilter = (item: InventoryItem) =>
    filter === "ALL"
      ? true
      : filter === "BELOW"
        ? item.quantity > 0 && item.quantity < item.minThreshold
        : filter === "OUT"
          ? item.quantity === 0
          : item.quantity <= item.minThreshold / 2;
  const visible = items
    .filter((item) => (view === "ALERTS" ? isLowStock(item) : true))
    .filter(matchesFilter)
    .filter((item) => productNameFor(item).toLocaleLowerCase().includes(normalized))
    .sort((a, b) => a.quantity - b.quantity);
  const grouped = Object.values(
    visible.reduce<Record<string, { productId: string; items: InventoryItem[] }>>((acc, item) => {
      (acc[item.productId] ??= { productId: item.productId, items: [] }).items.push(item);
      return acc;
    }, {}),
  );

  return (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, lang === "ar" && styles.titleRtl, { color: theme.text }]}>
          {copy.stock}
        </Text>
        {scope ? (
          <Pressable onPress={() => setScopeOpen(true)} style={styles.scopeButton}>
            <Ionicons name="filter-outline" size={26} color={theme.text} />
          </Pressable>
        ) : null}
      </View>
      <View
        style={[
          styles.search,
          lang === "ar" && styles.searchRtl,
          { backgroundColor: theme.surfaceAlt },
        ]}
      >
        <Ionicons name="search-outline" size={17} color={theme.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={arOrEn(lang, "البحث في العناصر", "Search items")}
          placeholderTextColor={theme.muted}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <View style={styles.summary}>
        <Summary
          theme={theme}
          value={critical}
          label={arOrEn(lang, "حرج", "Critical")}
          color="#E11D2E"
        />
        <Summary
          theme={theme}
          value={low}
          label={arOrEn(lang, "مخزون منخفض", "Low stock")}
          color="#ED7A09"
        />
        <Summary
          theme={theme}
          value={healthy}
          label={arOrEn(lang, "متوفر", "In stock")}
          color="#138447"
        />
      </View>

      <View style={[styles.viewTabs, { borderColor: theme.border }]}>
        <Pressable
          onPress={() => setView("STOCK")}
          style={[styles.viewTab, view === "STOCK" && { backgroundColor: theme.primaryStrong }]}
        >
          <Text style={[styles.viewTabText, { color: view === "STOCK" ? "#FFFFFF" : theme.text }]}>
            {arOrEn(lang, "المخزون", "Inventory")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setView("ALERTS")}
          style={[styles.viewTab, view === "ALERTS" && { backgroundColor: theme.primaryStrong }]}
        >
          <Text style={[styles.viewTabText, { color: view === "ALERTS" ? "#FFFFFF" : theme.text }]}>
            {arOrEn(lang, "التنبيهات", "Alerts")}
          </Text>
        </Pressable>
      </View>
      <View style={styles.quickFilters}>
        {(["ALL", "BELOW", "OUT", "CRITICAL"] as InventoryFilter[]).map((item) => {
          const label =
            item === "ALL"
              ? arOrEn(lang, "الكل", "All")
              : item === "BELOW"
                ? arOrEn(lang, "تحت الحد", "Below")
                : item === "OUT"
                  ? arOrEn(lang, "نفد", "Out")
                  : arOrEn(lang, "حرج", "Critical");
          return (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[
                styles.quickFilter,
                {
                  borderColor: filter === item ? theme.primaryStrong : theme.border,
                  backgroundColor: filter === item ? theme.primarySoft : theme.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.quickFilterText,
                  { color: filter === item ? theme.primaryStrong : theme.muted },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.sectionHeader, { borderTopColor: theme.border }]}>
        <Text
          style={[
            styles.sectionTitle,
            lang === "ar" && styles.sectionTitleRtl,
            { color: theme.text },
          ]}
        >
          {view === "ALERTS"
            ? arOrEn(lang, "تنبيهات المخزون", "Stock alerts")
            : arOrEn(lang, "كل المنتجات", "All products")}
        </Text>
      </View>

      {loading ? <LoadingCard theme={theme} /> : null}
      <View style={[styles.list, { borderColor: theme.border }]}>
        {grouped.map((group) => {
          const item = group.items[0]!;
          const product = productsById?.get(group.productId);
          const image = product ? operationsProductImage(product) : null;
          const total = group.items.reduce((sum, entry) => sum + entry.quantity, 0);
          const hasAlert = group.items.some(isLowStock);
          const color = total <= 0 ? theme.danger : hasAlert ? theme.warning : theme.primaryStrong;
          const expanded = expandedProductId === group.productId;
          return (
            <View key={group.productId}>
              <Pressable
                onPress={() => setExpandedProductId(expanded ? null : group.productId)}
                style={[
                  styles.row,
                  lang === "ar" && styles.rowRtl,
                  { borderBottomColor: theme.border },
                ]}
              >
                <View style={[styles.productImage, { backgroundColor: `${color}0B` }]}>
                  {image || product?.imageUrl ? (
                    <Image
                      source={image ?? { uri: product!.imageUrl! }}
                      resizeMode="contain"
                      style={styles.image}
                    />
                  ) : (
                    <Ionicons name="cube-outline" size={22} color={color} />
                  )}
                </View>
                <View style={styles.productCopy}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.productName,
                      lang === "ar" && styles.textRtl,
                      { color: theme.text },
                    ]}
                  >
                    {productNameFor(item)}
                  </Text>
                  <Text
                    style={[
                      styles.locationCount,
                      lang === "ar" && styles.textRtl,
                      { color: theme.muted },
                    ]}
                  >
                    {group.items.length}{" "}
                    {arOrEn(lang, "مواقع", group.items.length === 1 ? "location" : "locations")}
                  </Text>
                </View>
                <Text style={[styles.quantity, { color }]}>{total}</Text>
                <Ionicons
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={19}
                  color={theme.muted}
                />
              </Pressable>
              {expanded ? (
                <View style={[styles.locations, { backgroundColor: theme.surfaceAlt }]}>
                  {group.items.map((entry) => (
                    <Pressable
                      key={entry.id}
                      onPress={() => setSelectedItem(entry)}
                      style={[
                        styles.locationRow,
                        lang === "ar" && styles.rowRtl,
                        { borderBottomColor: theme.border },
                      ]}
                    >
                      <View style={styles.locationCopy}>
                        <Text
                          style={[
                            styles.locationTitle,
                            lang === "ar" && styles.textRtl,
                            { color: theme.text },
                          ]}
                        >
                          {stockZoneLabel(entry.zone, lang)}
                          {entry.locationName ? ` · ${entry.locationName}` : ""}
                        </Text>
                        <Text
                          style={[
                            styles.locationMeta,
                            lang === "ar" && styles.textRtl,
                            { color: theme.muted },
                          ]}
                        >
                          {arOrEn(
                            lang,
                            `الحد الأدنى ${entry.minThreshold} · الحد الأقصى ${entry.maxThreshold ?? "—"}`,
                            `Min ${entry.minThreshold} · Max ${entry.maxThreshold ?? "—"}`,
                          )}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.locationQuantity,
                          { color: isLowStock(entry) ? theme.danger : theme.primaryStrong },
                        ]}
                      >
                        {entry.quantity}
                      </Text>
                      <Ionicons name="chevron-forward" size={17} color={theme.muted} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {!loading && !visible.length ? (
        <View style={styles.emptyState}>
          <Image
            source={require("../../assets/empty_stock.png")}
            resizeMode="contain"
            style={styles.emptyImage}
          />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {arOrEn(lang, "لا يوجد مخزون", "No stock items")}
          </Text>
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            {hasBranchContext ? copy.noStockItems : copy.branchUnavailable}
          </Text>
        </View>
      ) : null}

      {selectedItem ? (
        <RecordDetailModal
          visible
          theme={theme}
          lang={lang}
          title={arOrEn(lang, "تفاصيل المخزون", "Stock details")}
          reference={productNameFor(selectedItem)}
          status={
            isLowStock(selectedItem)
              ? arOrEn(lang, "مخزون منخفض", "Low stock")
              : arOrEn(lang, "متوفر", "In stock")
          }
          fields={[
            {
              label: arOrEn(lang, "الكمية الحالية", "Current quantity"),
              value: String(selectedItem.quantity),
              icon: "cube-outline",
            },
            {
              label: arOrEn(lang, "الحد الأدنى", "Minimum threshold"),
              value: String(selectedItem.minThreshold),
              icon: "warning-outline",
            },
            {
              label: arOrEn(lang, "منطقة المخزون", "Stock zone"),
              value: stockZoneLabel(selectedItem.zone, lang),
              icon: "location-outline",
            },
          ]}
          onClose={() => setSelectedItem(null)}
        >
          <View style={styles.detailAction}>
            <PrimaryButton
              theme={theme}
              label={arOrEn(lang, "تعديل المخزون", "Adjust stock")}
              onPress={() => {
                const item = selectedItem;
                setSelectedItem(null);
                onAdjust(item);
              }}
            />
          </View>
        </RecordDetailModal>
      ) : null}

      <Modal
        transparent
        animationType="fade"
        visible={zonesOpen}
        onRequestClose={() => setZonesOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setZonesOpen(false)}>
          <View style={[styles.zoneSheet, { backgroundColor: theme.surface }]}>
            <Text style={[styles.zoneTitle, { color: theme.text }]}>
              {arOrEn(lang, "منطقة المخزون", "Stock zone")}
            </Text>
            {(["KITCHEN", "BRANCH", "CENTRAL"] as StockZone[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  onZoneChange(item);
                  setZonesOpen(false);
                }}
                style={[styles.zoneOption, { borderBottomColor: theme.border }]}
              >
                <Text
                  style={[
                    styles.zoneOptionText,
                    { color: item === zone ? theme.primaryStrong : theme.text },
                  ]}
                >
                  {stockZoneLabel(item, lang)}
                </Text>
                {item === zone ? (
                  <Ionicons name="checkmark" size={19} color={theme.primaryStrong} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
      {scope ? (
        <ScopeFilterModal
          visible={scopeOpen}
          picker={scopePicker}
          theme={theme}
          lang={lang}
          scope={scope}
          onPickerChange={setScopePicker}
          onClose={() => {
            setScopePicker(null);
            setScopeOpen(false);
          }}
        />
      ) : null}
    </>
  );
};

const Summary = ({
  theme,
  value,
  label,
  color,
}: {
  theme: SnowTheme;
  value: number;
  label: string;
  color: string;
}) => (
  <View style={[styles.summaryCard, { backgroundColor: `${color}0A`, borderColor: `${color}18` }]}>
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    <Text numberOfLines={1} style={[styles.summaryLabel, { color }]}>
      {label}
    </Text>
  </View>
);

const styles = createSnowStyles({
  header: { position: "relative", height: 94, justifyContent: "center" },
  title: { width: "100%", fontSize: 28, lineHeight: 38, fontWeight: "700", textAlign: "center" },
  titleRtl: { textAlign: "right", writingDirection: "rtl" },
  scopeButton: {
    position: "absolute",
    left: 0,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    height: 58,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchRtl: { flexDirection: "row-reverse" },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0, textAlign: "right" },
  zoneButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  summary: { flexDirection: "row", gap: 12, marginTop: 20 },
  summaryCard: {
    flex: 1,
    minHeight: 118,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: { fontSize: 36, lineHeight: 44, fontWeight: "700" },
  summaryLabel: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  viewTabs: {
    height: 48,
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    overflow: "hidden",
  },
  viewTab: { flex: 1, alignItems: "center", justifyContent: "center" },
  viewTabText: { fontSize: 14, fontWeight: "700" },
  quickFilters: { marginTop: 12, flexDirection: "row", gap: 7 },
  quickFilter: {
    flex: 1,
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  quickFilterText: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  sectionHeader: { minHeight: 80, marginTop: 18, borderTopWidth: 1, justifyContent: "center" },
  sectionTitle: { width: "100%", fontSize: 20, lineHeight: 28, fontWeight: "700" },
  sectionTitleRtl: { textAlign: "right", writingDirection: "rtl" },
  list: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, overflow: "hidden" },
  emptyState: {
    minHeight: 350,
    paddingVertical: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  emptyImage: { width: 230, height: 230, marginBottom: -10 },
  emptyTitle: { fontSize: 20, lineHeight: 28, fontWeight: "700", textAlign: "center" },
  emptyText: { maxWidth: 290, fontSize: 13, lineHeight: 20, textAlign: "center" },
  row: { minHeight: 78, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  rowRtl: { flexDirection: "row-reverse" },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "88%", height: "88%" },
  productCopy: { flex: 1, gap: 3 },
  productName: { fontSize: 15, lineHeight: 22, fontWeight: "600" },
  locationCount: { fontSize: 11, lineHeight: 16 },
  textRtl: { textAlign: "right", writingDirection: "rtl" },
  quantity: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  locations: { paddingHorizontal: 12 },
  locationRow: {
    minHeight: 64,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationCopy: { flex: 1, gap: 3 },
  locationTitle: { fontSize: 13, lineHeight: 19, fontWeight: "600" },
  locationMeta: { fontSize: 10, lineHeight: 15 },
  locationQuantity: { minWidth: 30, fontSize: 14, fontWeight: "700", textAlign: "center" },
  allButton: {
    minHeight: 54,
    borderRadius: 14,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  allButtonText: { fontSize: 15, fontWeight: "600" },
  detailAction: { marginTop: spacing.lg },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.35)", justifyContent: "flex-end" },
  zoneSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: spacing.lg,
    paddingBottom: 30,
  },
  zoneTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  zoneOption: {
    minHeight: 52,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  zoneOptionText: { fontSize: 13, fontWeight: "600" },
});
