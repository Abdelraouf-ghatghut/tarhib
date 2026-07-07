import type { ReactNode } from "react";
import { useState } from "react";
import { Badge, Button, Drawer, Input, Space, Tag } from "antd";
import { FilterOutlined, SearchOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

export interface QuickFilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  /** Recherche libre optionnelle (barre à gauche). */
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  /** Filtres rapides en chips — un seul actif à la fois (ex. statut). */
  quickFilters?: {
    active: string;
    options: QuickFilterOption[];
    onChange: (v: string) => void;
  };
  /** Contenu du tiroir de filtres détaillés (ouvert à droite). */
  advanced?: ReactNode;
  /** Nombre de filtres détaillés actifs — affiché en badge sur le bouton. */
  activeAdvancedCount?: number;
  /** Réinitialise tous les filtres. */
  onClearAll?: () => void;
}

/**
 * Barre de filtres cohérente : recherche + chips de filtrage rapide, plus un
 * bouton « Filtres » qui ouvre un tiroir à droite (même pattern visuel que la
 * fiche détail d'un rôle) pour un filtrage plus fin. Réutilisable sur toutes
 * les pages listant des données filtrables.
 */
export function FilterBar({
  search,
  quickFilters,
  advanced,
  activeAdvancedCount = 0,
  onClearAll,
}: FilterBarProps) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
        marginBlockEnd: 20,
      }}
    >
      {search && (
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: "var(--fg-body-subtle)" }} />}
          placeholder={search.placeholder ?? t("search")}
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          style={{ maxInlineSize: 240 }}
        />
      )}

      {quickFilters && (
        <Space size={4} wrap>
          {quickFilters.options.map((o) => (
            <Tag.CheckableTag
              key={o.value}
              checked={quickFilters.active === o.value}
              onChange={() => quickFilters.onChange(o.value)}
              style={{ paddingInline: 12, paddingBlock: 2, borderRadius: 16, fontSize: 13 }}
            >
              {o.label}
            </Tag.CheckableTag>
          ))}
        </Space>
      )}

      {advanced && (
        <Badge count={activeAdvancedCount} size="small">
          <Button icon={<FilterOutlined />} onClick={() => setDrawerOpen(true)}>
            {t("filters")}
          </Button>
        </Badge>
      )}

      {onClearAll && activeAdvancedCount > 0 && (
        <Button type="text" onClick={onClearAll}>
          {t("audit.reset")}
        </Button>
      )}

      {advanced && (
        <Drawer
          title={t("filters")}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={360}
          extra={
            onClearAll && (
              <Button type="text" onClick={onClearAll}>
                {t("audit.reset")}
              </Button>
            )
          }
        >
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {advanced}
          </Space>
        </Drawer>
      )}
    </div>
  );
}
