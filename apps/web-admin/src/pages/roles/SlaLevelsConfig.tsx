import { useState } from "react";
import {
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, RocketOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { AxiosError } from "axios";
import { slaLevelsApi } from "../../lib/api";
import { slaColor, type SlaLevel } from "./shared";

const { Text } = Typography;

interface Props {
  companyId: string;
}

type DraftLevel = Omit<SlaLevel, "sortOrder" | "isDefault">;

/**
 * Niveaux de priorité de l'entreprise. 3 niveaux par défaut (P1/P2/P3) sont
 * créés automatiquement à la première consultation ; l'admin peut ensuite
 * les modifier, en ajouter ou en retirer librement. Affichage en lecture
 * seule ; l'édition ne s'active qu'au clic sur « Modifier ».
 */
export function SlaLevelsConfig({ companyId }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraftList] = useState<DraftLevel[]>([]);

  const { data: levels, isPending } = useQuery({
    queryKey: ["sla-levels", companyId],
    queryFn: () => slaLevelsApi.list(companyId).then((r) => r.data as SlaLevel[]),
  });

  const setDraft = (updater: (prev: DraftLevel[]) => DraftLevel[]) =>
    setDraftList((prev) => updater(prev));

  function startEditing() {
    setDraftList((levels ?? []).map((l) => ({ ...l })));
    setEditing(true);
  }

  function cancelEditing() {
    setDraftList([]);
    setEditing(false);
  }

  function patchLevel(index: number, patch: Partial<DraftLevel>) {
    setDraft((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLevel() {
    setDraft((prev) => [
      ...prev,
      { code: "", nameAr: null, nameEn: null, targetMinutes: 30, active: true },
    ]);
  }

  function removeLevel(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const codes = draft.map((l) => l.code.trim());
    if (codes.some((c) => !c)) {
      void message.warning(t("slaCodeRequired"));
      return;
    }
    if (new Set(codes).size !== codes.length) {
      void message.warning(t("slaCodeDuplicate"));
      return;
    }
    if (!draft.some((l) => l.active)) {
      void message.warning(t("slaAtLeastOneActive"));
      return;
    }
    setSaving(true);
    try {
      await slaLevelsApi.save(
        companyId,
        draft.map((l, index) => ({
          code: l.code.trim(),
          nameAr: l.nameAr?.trim() || undefined,
          nameEn: l.nameEn?.trim() || undefined,
          targetMinutes: l.targetMinutes,
          active: l.active,
          sortOrder: index,
        })),
      );
      void qc.invalidateQueries({ queryKey: ["sla-levels", companyId] });
      void message.success(t("slaLevelsSaved"));
      setEditing(false);
    } catch (err) {
      const serverMsg = (err as AxiosError<{ message?: string }>).response?.data?.message;
      void message.error(
        serverMsg?.includes("referenced") ? t("slaLevelInUse") : t("errorOccurred"),
      );
    } finally {
      setSaving(false);
    }
  }

  const levelsForColor: SlaLevel[] = (editing ? draft : (levels ?? [])).map((l, i) => ({
    ...l,
    sortOrder: i,
    isDefault: false,
  }));

  function levelDisplayName(level: DraftLevel): string | null {
    const custom = isAr ? level.nameAr : level.nameEn;
    return custom?.trim() ? custom : null;
  }

  return (
    <Card
      size="small"
      loading={isPending}
      title={
        <Space>
          <RocketOutlined />
          {t("slaLevelsTitle")}
        </Space>
      }
      extra={
        editing ? (
          <Space size={8}>
            <Button size="small" onClick={cancelEditing}>
              {t("cancel")}
            </Button>
            <Button size="small" type="primary" loading={saving} onClick={() => void handleSave()}>
              {t("save")}
            </Button>
          </Space>
        ) : (
          (levels?.length ?? 0) > 0 && (
            <Button size="small" icon={<EditOutlined />} onClick={startEditing}>
              {t("edit")}
            </Button>
          )
        )
      }
      style={{ marginBlockEnd: 24 }}
    >
      <Text type="secondary" style={{ display: "block", marginBlockEnd: 16, fontSize: 13 }}>
        {t("slaLevelsHint")}
      </Text>

      {/* ── Mode lecture ─────────────────────────────────────────────────── */}
      {!editing &&
        ((levels?.length ?? 0) === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("noSlaLevels")}>
            <Button type="primary" icon={<PlusOutlined />} onClick={startEditing}>
              {t("defineSlaLevels")}
            </Button>
          </Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(levels ?? []).map((level) => (
              <div
                key={level.code}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--neutral-secondary-soft)",
                  opacity: level.active ? 1 : 0.55,
                }}
              >
                <span
                  style={{
                    inlineSize: 10,
                    blockSize: 10,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: slaColor(level.code, levelsForColor),
                  }}
                />
                <Text strong style={{ inlineSize: 90 }}>
                  {level.code}
                </Text>
                <Text style={{ flex: "1 1 160px", color: "var(--fg-body)" }}>
                  {levelDisplayName(level) ?? "—"}
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {level.targetMinutes} {t("minutes")}
                </Text>
                {!level.active && <Tag bordered={false}>{t("inactive")}</Tag>}
              </div>
            ))}
          </div>
        ))}

      {/* ── Mode édition ─────────────────────────────────────────────────── */}
      {editing && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {draft.map((level, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  padding: 8,
                  borderRadius: 8,
                  background: "var(--neutral-secondary-soft)",
                  opacity: level.active ? 1 : 0.55,
                }}
              >
                <span
                  style={{
                    inlineSize: 10,
                    blockSize: 10,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: slaColor(level.code, levelsForColor),
                  }}
                />
                <Input
                  size="small"
                  placeholder={t("slaLevelCode")}
                  value={level.code}
                  onChange={(e) => patchLevel(index, { code: e.target.value.toUpperCase() })}
                  maxLength={20}
                  style={{ inlineSize: 100, fontWeight: 600 }}
                />
                <Input
                  size="small"
                  dir="rtl"
                  placeholder={t("slaLevelNameAr")}
                  value={level.nameAr ?? ""}
                  onChange={(e) => patchLevel(index, { nameAr: e.target.value })}
                  style={{ flex: "1 1 140px" }}
                />
                <Input
                  size="small"
                  dir="ltr"
                  placeholder={t("slaLevelNameEn")}
                  value={level.nameEn ?? ""}
                  onChange={(e) => patchLevel(index, { nameEn: e.target.value })}
                  style={{ flex: "1 1 140px" }}
                />
                <InputNumber
                  size="small"
                  min={1}
                  value={level.targetMinutes}
                  onChange={(v) => patchLevel(index, { targetMinutes: v ?? 1 })}
                  addonAfter={t("minutes")}
                  style={{ inlineSize: 130 }}
                />
                <Switch
                  size="small"
                  checked={level.active}
                  onChange={(v) => patchLevel(index, { active: v })}
                />
                <Tooltip title={t("slaLevelDeleteHint")}>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeLevel(index)}
                  />
                </Tooltip>
              </div>
            ))}
          </div>
          <Button icon={<PlusOutlined />} onClick={addLevel} style={{ marginBlockStart: 16 }}>
            {t("addSlaLevel")}
          </Button>
        </>
      )}
    </Card>
  );
}
