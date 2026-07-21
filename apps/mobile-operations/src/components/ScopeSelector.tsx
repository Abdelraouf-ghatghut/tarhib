import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import {
  createSnowStyles,
  spacing,
  type Lang,
  type OrganizationBranch,
  type OrganizationCompany,
  type SnowTheme,
} from "@tarhib/mobile-shared";

type Option = { id: string | null; label: string };

export const ScopeSelector = ({
  theme,
  lang,
  companies,
  branches,
  companyId,
  branchId,
  canChangeCompany,
  onCompanyChange,
  onBranchChange,
}: {
  theme: SnowTheme;
  lang: Lang;
  companies: OrganizationCompany[];
  branches: OrganizationBranch[];
  companyId: string | null;
  branchId: string | null;
  canChangeCompany: boolean;
  onCompanyChange: (id: string | null) => void;
  onBranchChange: (id: string | null) => void;
}) => {
  const [picker, setPicker] = useState<"company" | "branch" | null>(null);
  const companyOptions: Option[] = [
    { id: null, label: lang === "ar" ? "كل الشركات" : "All companies" },
    ...companies.map((item) => ({
      id: item.id,
      label: lang === "ar" ? item.nameAr : item.nameEn,
    })),
  ];
  const branchOptions: Option[] = [
    { id: null, label: lang === "ar" ? "كل الفروع" : "All branches" },
    ...branches.map((item) => ({
      id: item.id,
      label: lang === "ar" ? item.nameAr : item.nameEn,
    })),
  ];
  const selectedCompany = companyOptions.find((item) => item.id === companyId)?.label;
  const selectedBranch = branchOptions.find((item) => item.id === branchId)?.label;
  const options = picker === "company" ? companyOptions : branchOptions;
  const selectedId = picker === "company" ? companyId : branchId;

  const select = (id: string | null) => {
    if (picker === "company") onCompanyChange(id);
    if (picker === "branch") onBranchChange(id);
    setPicker(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.fields}>
        {canChangeCompany ? (
          <SelectField
            theme={theme}
            icon="business-outline"
            label={lang === "ar" ? "الشركة" : "Company"}
            value={selectedCompany ?? (lang === "ar" ? "اختر الشركة" : "Select company")}
            onPress={() => setPicker("company")}
          />
        ) : null}
        {companyId ? (
          <SelectField
            theme={theme}
            icon="git-branch-outline"
            label={lang === "ar" ? "الفرع" : "Branch"}
            value={selectedBranch ?? (lang === "ar" ? "اختر الفرع" : "Select branch")}
            onPress={() => setPicker("branch")}
          />
        ) : null}
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={picker !== null}
        onRequestClose={() => setPicker(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPicker(null)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.surface }]}
            onPress={() => undefined}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                {picker === "company"
                  ? lang === "ar"
                    ? "اختيار الشركة"
                    : "Select company"
                  : lang === "ar"
                    ? "اختيار الفرع"
                    : "Select branch"}
              </Text>
              <Pressable onPress={() => setPicker(null)} style={styles.close}>
                <Ionicons name="close" size={20} color={theme.muted} />
              </Pressable>
            </View>
            <ScrollView style={styles.options}>
              {options.map((option) => {
                const active = option.id === selectedId;
                return (
                  <Pressable
                    key={option.id ?? "all"}
                    onPress={() => select(option.id)}
                    style={[styles.option, { borderBottomColor: theme.border }]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: active ? theme.primaryStrong : theme.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={20} color={theme.primaryStrong} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const SelectField = ({
  theme,
  icon,
  label,
  value,
  onPress,
}: {
  theme: SnowTheme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.field, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
  >
    <Ionicons name={icon} size={17} color={theme.muted} />
    <View style={styles.fieldCopy}>
      <Text style={[styles.fieldLabel, { color: theme.muted }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.fieldValue, { color: theme.text }]}>
        {value}
      </Text>
    </View>
    <Ionicons name="chevron-down" size={17} color={theme.muted} />
  </Pressable>
);

const styles = createSnowStyles({
  container: { gap: spacing.sm },
  fields: { gap: spacing.sm },
  field: {
    width: "100%",
    minHeight: 44,
    borderWidth: 0,
    borderRadius: 9,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fieldCopy: { flex: 1, gap: 2 },
  fieldLabel: { fontSize: 9 },
  fieldValue: { fontSize: 11, fontWeight: "600" },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.35)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "62%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: spacing.lg,
    paddingBottom: 30,
  },
  sheetHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontSize: 15, fontWeight: "700" },
  close: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  options: {},
  option: {
    minHeight: 54,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionLabel: { flex: 1, fontSize: 13, fontWeight: "500" },
});
