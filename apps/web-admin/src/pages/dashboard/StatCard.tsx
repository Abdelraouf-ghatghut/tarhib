import type { ReactNode } from "react";
import { Card, Typography } from "antd";
import { RiseOutlined, FallOutlined } from "@ant-design/icons";
import type { DeltaInfo } from "./deltaInfo";

const { Text } = Typography;

export function StatCard({
  tone,
  icon,
  title,
  value,
  delta,
  deltaLabel,
}: {
  tone: "brand" | "danger" | "success" | "violet";
  icon: ReactNode;
  title: string;
  value: string;
  delta: DeltaInfo | null;
  deltaLabel: string;
}) {
  return (
    <Card className={`stat-card stat-card--${tone}`} variant="borderless">
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span className={`stat-icon stat-icon--${tone}`}>{icon}</span>
        <div>
          <Text style={{ fontSize: 13, color: "var(--fg-body)" }}>{title}</Text>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--fg-heading)",
              lineHeight: 1.15,
            }}
          >
            {value}
          </div>
        </div>
      </div>
      <div style={{ marginBlockStart: 12, display: "flex", alignItems: "center", gap: 6 }}>
        {delta === null ? (
          <Text style={{ fontSize: 12, color: "var(--fg-body-subtle)" }}>—</Text>
        ) : (
          <Text
            strong
            style={{ fontSize: 12, color: delta.up ? "var(--fg-success)" : "var(--fg-danger)" }}
          >
            {delta.up ? <RiseOutlined /> : <FallOutlined />} {delta.text}
          </Text>
        )}
        <Text style={{ fontSize: 12, color: "var(--fg-body-subtle)" }}>{deltaLabel}</Text>
      </div>
    </Card>
  );
}
