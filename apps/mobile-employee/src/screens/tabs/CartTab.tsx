import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";

import {
  Card,
  PrimaryButton,
  createSnowStyles,
  spacing,
  type Lang,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { ui } from "../../components/ui";
import type { Cart } from "../../hooks/useCart";
import { arOrEn, productLabel, productSubtitle } from "../../lib/format";
import { productImage } from "../../lib/productImages";

const MAX_NOTE_LENGTH = 250;

const CartEmpty = ({
  theme,
  lang,
  onOpenCatalog,
}: {
  theme: SnowTheme;
  lang: Lang;
  onOpenCatalog: () => void;
}) => (
  <View style={styles.emptyRoot}>
    <View style={styles.emptyContent}>
      <Image
        source={require("../../assets/shopping_bag.png")}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <Text style={[ui.screenTitle, { color: theme.text }]}>
        {arOrEn(lang, "سلتك فارغة", "Your cart is empty")}
      </Text>
      <Text style={[ui.small, styles.emptyText, { color: theme.muted }]}>
        {arOrEn(
          lang,
          "اختر مشروباتك من الصفحة الرئيسية",
          "Choose your drinks from the Home screen",
        )}
      </Text>
    </View>
    <PrimaryButton
      label={arOrEn(lang, "العودة للرئيسية", "Back to Home")}
      pill
      theme={theme}
      onPress={onOpenCatalog}
    />
  </View>
);

export const CartTab = ({
  theme,
  lang,
  cart,
  note,
  orderError,
  isSubmitting,
  onNoteChange,
  onConfirm,
  onOpenCatalog,
}: {
  theme: SnowTheme;
  lang: Lang;
  cart: Cart;
  note: string;
  orderError: string | null;
  isSubmitting: boolean;
  onNoteChange: (value: string) => void;
  onConfirm: () => void;
  onOpenCatalog: () => void;
}) => (
  <>
    <View style={styles.cartHeader}>
      <Text style={[styles.title, { color: theme.text }]}>{arOrEn(lang, "سلتي", "My cart")}</Text>
      <Text style={[styles.itemCount, { color: theme.muted }]}>
        {cart.totalItems} {arOrEn(lang, "منتجات", cart.totalItems === 1 ? "item" : "items")}
      </Text>
      {cart.lines.length > 0 ? (
        <Pressable onPress={cart.clear} style={styles.clearAction}>
          <Ionicons name="trash-outline" size={22} color={theme.primaryStrong} />
          <Text style={[styles.clearText, { color: theme.primaryStrong }]}>
            {arOrEn(lang, "إفراغ", "Clear")}
          </Text>
        </Pressable>
      ) : null}
    </View>

    {cart.lines.length === 0 ? (
      <CartEmpty theme={theme} lang={lang} onOpenCatalog={onOpenCatalog} />
    ) : (
      <>
        <Card theme={theme} style={styles.productsCard}>
          {cart.lines.map((product, index) => {
            const image = productImage(product);
            const subtitle = productSubtitle(product, lang);
            return (
              <View
                key={product.id}
                style={[
                  styles.cartLine,
                  index > 0 ? { borderTopWidth: 1, borderTopColor: theme.border } : null,
                ]}
              >
                <View style={[styles.productVisual, { backgroundColor: theme.surfaceAlt }]}>
                  {image ? (
                    <Image source={image} resizeMode="contain" style={styles.productImage} />
                  ) : (
                    <Ionicons name="cafe-outline" size={34} color={theme.muted} />
                  )}
                </View>
                <View style={styles.productCopy}>
                  <Text numberOfLines={2} style={[styles.productName, { color: theme.text }]}>
                    {productLabel(product, lang)}
                  </Text>
                  {subtitle ? (
                    <Text style={[styles.productSubtitle, { color: theme.muted }]}>{subtitle}</Text>
                  ) : null}
                </View>
                <CartStepper
                  theme={theme}
                  quantity={cart.quantities[product.id] ?? 0}
                  onAdd={() => cart.add(product.id)}
                  onRemove={() => cart.remove(product.id)}
                />
              </View>
            );
          })}
        </Card>

        <Card theme={theme} style={styles.commentCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {arOrEn(lang, "تعليق", "Comment")}
          </Text>
          <Text style={[styles.helperText, { color: theme.muted }]}>
            {arOrEn(lang, "أضف ملاحظة لطلبك", "Add a note for your order")}
          </Text>
          <TextInput
            multiline
            value={note}
            onChangeText={onNoteChange}
            maxLength={MAX_NOTE_LENGTH}
            placeholder={arOrEn(lang, "مثلاً: بدون سكر، شكراً.", "Ex: No sugar, please.")}
            placeholderTextColor={theme.muted}
            style={[styles.noteInput, { borderColor: theme.border, color: theme.text }]}
          />
          <Text style={[styles.characterCount, { color: theme.muted }]}>
            {note.length} / {MAX_NOTE_LENGTH}
          </Text>
        </Card>

        <Card theme={theme} style={styles.summaryCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {arOrEn(lang, "الملخص", "Summary")}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.muted }]}>
              {arOrEn(lang, "عدد الأصناف", "Line items")}
            </Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{cart.lines.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.muted }]}>
              {arOrEn(lang, "إجمالي المنتجات", "Total products")}
            </Text>
            <Text style={[styles.totalValue, { color: theme.primaryStrong }]}>
              {cart.totalItems}
            </Text>
          </View>
        </Card>

        {orderError ? (
          <Text style={[ui.errorText, { color: theme.danger }]}>{orderError}</Text>
        ) : null}
        <Pressable
          disabled={isSubmitting}
          onPress={onConfirm}
          style={[
            styles.orderButton,
            { backgroundColor: theme.primaryStrong, opacity: isSubmitting ? 0.65 : 1 },
          ]}
        >
          <Text style={styles.orderButtonText}>
            {isSubmitting
              ? arOrEn(lang, "جاري الإرسال...", "Sending...")
              : arOrEn(lang, "إرسال الطلب", "Place order")}
          </Text>
        </Pressable>
      </>
    )}
  </>
);

