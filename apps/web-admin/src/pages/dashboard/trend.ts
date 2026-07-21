import dayjs, { type Dayjs } from "dayjs";
import type { ChartPeriod, OrderRow } from "./types";

export const fmt = (d: Dayjs) => d.format("YYYY-MM-DD");

/** Bornes réelles d'une période de graphique (custom = plage sélectionnée). */
export function periodRange(
  period: ChartPeriod,
  custom: [Dayjs, Dayjs] | null,
): { from: Dayjs; to: Dayjs } {
  const now = dayjs();
  if (period === "today") return { from: now.startOf("day"), to: now.endOf("day") };
  if (period === "week")
    return { from: now.subtract(6, "day").startOf("day"), to: now.endOf("day") };
  if (period === "month") return { from: now.startOf("month"), to: now.endOf("day") };
  if (period === "year") return { from: now.startOf("year"), to: now.endOf("day") };
  if (custom) return { from: custom[0].startOf("day"), to: custom[1].endOf("day") };
  return { from: now.startOf("month"), to: now.endOf("day") };
}

/** Agrège les commandes en buckets adaptés à la durée (heures / jours / mois). */
export function buildTrend(orders: OrderRow[], from: Dayjs, to: Dayjs, locale: string) {
  const spanDays = to.diff(from, "day") + 1;
  const unit: "hour" | "day" | "month" = spanDays <= 1 ? "hour" : spanDays <= 92 ? "day" : "month";
  const starts: Dayjs[] = [];
  let cursor = from.startOf(unit);
  while (starts.length < 500 && (cursor.isBefore(to) || cursor.isSame(to, unit))) {
    starts.push(cursor);
    cursor = cursor.add(1, unit);
  }

  const buckets = starts.map(() => ({ total: 0, delivered: 0 }));
  for (const o of orders) {
    const d = dayjs(o.createdAt);
    if (d.isBefore(from) || d.isAfter(to)) continue;
    const idx =
      unit === "month"
        ? (d.year() - starts[0].year()) * 12 + d.month() - starts[0].month()
        : d.startOf(unit).diff(starts[0], unit);
    if (idx < 0 || idx >= buckets.length) continue;
    buckets[idx].total += 1;
    if (o.status === "DELIVERED") buckets[idx].delivered += 1;
  }

  const monthFmt = new Intl.DateTimeFormat(locale, { month: "short" });
  const labelEvery = Math.max(1, Math.ceil(starts.length / 12));
  const labels = starts.map((s, i) => {
    if (i % labelEvery !== 0) return "";
    if (unit === "hour") return s.format("HH:mm");
    if (unit === "day") return s.format("DD/MM");
    return monthFmt.format(s.toDate());
  });

  return {
    labels,
    orders: buckets.map((b) => b.total),
    sla: buckets.map((b) => (b.total === 0 ? null : (b.delivered / b.total) * 100)),
    hasData: buckets.some((b) => b.total > 0),
  };
}
