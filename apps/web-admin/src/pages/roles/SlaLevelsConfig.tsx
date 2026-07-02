import { useState } from "react";
import { Button, Card, Input, InputNumber, Space, Switch, Typography, message } from "antd";
import { RocketOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { slaLevelsApi } from "../../lib/api";
import { SLA_COLORS, type SlaLevel } from "./shared";

const { Text } = Typography;

interface Props {
  companyId: string;
}

/**
 * Personnalisation des niveaux SLA de l'entreprise : libellés bilingues,
 * durée cible (minutes) et activation par niveau (P1..P5).
 */
export function SlaLevelsConfig({ companyId }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: levels, isPending } = useQuery({
    queryKey: ["sla-levels", companyId],
    queryFn: () => slaLevelsApi.list(companyId).then((r) => r.data as SlaLevel[]),
  });

  // État dérivé synchronisé pendant le rendu (pas de setState dans un effect) :
  // le brouillon est réinitialisé quand la réponse serveur change
  const [draftState, setDraftState] = useState<{
    source: SlaLevel[] | undefined;
    draft: SlaLevel[];
  }>({ source: undefined, draft: [] });
  if (levels && draftState.source !== levels) {
    setDraftState({ source: levels, draft: levels.map((l) => ({ ...l })) });
  }
  const draft = draftState.draft;
  const setDraft = (updater: (prev: SlaLevel[]) => SlaLevel[]) =>
    setDraftState((prev) => ({ ...prev, draft: updater(prev.draft) }));

  function patchLevel(code: string, patch: Partial<SlaLevel>) {
    setDraft((prev) => prev.map((l) => (l.code === code ? { ...l, ...patch } : l)));
  }

  async function handleSave() {
    if (!draft.some((l) => l.active)) {
      void message.warning(t("slaAtLeastOneActive"));
      return;
    }
    setSaving(true);
    try {
      await slaLevelsApi.save(
        companyId,
        draft.map((l) => ({
          code: l.code,
          nameAr: l.nameAr ?? undefined,
          nameEn: l.nameEn ?? undefined,
          targetMinutes: l.targetMinutes,
          active: l.active,
        })),
      );
      void qc.invalidateQueries({ queryKey: ["sla-levels", companyId] });
      void message.success(t("slaLevelsSaved"));
    } catch {
      void message.error(t("errorOccurred"));
    } finally {
      setSaving(false);
    }
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
        <Button size="small" type="primary" loading={saving} onClick={() => void handleSave()}>
          {t("save")}
        </Button>
      }
      style={{ marginBlockEnd: 16 }}
    >
      <Text type="secondary" style={{ display: "block", marginBlockEnd: 12, fontSize: 12 }}>
        {t("slaLevelsHint")}
      </Text>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {draft.map((level) => (
          <div
            key={level.code}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              opacity: level.active ? 1 : 0.5,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                minInlineSize: 52,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  inlineSize: 10,
                  blockSize: 10,
                  borderRadius: "50%",
                  background: SLA_COLORS[level.code],
                }}
              />
              {level.code}
            </span>
            <Input
              size="small"
              dir="rtl"
              placeholder={t("slaLevelNameAr")}
              value={level.nameAr ?? ""}
              onChange={(e) => patchLevel(level.code, { nameAr: e.target.value })}
              style={{ inlineSize: 160 }}
            />
            <Input
              size="small"
              dir="ltr"
              placeholder={t("slaLevelNameEn")}
              value={level.nameEn ?? ""}
              onChange={(e) => patchLevel(level.code, { nameEn: e.target.value })}
              style={{ inlineSize: 160 }}
            />
            <InputNumber
              size="small"
              min={1}
              value={level.targetMinutes}
              onChange={(v) => patchLevel(level.code, { targetMinutes: v ?? 1 })}
              addonAfter={t("minutes")}
              style={{ inlineSize: 130 }}
            />
            <Switch
              size="small"
              checked={level.active}
              onChange={(v) => patchLevel(level.code, { active: v })}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