const CartStepper = ({
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
  <View style={[styles.stepper, { borderColor: theme.border, backgroundColor: theme.surface }]}>
    <Pressable
      onPress={onRemove}
      style={[styles.stepperButton, { backgroundColor: theme.surfaceAlt }]}
    >
      <Ionicons name="remove" size={17} color={theme.muted} />
    </Pressable>
    <Text style={[styles.stepperValue, { color: theme.text }]}>{quantity}</Text>
    <Pressable
      onPress={onAdd}
      style={[styles.stepperButton, { backgroundColor: theme.primarySoft }]}
    >
      <Ionicons name="add" size={18} color={theme.primaryStrong} />
    </Pressable>
  </View>
);

const styles = createSnowStyles({
  cartHeader: {
    position: "relative",
    height: 88,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    alignItems: "center",
  },
  title: { fontSize: 30, fontWeight: "700" },
  itemCount: { position: "absolute", top: 32, start: 0, fontSize: 14, fontWeight: "400" },
  clearAction: {
    position: "absolute",
    top: 20,
    end: 0,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  clearText: { fontSize: 14, fontWeight: "600" },
  productsCard: { borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  cartLine: {
    minHeight: 116,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  productVisual: {
    width: 82,
    height: 82,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImage: { width: "112%", height: "112%" },
  productCopy: { flex: 1, gap: spacing.xs },
  productName: { fontSize: 15, fontWeight: "700" },
  productSubtitle: { fontSize: 12, fontWeight: "400" },
  stepper: {
    width: 118,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: { minWidth: 24, textAlign: "center", fontSize: 15, fontWeight: "600" },
  commentCard: { borderRadius: 20, padding: spacing.lg, gap: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  helperText: { fontSize: 12, fontWeight: "400" },
  noteInput: {
    minHeight: 112,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    textAlignVertical: "top",
    fontSize: 13,
    fontWeight: "400",
  },
  characterCount: { alignSelf: "flex-end", fontSize: 11, fontWeight: "400" },
  summaryCard: { borderRadius: 20, padding: spacing.lg, gap: spacing.md },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summaryLabel: { fontSize: 13, fontWeight: "400" },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  totalValue: { fontSize: 20, fontWeight: "700" },
  orderButton: { minHeight: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  orderButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  emptyRoot: { flex: 1, minHeight: 420, justifyContent: "space-between", gap: spacing.xl },
  emptyContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs },
  emptyImage: { width: 300, height: 300, marginBottom: -16 },
  emptyText: { textAlign: "center" },
});
