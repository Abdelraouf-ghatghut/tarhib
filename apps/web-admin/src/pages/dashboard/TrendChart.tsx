import { Typography } from "antd";

const { Text } = Typography;

function niceMax(v: number): number {
  if (v <= 10) return 10;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Courbe commandes (aire dégradée) + conformité SLA en pointillés, SVG sans dépendance. */
export function TrendChart({
  labels,
  orders,
  sla,
}: {
  labels: string[];
  orders: number[];
  sla: Array<number | null>;
}) {
  const W = 720;
  const H = 210;
  const PAD = { top: 12, bottom: 8, left: 40, right: 36 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const yMax = niceMax(Math.max(...orders, 1));
  const x = (i: number) =>
    PAD.left + (labels.length === 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const yOrders = (v: number) => PAD.top + ih - (v / yMax) * ih;
  const ySla = (v: number) => PAD.top + ih - (v / 100) * ih;

  const orderPts = orders.map((v, i) => [x(i), yOrders(v)] as [number, number]);
  const slaPts = sla
    .map((v, i) => (v === null ? null : ([x(i), ySla(v)] as [number, number])))
    .filter((p): p is [number, number] => p !== null);
  const line = smoothPath(orderPts);
  const area =
    orderPts.length >= 2
      ? `${line} L ${orderPts[orderPts.length - 1][0]},${PAD.top + ih} L ${orderPts[0][0]},${PAD.top + ih} Z`
      : "";

  const gridYs = [0, 0.25, 0.5, 0.75, 1];

  // Les graphiques restent LTR même en RTL (convention charts)
  return (
    <div dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--brand)", stopOpacity: 0.22 }} />
            <stop offset="100%" style={{ stopColor: "var(--brand)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {gridYs.map((g) => (
          <line
            key={g}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + ih * g}
            y2={PAD.top + ih * g}
            stroke="var(--border-default-medium)"
            strokeWidth={1}
          />
        ))}
        {gridYs.map((g) => (
          <text
            key={`l${g}`}
            x={PAD.left - 8}
            y={PAD.top + ih * g + 4}
            textAnchor="end"
            style={{ fontSize: 11, fill: "var(--fg-body-subtle)" }}
          >
            {Math.round(yMax * (1 - g))}
          </text>
        ))}
        {[0, 50, 100].map((v) => (
          <text
            key={`r${v}`}
            x={W - PAD.right + 8}
            y={ySla(v) + 4}
            textAnchor="start"
            style={{ fontSize: 11, fill: "var(--fg-body-subtle)" }}
          >
            {v}%
          </text>
        ))}
        {area && <path d={area} fill="url(#ordersFill)" />}
        {line && (
          <path
            d={line}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}
        {slaPts.length >= 2 && (
          <path
            d={smoothPath(slaPts)}
            fill="none"
            stroke="var(--sky)"
            strokeWidth={2}
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          paddingInline: `${PAD.left}px ${PAD.right}px`,
          marginBlockStart: 4,
        }}
      >
        {labels.map((m, i) => (
          <Text key={`${m}-${i}`} style={{ fontSize: 11, color: "var(--fg-body-subtle)" }}>
            {m}
          </Text>
        ))}
      </div>
    </div>
  );
}

export function LegendDot({
  color,
  dashed,
  label,
}: {
  color: string;
  dashed?: boolean;
  label: string;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 16,
          height: 0,
          borderTop: `2.5px ${dashed ? "dashed" : "solid"} ${color}`,
          borderRadius: 2,
        }}
      />
      <Text style={{ fontSize: 12, color: "var(--fg-body)" }}>{label}</Text>
    </span>
  );
}
