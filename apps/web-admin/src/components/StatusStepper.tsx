import { Steps, Typography } from "antd";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

export interface StatusStepperStep {
  key: string;
  label: string;
  /** ISO date string (or Date) once this step was reached — undefined/null = not reached yet. */
  at?: string | Date | null;
  /** Display name of who performed this transition, already resolved — null/undefined = untracked. */
  actor?: string | null;
  /** Renders this step in the danger color (e.g. Rejected/Cancelled) instead of the default flow color. */
  isTerminalNegative?: boolean;
}

/**
 * Historique de statut générique (commande, achat, transfert…) : une étape
 * par transition possible, "atteinte" dès que sa date est renseignée. Les
 * étapes non atteintes restent grisées — permet d'afficher un flux dont
 * certaines transitions n'ont pas (encore) de traçage acteur/date en base.
 */
export function StatusStepper({ steps }: { steps: StatusStepperStep[] }) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const reachedCount = steps.filter((s) => s.at).length;
  const hasNegative = steps.some((s) => s.isTerminalNegative && s.at);

  return (
    <Steps
      direction="vertical"
      size="small"
      current={hasNegative ? reachedCount : Math.max(0, reachedCount - 1)}
      items={steps.map((s) => ({
        title: s.label,
        status: s.at ? (s.isTerminalNegative ? "error" : "finish") : "wait",
        description: s.at ? (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {new Date(s.at).toLocaleString(isRtl ? "ar" : "en-GB")}
            </Text>
            {s.actor && (
              <>
                {" — "}
                <Text style={{ fontSize: 12 }}>{s.actor}</Text>
              </>
            )}
          </div>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("stepPending")}
          </Text>
        ),
      }))}
    />
  );
}
