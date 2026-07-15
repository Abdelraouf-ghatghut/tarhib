import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Card,
  IconBubble,
  appShadow,
  createSnowStyles,
  directionalIcon,
  spacing,
  t,
  type AccessRoleSummary,
  type CatalogProduct,
  type Lang,
  type MobileQuota,
  type SnowTheme,
} from "@tarhib/mobile-shared";

import { ModalHeader, ui } from "../../components/ui";
import { arOrEn, displayEmployeeName, productLabel, type EmployeeProfile } from "../../lib/format";
import { productImage } from "../../lib/productImages";

/** Libellé du rôle principal (à défaut, le premier rôle) dans la langue active. */
function roleLabel(roles: AccessRoleSummary[], lang: Lang): string | null {
  const role = roles.find((r) => r.primary) ?? roles[0];
  if (!role) return null;
  return lang === "ar" ? role.nameAr : role.nameEn || role.nameAr;
}

export const ProfileTab = ({
  theme,
  lang,
  employee,
  roles,
  quotas,
  productsById,
  unreadNotifications,
  onOpenNotifications,
  onOpenSettings,
  onLogout,
}: {
  theme: SnowTheme;
  lang: Lang;
  employee: EmployeeProfile;
  roles: AccessRoleSummary[];
  quotas: MobileQuota[];
  productsById: Map<string, CatalogProduct>;
  unreadNotifications: number;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}) => {
  const [personalOpen, setPersonalOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);

  return (
    <>
      <View style={styles.profilePageHeader}>
        <View style={styles.profilePageHeading}>
          <Text style={[styles.profilePageTitle, { color: theme.text }]}>
            {arOrEn(lang, "ملفي الشخصي", "My profile")}
          </Text>
          <Text style={[styles.profilePageSubtitle, { color: theme.muted }]}>
            {arOrEn(lang, "إدارة معلوماتك وتفضيلاتك", "Manage your information and preferences")}
          </Text>
        </View>
        <Pressable onPress={onOpenNotifications} style={styles.notificationShortcut}>
          <Ionicons name="notifications-outline" size={29} color={theme.muted} />
          {unreadNotifications > 0 ? (
            <View
              style={[
                styles.notificationBadge,
                { backgroundColor: theme.primaryStrong, borderColor: theme.background },
              ]}
            >
              <Text style={styles.notificationBadgeText}>
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <ProfileHeader theme={theme} lang={lang} employee={employee} roles={roles} />
      {quotas.length > 0 ? (
        <ProfileConsumption theme={theme} lang={lang} quotas={quotas} productsById={productsById} />
      ) : null}
      <View
        style={[
          styles.profileMenuCard,
          appShadow(theme),
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <ProfileMenuRow
          theme={theme}
          icon="id-card-outline"
          title={arOrEn(lang, "البيانات الشخصية", "Personal information")}
          onPress={() => setPersonalOpen(true)}
        />
        <ProfileMenuRow
          theme={theme}
          icon="notifications-outline"
          title={arOrEn(lang, "الإشعارات", "Notifications")}
          badge={unreadNotifications}
          onPress={onOpenNotifications}
        />
        <ProfileMenuRow
          theme={theme}
          icon="shield-checkmark-outline"
          title={arOrEn(lang, "الأمان والإعدادات", "Security")}
          onPress={onOpenSettings}
        />
        <ProfileMenuRow
          theme={theme}
          icon="help-circle-outline"
          title={arOrEn(lang, "المساعدة والدعم", "Help and support")}
          onPress={() => setHelpOpen(true)}
        />
        <ProfileMenuRow
          theme={theme}
          icon="log-out-outline"
          title={t(lang).logout}
          danger
          last
          onPress={onLogout}
        />
      </View>

      <Modal
        visible={personalOpen}
        animationType="slide"
        onRequestClose={() => setPersonalOpen(false)}
      >
        <SafeAreaView
          edges={["top", "bottom"]}
          style={[styles.activityRoot, { backgroundColor: theme.background }]}
        >
          <ModalHeader
            theme={theme}
            lang={lang}
            title={arOrEn(lang, "البيانات الشخصية", "Personal information")}
            onBack={() => setPersonalOpen(false)}
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.activityContent}
          >
            <PersonalInfo theme={theme} lang={lang} employee={employee} roles={roles} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={helpOpen} animationType="slide" onRequestClose={() => setHelpOpen(false)}>
        <SafeAreaView
          edges={["top", "bottom"]}
          style={[styles.activityRoot, { backgroundColor: theme.background }]}
        >
          <ModalHeader
            theme={theme}
            lang={lang}
            title={arOrEn(lang, "المساعدة والأسئلة الشائعة", "Help and FAQ")}
            onBack={() => setHelpOpen(false)}
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.activityContent}
          >
            <HelpFaq theme={theme} lang={lang} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

/** Question repliable : le contenu ne s'affiche que si `open`. */
const FaqItem = ({
  theme,
  question,
  answer,
  open,
  onToggle,
}: {
  theme: SnowTheme;
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) => (
  <Card theme={theme} style={{ gap: spacing.sm }}>
    <Pressable onPress={onToggle} style={styles.faqQuestionRow}>
      <Text style={[ui.productName, styles.faqQuestion, { color: theme.text }]}>{question}</Text>
      <Ionicons
        name={open ? "chevron-up-outline" : "chevron-down-outline"}
        size={18}
        color={theme.muted}
      />
    </Pressable>
    {open ? <Text style={[ui.small, { color: theme.muted }]}>{answer}</Text> : null}
  </Card>
);

const HelpFaq = ({ theme, lang }: { theme: SnowTheme; lang: Lang }) => {
  const faqs = [
    {
      question: arOrEn(lang, "كيف أقدّم طلباً جديداً؟", "How do I place a new order?"),
      answer: arOrEn(
        lang,
        'من الرئيسية اضغط "اطلب الآن"، اختر المنتجات من الكتالوج ثم أكّد السلة.',
        'From the home screen tap "Order now", pick products from the catalog, then confirm your cart.',
      ),
    },
    {
      question: arOrEn(lang, "كيف أتابع حالة طلبي؟", "How do I track my order?"),
      answer: arOrEn(
        lang,
        'من "طلباتك الأخيرة" في الرئيسية أو تبويب الطلبات، اضغط على الطلب لعرض حالته لحظياً.',
        'From "Your recent orders" on the home screen or the Orders tab, tap an order to see its live status.',
      ),
    },
    {
      question: arOrEn(
        lang,
        "ماذا لو تجاوزت الحصة المتاحة؟",
        "What if I exceed my available quota?",
      ),
      answer: arOrEn(
        lang,
        "لا يمكن إضافة كمية تتجاوز الحصة المتبقية للمنتج خلال الفترة المحددة.",
        "You cannot add a quantity beyond the product’s remaining quota for the period.",
      ),
    },
    {
      question: arOrEn(lang, "كيف أحجز قاعة اجتماعات؟", "How do I book a meeting room?"),
      answer: arOrEn(
        lang,
        'من "حجز القاعات" في حسابي، اختر القاعة والتاريخ والوقت المناسبين.',
        'From "Room bookings" in your account, pick the room, date, and time you need.',
      ),
    },
  ];
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);
  return (
    <View style={{ gap: spacing.sm }}>
      {faqs.map((faq, index) => (
        <FaqItem
          key={faq.question}
          theme={theme}
          question={faq.question}
          answer={faq.answer}
          open={openIndex === index}
          onToggle={() => setOpenIndex((current) => (current === index ? null : index))}
        />
      ))}
    </View>
  );
};

/**
 * Ligne « icône + libellé + valeur » pour la page infos personnelles.
 * `writingDirection` force le paragraphe dans le sens de la langue active :
 * sans ça, du texte latin (email, téléphone) s'aligne à gauche même dans
 * une mise en page RTL, car RN suit le sens du contenu, pas du conteneur.
 */
const InfoRow = ({
  theme,
  lang,
  icon,
  label,
  value,
  latin,
}: {
  theme: SnowTheme;
  lang: Lang;
  icon: React.ComponentProps<typeof IconBubble>["icon"];
  label: string;
  value: string;
  /** Valeur toujours latine (téléphone, email) : ordre des caractères forcé
   * en LTR même en arabe — sinon le bidi RTL replace un caractère neutre
   * comme "+" après les chiffres au lieu de le garder au début du numéro.
   * Le bloc reste aligné à droite comme les autres lignes (textAlign suit
   * la langue de l'appli, indépendamment de l'ordre interne des caractères). */
  latin?: boolean;
}) => {
  const isRtl = lang === "ar";
  const textAlign = isRtl ? ("right" as const) : ("left" as const);
  const labelParagraph = {
    textAlign,
    writingDirection: isRtl ? ("rtl" as const) : ("ltr" as const),
  };
  const valueParagraph = {
    textAlign,
    writingDirection: isRtl && !latin ? ("rtl" as const) : ("ltr" as const),
  };
  return (
    <Card theme={theme} style={styles.infoRow}>
      <IconBubble icon={icon} theme={theme} />
      <View style={ui.rowInfo}>
        <Text style={[ui.small, labelParagraph, { color: theme.muted }]}>{label}</Text>
        <Text style={[ui.productName, valueParagraph, { color: theme.text }]}>{value}</Text>
      </View>
    </Card>
  );
};

const PersonalInfo = ({
  theme,
  lang,
  employee,
  roles,
}: {
  theme: SnowTheme;
  lang: Lang;
  employee: EmployeeProfile;
  roles: AccessRoleSummary[];
}) => {
  if (!employee) return null;
  const role = roleLabel(roles, lang);
  return (
    <View style={{ gap: spacing.sm }}>
      <InfoRow
        theme={theme}
        lang={lang}
        icon="person-outline"
        label={arOrEn(lang, "الاسم الكامل", "Full name")}
        value={displayEmployeeName(employee, lang)}
      />
      <InfoRow
        theme={theme}
        lang={lang}
        icon="mail-outline"
        label={arOrEn(lang, "البريد الإلكتروني", "Email")}
        value={employee.email}
        latin
      />
      {employee.company ? (
        <InfoRow
          theme={theme}
          lang={lang}
          icon="business-outline"
          label={arOrEn(lang, "الشركة", "Company")}
          value={lang === "ar" ? employee.company.nameAr : employee.company.nameEn}
        />
      ) : null}
      {employee.branch ? (
        <InfoRow
          theme={theme}
          lang={lang}
          icon="git-branch-outline"
          label={arOrEn(lang, "الفرع", "Branch")}
          value={lang === "ar" ? employee.branch.nameAr : employee.branch.nameEn}
        />
      ) : null}
      {role ? (
        <InfoRow
          theme={theme}
          lang={lang}
          icon="shield-checkmark-outline"
          label={arOrEn(lang, "الدور", "Role")}
          value={role}
        />
      ) : null}
      <InfoRow
        theme={theme}
        lang={lang}
        icon="call-outline"
        label={arOrEn(lang, "رقم الهاتف", "Phone number")}
        value={employee.phoneNumber}
        latin
      />
    </View>
  );
};

const ProfileHeader = ({
  theme,
  lang,
  employee,
  roles,
}: {
  theme: SnowTheme;
  lang: Lang;
  employee: EmployeeProfile;
  roles: AccessRoleSummary[];
}) => (
  <View
    style={[
      styles.profileHeader,
      appShadow(theme),
      { backgroundColor: theme.surface, borderColor: theme.border },
    ]}
  >
    <View style={[styles.profileAvatar, { backgroundColor: theme.primarySoft }]}>
      <Ionicons name="person" size={48} color="#FFFFFF" />
    </View>
    <View style={styles.profileIdentity}>
      <Text numberOfLines={1} style={[styles.profileName, { color: theme.text }]}>
        {employee
          ? displayEmployeeName(employee, lang)
          : arOrEn(lang, "موظف ترحيب", "Tarhib employee")}
      </Text>
      {employee?.email ? (
        <Text numberOfLines={1} style={[styles.profileEmail, { color: theme.muted }]}>
          {employee.email}
        </Text>
      ) : null}
    </View>
    {roleLabel(roles, lang) ? (
      <View style={[styles.roleBadge, { backgroundColor: theme.primarySoft }]}>
        <Text style={[styles.roleBadgeText, { color: theme.primaryStrong }]}>
          {roleLabel(roles, lang)}
        </Text>
      </View>
    ) : null}
  </View>
);

const ProfileConsumption = ({
  theme,
  lang,
  quotas,
  productsById,
}: {
  theme: SnowTheme;
  lang: Lang;
  quotas: MobileQuota[];
  productsById: Map<string, CatalogProduct>;
}) => (
  <View
    style={[
      styles.consumptionCard,
      appShadow(theme),
      { backgroundColor: theme.surface, borderColor: theme.border },
    ]}
  >
    <View style={styles.consumptionHeader}>
      <Ionicons name="stats-chart" size={22} color={theme.primaryStrong} />
      <Text style={[styles.consumptionTitle, { color: theme.text }]}>
        {arOrEn(lang, "استهلاكي", "My consumption")}
      </Text>
    </View>
    {quotas.map((quota, index) => {
      const product = productsById.get(quota.productId);
      const image = product ? productImage(product) : null;
      const percent =
        quota.maxQuantity > 0
          ? Math.min(100, Math.round((quota.usedQuantity / quota.maxQuantity) * 100))
          : 0;
      return (
        <View
          key={quota.productId}
          style={[
            styles.consumptionRow,
            index > 0 ? { borderTopWidth: 1, borderTopColor: theme.border } : null,
          ]}
        >
          <View style={[styles.consumptionThumb, { backgroundColor: theme.surfaceAlt }]}>
            {image ? (
              <Image source={image} resizeMode="contain" style={styles.consumptionImage} />
            ) : (
              <Ionicons name="cafe-outline" size={28} color={theme.muted} />
            )}
          </View>
          <Text numberOfLines={1} style={[styles.consumptionName, { color: theme.text }]}>
            {product ? productLabel(product, lang) : `#${quota.productId.slice(0, 8)}`}
          </Text>
          <View style={styles.consumptionProgress}>
            <Text style={[styles.consumptionCount, { color: theme.primaryStrong }]}>
              {quota.usedQuantity} / {quota.maxQuantity}{" "}
              <Text style={{ color: theme.muted }}>{arOrEn(lang, "مشروب", "drinks")}</Text>
            </Text>
            <View style={[styles.consumptionTrack, { backgroundColor: theme.surfaceAlt }]}>
              <View
                style={[
                  styles.consumptionFill,
                  { width: `${percent}%`, backgroundColor: theme.primary },
                ]}
              />
            </View>
          </View>
          <Text numberOfLines={2} style={[styles.consumptionRemaining, { color: theme.muted }]}>
            {arOrEn(lang, `متبقي ${quota.remaining} مشروب`, `${quota.remaining} drinks left`)}
          </Text>
        </View>
      );
    })}
  </View>
);

const ProfileMenuRow = ({
  theme,
  icon,
  title,
  badge,
  danger,
  last,
  onPress,
}: {
  theme: SnowTheme;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  badge?: number;
  danger?: boolean;
  last?: boolean;
  onPress: () => void;
}) => {
  const color = danger ? theme.danger : theme.primaryStrong;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.profileMenuRow,
        !last ? { borderBottomWidth: 1, borderBottomColor: theme.border } : null,
      ]}
    >
      <View
        style={[
          styles.profileMenuIcon,
          { backgroundColor: danger ? `${theme.danger}12` : theme.primarySoft },
        ]}
      >
        <Ionicons name={icon} size={23} color={color} />
      </View>
      <Text style={[styles.profileMenuTitle, { color: danger ? theme.danger : theme.text }]}>
        {title}
      </Text>
      {badge ? (
        <View style={[styles.profileMenuBadge, { backgroundColor: theme.primaryStrong }]}>
          <Text style={styles.profileMenuBadgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : null}
      <Ionicons name={directionalIcon("chevron-forward")} size={21} color={theme.muted} />
    </Pressable>
  );
};

const styles = createSnowStyles({
  profilePageHeader: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  profilePageHeading: { flex: 1, gap: spacing.sm },
  profilePageTitle: { fontSize: 30, lineHeight: 36, fontWeight: "700" },
  profilePageSubtitle: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  notificationShortcut: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  activityRoot: {
    flex: 1,
  },
  faqQuestionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  faqQuestion: {
    flex: 1,
  },
  activityContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  profileHeader: {
    minHeight: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.lg,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  profileIdentity: { flex: 1, minWidth: 0, gap: spacing.xs },
  profileName: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  profileEmail: { fontSize: 13, lineHeight: 19, fontWeight: "400" },
  roleBadge: {
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBadgeText: { fontSize: 13, fontWeight: "600" },
  consumptionCard: { borderWidth: 1, borderRadius: 20, padding: spacing.lg },
  consumptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  consumptionTitle: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
  consumptionRow: {
    minHeight: 84,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  consumptionThumb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  consumptionImage: { width: "96%", height: "96%" },
  consumptionName: { width: 72, fontSize: 14, fontWeight: "600" },
  consumptionProgress: { flex: 1, minWidth: 92, gap: spacing.sm },
  consumptionCount: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  consumptionTrack: { width: "100%", height: 6, borderRadius: 3, overflow: "hidden" },
  consumptionFill: { height: "100%", borderRadius: 3 },
  consumptionRemaining: {
    width: 82,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "400",
    textAlign: "center",
  },
  profileMenuCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    overflow: "hidden",
  },
  profileMenuRow: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: spacing.md },
  profileMenuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  profileMenuTitle: { flex: 1, fontSize: 15, fontWeight: "500" },
  profileMenuBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  profileMenuBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
});
