import type { TFunction } from "i18next";

export function auditActionCode(action: string): string {
  return action.startsWith("IMPERSONATE") ? "IMPERSONATE" : action.split(":")[0];
}

export function auditActionLabel(action: string, t: TFunction): string {
  const code = auditActionCode(action);
  return t(`audit.action_${code}`, { defaultValue: code });
}

export function auditEntityLabel(entity: string, t: TFunction): string {
  return t(`audit.entity_${entity}`, { defaultValue: entity });
}

export function auditEventLabel(action: string, entity: string, t: TFunction): string {
  return `${auditActionLabel(action, t)} — ${auditEntityLabel(entity, t)}`;
}
