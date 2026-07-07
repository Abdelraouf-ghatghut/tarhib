import type { ReactNode } from "react";
import { Avatar, Button, Empty, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import type { AdminNotification } from "../hooks/useAdminNotifications";
import { RAIL_WIDTH } from "../hooks/useAdminNotifications";
import { auditApi } from "../lib/api";

const { Text } = Typography;

interface AuditEntry {
  id: string;
  userEmail: string | null;
  action: string;
  entity: string;
  createdAt: string;
}

const TONE_STYLE: Record<AdminNotification["tone"], { bg: string; fg: string }> = {
  warning: { bg: "var(--warning-soft)", fg: "var(--fg-warning-subtle)" },
  danger: { bg: "var(--danger-soft)", fg: "var(--fg-danger)" },
  brand: { bg: "var(--brand-softer)", fg: "var(--fg-brand)" },
  success: { bg: "var(--success-soft)", fg: "var(--fg-success)" },
};

const AVATAR_TONES = [
  "var(--brand)",
  "var(--teal)",
  "var(--orange)",
  "var(--indigo)",
  "var(--sky)",
  "var(--success)",
];

function relativeTime(iso: string, lang: string): string {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, sec] of units) {
    if (Math.abs(diffSec) >= sec) return rtf.format(Math.round(diffSec / sec), unit);
  }
  return rtf.format(Math.round(diffSec), "second");
}

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBlockEnd: 12,
      }}
    >
      <Text strong style={{ fontSize: 14, color: "var(--fg-heading)" }}>
        {title}
      </Text>
      {action}
    </div>
  );
}

export function RightRail({
  notifications,
  zIndex = 8,
}: {
  notifications: AdminNotification[];
  zIndex?: number;
}) {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const canAudit = hasPermission("company.manage");
  const { data: activities } = useQuery({
    queryKey: ["rail", "audit"],
    queryFn: () =>
      auditApi
        .list({ page: 1, limit: 6 })
        .then((r) => (r.data as { data?: AuditEntry[] }).data ?? (r.data as AuditEntry[])),
    enabled: canAudit,
  });

  return (
    <aside
      style={{
        position: "fixed",
        insetBlockStart: 0,
        insetBlockEnd: 0,
        insetInlineEnd: 0,
        width: RAIL_WIDTH,
        maxWidth: "85vw",
        overflowY: "auto",
        padding: 20,
        boxSizing: "border-box",
        background: "var(--neutral-primary)",
        borderInlineStart: "1px solid var(--border-default)",
        zIndex,
      }}
    >
      {/* Notifications */}
      <SectionTitle title={t("notifications")} />
      {notifications.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("noNotifications")} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {notifications.map((n) => {
            const tone = TONE_STYLE[n.tone];
            return (
              <div
                key={n.key}
                onClick={() => navigate(n.to)}
                style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    flexShrink: 0,
                    background: tone.bg,
                    color: tone.fg,
                  }}
                >
                  {n.icon}
                </span>
                <Text style={{ fontSize: 12.5, color: "var(--fg-body)", lineHeight: 1.45 }}>
                  {n.text}
                </Text>
              </div>
            );
          })}
        </div>
      )}

      {/* Activités récentes (journal d'audit) */}
      {canAudit && (
        <div style={{ marginBlockStart: 28 }}>
          <SectionTitle
            title={t("recentActivity")}
            action={
              <Button
                type="link"
                size="small"
                style={{ padding: 0 }}
                onClick={() => navigate("/audit")}
              >
                {t("viewAll")}
              </Button>
            }
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {(activities ?? []).slice(0, 6).map((a, i) => (
              <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Avatar
                  size={26}
                  style={{
                    background: AVATAR_TONES[i % AVATAR_TONES.length],
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                >
                  {(a.userEmail ?? a.entity).charAt(0).toUpperCase()}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <Text
                    style={{
                      fontSize: 12.5,
                      color: "var(--fg-body)",
                      display: "block",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {a.action} · {a.entity}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: "var(--fg-body-subtle)" }}>
                    {relativeTime(a.createdAt, i18n.language)}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
