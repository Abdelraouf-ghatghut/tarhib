import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Text, View } from "react-native";
import {
  Card,
  createSnowStyles,
  fetchMyOperationalZones,
  spacing,
  type Lang,
  type OperationalZoneType,
  type SnowTheme,
} from "@tarhib/mobile-shared";
import { arOrEn } from "../lib/format";

export const AssignedZonesCard = ({
  theme,
  lang,
  type,
}: {
  theme: SnowTheme;
  lang: Lang;
  type: OperationalZoneType;
}) => {
  const query = useQuery({
    queryKey: ["operational-zones", "mine"],
    queryFn: fetchMyOperationalZones,
    staleTime: 60_000,
  });
  const zones = (query.data ?? []).filter((zone) => zone.type === type);

  return (
    <Card theme={theme} style={[styles.card, { borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        {arOrEn(lang, "نطاق عملي", "My assigned zones")}
      </Text>
      {query.isLoading ? (
        <Text style={[styles.detail, { color: theme.muted }]}>
          {arOrEn(lang, "جارٍ تحميل المناطق…", "Loading zones…")}
        </Text>
      ) : zones.length ? (
        <View style={styles.list}>
          {zones.map((zone) => (
            <View key={zone.id} style={[styles.zone, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.zoneName, { color: theme.primaryStrong }]}>
                {lang === "ar" ? zone.nameAr : zone.nameEn || zone.nameAr}
              </Text>
              <Text style={[styles.detail, { color: theme.text }]}>
                {arOrEn(lang, "الطوابق", "Floors")}: {zone.floors.join("، ")}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.detail, { color: theme.muted }]}>
          {arOrEn(
            lang,
            "لم تُسند إليك منطقة نشطة. تواصل مع المسؤول.",
            "No active zone is assigned. Contact your manager.",
          )}
        </Text>
      )}
    </Card>
  );
};

const styles = createSnowStyles({
  card: { borderWidth: 1, borderRadius: 13, gap: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: 15, fontWeight: "700" },
  list: { gap: spacing.sm },
  zone: { borderRadius: 9, padding: spacing.md, gap: spacing.xs },
  zoneName: { fontSize: 14, fontWeight: "700" },
  detail: { fontSize: 13, lineHeight: 20 },
});
