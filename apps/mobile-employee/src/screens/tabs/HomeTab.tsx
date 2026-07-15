import { Ionicons } from "@expo/vector-icons";
import type { UseQueryResult } from "@tanstack/react-query";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import {
  Card,
  appShadow,
  createSnowStyles,
  spacing,
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
  const drinks = catalogQuery.data ?? [];
  const quotaTracked = drinks.filter((p) => p.quotaMax !== null && p.quotaRemaining !== null);

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
  onAdd,
  onRemove,
}: {
  theme: SnowTheme;
  lang: Lang;
  product: CatalogProduct;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}) => {
  const image = productImage(product);
  const subtitle = productSubtitle(product, lang);

  return (
    <View
      style={[
        styles.drinkCard,
        appShadow(theme),
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.drinkImageWrap}>
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
      <DrinkStepper theme={theme} quantity={quantity} onAdd={onAdd} onRemove={onRemove} />
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
  onAdd,
  onRemove,
}: {
  theme: SnowTheme;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}) => (
  <View style={styles.drinkStepper}>
    <Pressable
      onPress={onRemove}
      style={[styles.drinkStepperButton, { backgroundColor: theme.surfaceAlt }]}
    >
      <Ionicons name="remove" size={16} color={theme.muted} />
    </Pressable>
    <Text style={[styles.drinkStepperText, { color: theme.text }]}>{quantity}</Text>
    <Pressable
      onPress={onAdd}
      style={[styles.drinkStepperButton, { backgroundColor: theme.primarySoft }]}
    >
      <Ionicons name="add" size={16} color={theme.primaryStrong} />
    </Pressable>
  </View>
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
});
