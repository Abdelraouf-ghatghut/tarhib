import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Card,
  appShadow,
  createSnowStyles,
  spacing,
  fetchFavoriteProductIds,
  setProductFavorite,
  type CatalogProduct,
  type Lang,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { ErrorState, LoadingState, ui } from "../../components/ui";
import { arOrEn, productLabel, productSubtitle, type EmployeeProfile } from "../../lib/format";
import { productImage } from "../../lib/productImages";

// Écran d'accueil : catalogue "Nos boissons" (seul catalogue commandable, voir
// CLAUDE.md §3) + suivi de consommation mensuelle par produit à quota.
export const HomeTab = ({
  theme,
  lang,
  employee,
  catalogQuery,
  quantities,
  totalItems,
  onAdd,
  onRemove,
  onGoToCart,
}: {
  theme: SnowTheme;
  lang: Lang;
  employee: EmployeeProfile;
  catalogQuery: UseQueryResult<CatalogProduct[]>;
  quantities: Record<string, number>;
  totalItems: number;
  onAdd: (productId: string) => void;
  onRemove: (productId: string) => void;
  onGoToCart: () => void;
}) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const queryClient = useQueryClient();
  const favoritesQuery = useQuery({
    queryKey: ["employee-favorites"],
    queryFn: fetchFavoriteProductIds,
  });
  const favoriteIds = favoritesQuery.data ?? [];
  const favoriteMutation = useMutation({
    mutationFn: ({ productId, favorite }: { productId: string; favorite: boolean }) =>
      setProductFavorite(productId, favorite),
    onSuccess: (ids) => queryClient.setQueryData(["employee-favorites"], ids),
  });
  const allDrinks = catalogQuery.data ?? [];
  const categories = useMemo(
    () => [...new Set(allDrinks.map((product) => product.category).filter(Boolean))],
    [allDrinks],
  );
  const drinks = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return allDrinks.filter((product) => {
      const categoryMatches = category === "all" || product.category === category;
      const textMatches =
        !term || `${product.nameAr} ${product.nameEn ?? ""}`.toLocaleLowerCase().includes(term);
      return categoryMatches && textMatches;
    });
  }, [allDrinks, category, search]);
  const quotaTracked = allDrinks.filter((p) => p.quotaMax !== null && p.quotaRemaining !== null);

  return (
    <>
      <HomeHeader
        theme={theme}
        lang={lang}
        employee={employee}
        totalItems={totalItems}
        onGoToCart={onGoToCart}
      />

      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name="cafe" size={22} color={theme.primaryStrong} />
          <View style={[styles.sectionIconLine, { backgroundColor: theme.primaryStrong }]} />
        </View>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {arOrEn(lang, "مشروباتنا", "Our drinks")}
        </Text>
      </View>

      <View
        style={[styles.searchBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
      >
        <Ionicons name="search-outline" size={20} color={theme.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={arOrEn(lang, "ابحث بالعربية أو الإنجليزية", "Search in Arabic or English")}
          placeholderTextColor={theme.muted}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
      >
        {["all", ...categories].map((item) => (
          <Pressable
            key={item}
            onPress={() => setCategory(item)}
            style={[
              styles.categoryPill,
              { backgroundColor: category === item ? theme.primary : theme.surfaceAlt },
            ]}
          >
            <Text
              style={[styles.categoryText, { color: category === item ? "#FFFFFF" : theme.text }]}
            >
              {item === "all" ? arOrEn(lang, "الكل", "All") : item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {catalogQuery.isLoading ? (
        <LoadingState theme={theme} lang={lang} />
      ) : catalogQuery.isError ? (
        <ErrorState
          theme={theme}
          lang={lang}
          label={arOrEn(lang, "تعذر تحميل المشروبات", "Unable to load drinks")}
          onRetry={() => void catalogQuery.refetch()}
        />
      ) : (
        <View style={styles.grid}>
          {drinks.map((product) => (
            <DrinkCard
              key={product.id}
              theme={theme}
              lang={lang}
              product={product}
              quantity={quantities[product.id] ?? 0}
              favorite={favoriteIds.includes(product.id)}
              favoritePending={
                favoriteMutation.isPending && favoriteMutation.variables?.productId === product.id
              }
              onToggleFavorite={() =>
                favoriteMutation.mutate({
                  productId: product.id,
                  favorite: !favoriteIds.includes(product.id),
                })
              }
              onOpenDetails={() => setSelectedProduct(product)}
              onAdd={() => onAdd(product.id)}
              onRemove={() => onRemove(product.id)}
            />
          ))}
        </View>
      )}

      {totalItems > 0 ? (
        <Pressable onPress={onGoToCart}>
          <View style={[styles.cartBar, { backgroundColor: theme.primarySoft }]}>
            <View style={styles.cartBarInfo}>
              <View style={styles.cartBarIconWrap}>
                <Ionicons name="bag-handle-outline" size={28} color={theme.primaryStrong} />
                <View
                  style={[
                    styles.cartBarBadge,
                    { backgroundColor: theme.primary, borderColor: theme.primarySoft },
                  ]}
                >
                  <Text style={styles.cartBarBadgeText}>{totalItems}</Text>
                </View>
              </View>
              <Text style={[ui.productName, { color: theme.primaryStrong }]}>
                {arOrEn(
                  lang,
                  `${totalItems} عنصر تم اختياره`,
                  `${totalItems} item${totalItems > 1 ? "s" : ""} selected`,
                )}
              </Text>
            </View>
            <View style={[styles.cartBarButton, { backgroundColor: theme.primary }]}>
              <Text style={styles.cartBarButtonText}>
                {arOrEn(lang, "عرض سلتي", "View my cart")}
              </Text>
            </View>
          </View>
        </Pressable>
      ) : null}
      <ProductDetailsModal
        product={selectedProduct}
        lang={lang}
        theme={theme}
        onClose={() => setSelectedProduct(null)}
      />

      <Text style={[styles.consumptionTitle, { color: theme.text }]}>
        {arOrEn(lang, "استهلاك اليوم", "Today's consumption")}
      </Text>
      {quotaTracked.length > 0 ? (
        <Card theme={theme} style={[styles.consumptionCard, { borderColor: theme.border }]}>
          {quotaTracked.map((product, index) => (
            <ConsumptionRow
              key={product.id}
              theme={theme}
              lang={lang}
              product={product}
              divider={index < quotaTracked.length - 1}
            />
          ))}
        </Card>
      ) : !catalogQuery.isLoading && !catalogQuery.isError ? (
        <Card theme={theme} style={styles.emptyQuota}>
          <Text style={[ui.small, { color: theme.muted }]}>
            {arOrEn(lang, "لا توجد حصة مفعّلة على منتجاتك", "No quota configured on your products")}
          </Text>
        </Card>
      ) : null}
    </>
  );
};

const HomeHeader = ({
  theme,
  lang,
  employee,
  totalItems,
  onGoToCart,
}: {
  theme: SnowTheme;
  lang: Lang;
  employee: EmployeeProfile;
  totalItems: number;
  onGoToCart: () => void;
}) => {
  const firstName = employee
    ? arOrEn(lang, employee.firstNameAr, employee.firstNameEn)
    : arOrEn(lang, "بك", "there");
  return (
    <View style={styles.homeHeader}>
      <View style={styles.headerText}>
        <Text style={[ui.headerSubtitle, { color: theme.muted }]}>
          {arOrEn(lang, "مرحباً \u{1F44B}", "Hello \u{1F44B}")}
        </Text>
        <Text style={[styles.headerName, { color: theme.text }]}>{firstName}</Text>
        <Text style={[ui.headerSubtitle, { color: theme.muted }]}>
          {arOrEn(lang, "كيف يمكنني خدمتك؟", "What would you like to drink?")}
        </Text>
      </View>
      <Pressable onPress={onGoToCart} style={styles.cartShortcut}>
        <View style={[styles.cartChip, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="bag-handle-outline" size={28} color={theme.primaryStrong} />
        </View>
        {totalItems > 0 ? (
          <View
            style={[
              styles.cartShortcutBadge,
              { backgroundColor: theme.primaryStrong, borderColor: theme.background },
            ]}
          >
            <Text style={styles.cartShortcutBadgeText}>{totalItems > 9 ? "9+" : totalItems}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
};

const DrinkCard = ({
  theme,
  lang,
  product,
  quantity,
  favorite,
  favoritePending,
  onToggleFavorite,
  onOpenDetails,
  onAdd,
  onRemove,
}: {
  theme: SnowTheme;
  lang: Lang;
  product: CatalogProduct;
  quantity: number;
  favorite: boolean;
  favoritePending: boolean;
  onToggleFavorite: () => void;
  onOpenDetails: () => void;
  onAdd: () => void;
  onRemove: () => void;
}) => {
  const image = productImage(product);
  const subtitle = productSubtitle(product, lang);
  const maximum = Math.max(
    0,
    Math.min(product.availableQuantity, product.quotaRemaining ?? Number.MAX_SAFE_INTEGER),
  );

  return (
    <View
      style={[
        styles.drinkCard,
        appShadow(theme),
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.drinkImageWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={arOrEn(
            lang,
            favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة",
            favorite ? "Remove from favorites" : "Add to favorites",
          )}
          disabled={favoritePending}
          onPress={onToggleFavorite}
          style={styles.favoriteButton}
        >
          <Ionicons
            name={favorite ? "heart" : "heart-outline"}
            size={22}
            color={favorite ? theme.danger : theme.muted}
          />
        </Pressable>
        {image ? (
          <Image source={image} resizeMode="contain" style={styles.drinkImage} />
        ) : (
          <Ionicons name="cafe" size={64} color={theme.muted} />
        )}
      </View>
      <Text numberOfLines={1} style={[styles.drinkName, { color: theme.text }]}>
        {productLabel(product, lang)}
      </Text>
      {subtitle ? (
        <Text numberOfLines={1} style={[styles.drinkSubtitle, { color: theme.muted }]}>
          {subtitle}
        </Text>
      ) : (
        <View style={styles.drinkSubtitleSpacer} />
      )}
      <Pressable accessibilityRole="button" onPress={onOpenDetails} style={styles.detailsButton}>
        <Ionicons name="information-circle-outline" size={18} color={theme.primaryStrong} />
        <Text style={[styles.detailsButtonText, { color: theme.primaryStrong }]}>
          {arOrEn(lang, "التفاصيل", "Details")}
        </Text>
      </Pressable>
      <DrinkStepper
        theme={theme}
        quantity={quantity}
        maximum={maximum}
        onAdd={onAdd}
        onRemove={onRemove}
      />
    </View>
  );
};

/**
 * Stepper local aux cartes boissons : + vert pastel, - gris — distinct du
 * Stepper partagé (bordure neutre) utilisé ailleurs (panier, fiche produit).
 */
const DrinkStepper = ({
  theme,
  quantity,
  maximum,
  onAdd,
  onRemove,
}: {
  theme: SnowTheme;
  quantity: number;
  maximum: number;
  onAdd: () => void;
  onRemove: () => void;
}) => (
  <View style={styles.drinkStepper}>
    <Pressable
      disabled={quantity === 0}
      onPress={onRemove}
      style={[styles.drinkStepperButton, { backgroundColor: theme.surfaceAlt }]}
    >
      <Ionicons name="remove" size={16} color={theme.muted} />
    </Pressable>
    <Text style={[styles.drinkStepperText, { color: theme.text }]}>{quantity}</Text>
    <Pressable
      disabled={quantity >= maximum}
      onPress={onAdd}
      style={[
        styles.drinkStepperButton,
        { backgroundColor: theme.primarySoft, opacity: quantity >= maximum ? 0.4 : 1 },
      ]}
    >
      <Ionicons name="add" size={16} color={theme.primaryStrong} />
    </Pressable>
  </View>
);

const ProductDetailsModal = ({
  product,
  lang,
  theme,
  onClose,
}: {
  product: CatalogProduct | null;
  lang: Lang;
  theme: SnowTheme;
  onClose: () => void;
}) => (
  <Modal visible={!!product} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView
      style={[styles.detailsRoot, { backgroundColor: theme.background }]}
      edges={["top", "bottom"]}
    >
      {product ? (
        <ScrollView contentContainerStyle={styles.detailsContent}>
          <View style={styles.detailsHeader}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>
              {productLabel(product, lang)}
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={26} color={theme.text} />
            </Pressable>
          </View>
          <View style={[styles.detailsHero, { backgroundColor: theme.primarySoft }]}>
            {productImage(product) ? (
              <Image
                source={productImage(product)!}
                resizeMode="contain"
                style={styles.detailsImage}
              />
            ) : (
              <Ionicons name="cafe" size={96} color={theme.primaryStrong} />
            )}
          </View>
          <Card theme={theme} style={styles.detailsSection}>
            <Text style={[styles.detailsSectionTitle, { color: theme.text }]}>
              {arOrEn(lang, "مسببات الحساسية", "Allergens")}
            </Text>
            <Text style={[styles.detailsBody, { color: theme.muted }]}>
              {product.allergens?.length
                ? product.allergens.join(" · ")
                : arOrEn(lang, "لا توجد مسببات حساسية مسجلة", "No allergens recorded")}
            </Text>
          </Card>
          <Card theme={theme} style={styles.detailsSection}>
            <Text style={[styles.detailsSectionTitle, { color: theme.text }]}>
              {arOrEn(lang, "القيم الغذائية", "Nutrition")}
            </Text>
            <View style={styles.nutritionGrid}>
              {[
                [arOrEn(lang, "السعرات", "Calories"), product.nutrition?.caloriesKcal, "kcal"],
                [arOrEn(lang, "السكر", "Sugar"), product.nutrition?.sugarG, "g"],
                [arOrEn(lang, "الكافيين", "Caffeine"), product.nutrition?.caffeineMg, "mg"],
              ].map(([label, value, unit]) => (
                <View
                  key={String(label)}
                  style={[styles.nutritionItem, { backgroundColor: theme.surfaceAlt }]}
                >
                  <Text style={[styles.nutritionValue, { color: theme.text }]}>
                    {value ?? "—"} {value != null ? unit : ""}
                  </Text>
                  <Text style={[styles.nutritionLabel, { color: theme.muted }]}>{label}</Text>
                </View>
              ))}
            </View>
          </Card>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  </Modal>
);

const ConsumptionRow = ({
  theme,
  lang,
  product,
  divider,
}: {
  theme: SnowTheme;
  lang: Lang;
  product: CatalogProduct;
  divider: boolean;
}) => {
  const max = product.quotaMax ?? 0;
  const remaining = product.quotaRemaining ?? 0;
  const used = Math.max(max - remaining, 0);
  const percent = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const image = productImage(product);

  return (
    <View
      style={[
        styles.consumptionRow,
        divider ? { borderBottomWidth: 1, borderBottomColor: theme.border } : null,
      ]}
    >
      <View style={styles.consumptionTop}>
        <View style={styles.consumptionIdentity}>
          <View
            style={[styles.consumptionThumb, appShadow(theme), { backgroundColor: theme.surface }]}
          >
            {image ? (
              <Image source={image} resizeMode="contain" style={styles.consumptionThumbImage} />
            ) : (
              <Ionicons name="cafe" size={26} color={theme.muted} />
            )}
          </View>
          <Text numberOfLines={1} style={[styles.consumptionName, { color: theme.text }]}>
            {productLabel(product, lang)}
          </Text>
        </View>
        <View style={styles.consumptionStats}>
          <Text numberOfLines={1} style={[styles.consumptionCount, { color: theme.primaryStrong }]}>
            {arOrEn(lang, `${used} / ${max} مشروب`, `${used} / ${max} drinks`)}
          </Text>
          <View style={[styles.consumptionTrack, { backgroundColor: theme.surfaceAlt }]}>
            <View
              style={[
                styles.consumptionFill,
                { backgroundColor: theme.primary, width: `${percent}%` },
              ]}
            />
          </View>
        </View>
        <Text numberOfLines={1} style={[styles.consumptionRemaining, { color: theme.muted }]}>
          {arOrEn(lang, `متبقي لك ${remaining} مشروب`, `${remaining} drinks left`)}
        </Text>
      </View>
    </View>
  );
};

const styles = createSnowStyles({
  homeHeader: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.sm,
  },
  headerName: {
    fontSize: 32,
    fontWeight: "700",
  },
  cartShortcut: {
    position: "relative",
  },
  cartChip: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  cartShortcutBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  cartShortcutBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionIconWrap: {
    width: 28,
    alignItems: "center",
    gap: 2,
  },
  sectionIconLine: {
    width: 26,
    height: 2,
    borderRadius: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  searchBox: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, minHeight: 44, fontSize: 15 },
  categories: { gap: 8, paddingVertical: 8 },
  categoryPill: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: { fontSize: 14, fontWeight: "600" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  drinkCard: {
    width: "31%",
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.sm,
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 188,
  },
  drinkImageWrap: {
    width: "100%",
    height: 104,
    marginBottom: -8,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteButton: {
    position: "absolute",
    zIndex: 2,
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  drinkImage: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.14 }],
  },
  drinkName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  drinkSubtitle: {
    fontSize: 11,
    fontWeight: "400",
    textAlign: "center",
  },
  drinkSubtitleSpacer: {
    height: 14,
  },
  detailsButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  detailsButtonText: { fontSize: 12, fontWeight: "600" },
  drinkStepper: {
    width: "100%",
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  drinkStepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  drinkStepperText: {
    minWidth: 20,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
  },
  cartBar: {
    minHeight: 72,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cartBarInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cartBarIconWrap: {
    position: "relative",
  },
  cartBarBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBarBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cartBarButton: {
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBarButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  consumptionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  consumptionCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  consumptionRow: {
    minHeight: 48,
    paddingVertical: spacing.xs,
  },
  consumptionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  consumptionIdentity: {
    width: 108,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  consumptionThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  consumptionThumbImage: {
    width: "88%",
    height: "88%",
  },
  consumptionName: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  consumptionStats: {
    flex: 1,
    alignItems: "stretch",
    gap: spacing.xs,
  },
  consumptionCount: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  consumptionRemaining: {
    width: 104,
    fontSize: 9,
    fontWeight: "400",
    textAlign: "center",
  },
  consumptionTrack: {
    width: "100%",
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  consumptionFill: {
    height: "100%",
    borderRadius: 4,
  },
  emptyQuota: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsRoot: { flex: 1 },
  detailsContent: { padding: spacing.lg, paddingBottom: 48, gap: spacing.lg },
  detailsHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  detailsTitle: { flex: 1, fontSize: 24, fontWeight: "700" },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  detailsHero: { height: 240, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  detailsImage: { width: "80%", height: "80%" },
  detailsSection: { padding: spacing.lg, borderRadius: 16, gap: spacing.md },
  detailsSectionTitle: { fontSize: 18, fontWeight: "700" },
  detailsBody: { fontSize: 15, lineHeight: 22 },
  nutritionGrid: { flexDirection: "row", gap: spacing.sm },
  nutritionItem: {
    flex: 1,
    minHeight: 88,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  nutritionValue: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  nutritionLabel: { fontSize: 11, textAlign: "center" },
});
