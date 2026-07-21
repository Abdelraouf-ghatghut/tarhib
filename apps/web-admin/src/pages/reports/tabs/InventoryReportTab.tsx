import { useState } from "react";
import { Card, Col, Row, Select, Space, Statistic, Switch, Table } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { reportingApi } from "../../../lib/api";
import type { InventoryDetailReport, InventoryReport } from "../types";
import { useReportLookups } from "../useReportLookups";

export function InventoryReportTab({
  params,
  filterCompanyId,
  canViewCosts,
}: {
  params: Record<string, string>;
  filterCompanyId: string | undefined;
  canViewCosts: boolean;
}) {
  const { t } = useTranslation();
  const { productsList, productName, branchName } = useReportLookups(filterCompanyId);

  const { data: inventoryData, isPending: loadingInv } = useQuery({
    queryKey: ["reports", "inventory", params],
    queryFn: () => reportingApi.inventory(params).then((r) => r.data as InventoryReport),
  });

  // Filtres propres à l'onglet stock — locaux à l'onglet, pour ne pas
  // surcharger la page avec le détail complet par emplacement.
  const [invProductId, setInvProductId] = useState<string | undefined>();
  const [invZone, setInvZone] = useState<string | undefined>();
  const [invBelowThresholdOnly, setInvBelowThresholdOnly] = useState(false);

  const inventoryDetailParams = {
    ...params,
    ...(invProductId ? { productId: invProductId } : {}),
    ...(invZone ? { zone: invZone } : {}),
    ...(invBelowThresholdOnly ? { belowThresholdOnly: "true" } : {}),
  };

  const { data: inventoryDetailData, isPending: loadingInvDetail } = useQuery({
    queryKey: ["reports", "inventory-detail", inventoryDetailParams],
    queryFn: () =>
      reportingApi
        .inventoryDetail(inventoryDetailParams)
        .then((r) => r.data as InventoryDetailReport),
    enabled: canViewCosts,
  });

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col xs={24} sm={8}>
          <Card loading={loadingInv}>
            <Statistic title={t("totalItems")} value={inventoryData?.total ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loadingInv}>
            <Statistic
              title={t("restockAlert")}
              value={inventoryData?.belowThreshold ?? 0}
              valueStyle={
                inventoryData?.belowThreshold ? { color: "var(--fg-warning-subtle)" } : undefined
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loadingInv}>
            <Statistic
              title={t("outOfStock")}
              value={inventoryData?.outOfStock ?? 0}
              valueStyle={inventoryData?.outOfStock ? { color: "var(--fg-danger)" } : undefined}
            />
          </Card>
        </Col>
      </Row>

      {canViewCosts && (
        <>
          {/* Filtres propres au détail stock — évitent de charger tout le
              détail par emplacement d'un coup. */}
          <Space wrap style={{ marginBlockEnd: 16 }}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t("product")}
              style={{ minWidth: 200 }}
              value={invProductId}
              onChange={setInvProductId}
              options={productsList.map((p) => ({ value: p.id, label: productName(p.id) }))}
            />
            <Select
              allowClear
              placeholder={t("zone")}
              style={{ minWidth: 160 }}
              value={invZone}
              onChange={setInvZone}
              options={["CENTRAL", "BRANCH", "KITCHEN"].map((z) => ({
                value: z,
                label: t(`zone_${z}`),
              }))}
            />
            <Space size={8}>
              <Switch checked={invBelowThresholdOnly} onChange={setInvBelowThresholdOnly} />
              <span>{t("belowThresholdOnly")}</span>
            </Space>
          </Space>

          <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
            <Col xs={24} sm={8}>
              <Card loading={loadingInvDetail}>
                <Statistic
                  title={t("totalStockValue")}
                  value={inventoryDetailData?.totalStockValue ?? 0}
                  precision={2}
                  suffix={t("currencyUnit")}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Card title={t("quantityByProduct")} loading={loadingInvDetail}>
                <Table
                  rowKey="productId"
                  dataSource={inventoryDetailData?.byProduct ?? []}
                  pagination={{ pageSize: 10 }}
                  size="small"
                  scroll={{ x: "max-content" }}
                  columns={[
                    { title: t("product"), dataIndex: "productId", render: productName },
                    { title: t("quantity"), dataIndex: "quantity" },
                    {
                      title: t("totalStockValue"),
                      dataIndex: "stockValue",
                      render: (v: number) => v.toFixed(2),
                    },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card title={t("quantityByProductBranch")} loading={loadingInvDetail}>
                <Table
                  rowKey={(r) => `${r.productId}-${r.branchId}`}
                  dataSource={inventoryDetailData?.byProductBranch ?? []}
                  pagination={{ pageSize: 10 }}
                  size="small"
                  scroll={{ x: "max-content" }}
                  columns={[
                    { title: t("product"), dataIndex: "productId", render: productName },
                    { title: t("branch"), dataIndex: "branchId", render: branchName },
                    { title: t("quantity"), dataIndex: "quantity" },
                    {
                      title: t("totalStockValue"),
                      dataIndex: "stockValue",
                      render: (v: number) => v.toFixed(2),
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBlockStart: 16 }}>
            <Col span={24}>
              <Card title={t("stockDetailByLocation")} loading={loadingInvDetail}>
                <Table
                  rowKey={(r) => `${r.productId}-${r.branchId}-${r.zone}-${r.locationName ?? ""}`}
                  dataSource={inventoryDetailData?.rows ?? []}
                  pagination={{ pageSize: 10 }}
                  size="small"
                  scroll={{ x: "max-content" }}
                  columns={[
                    { title: t("product"), dataIndex: "productId", render: productName },
                    { title: t("branch"), dataIndex: "branchId", render: branchName },
                    {
                      title: t("zone"),
                      dataIndex: "zone",
                      render: (v: string) => t(`zone_${v}`),
                    },
                    {
                      title: t("locationName"),
                      dataIndex: "locationName",
                      render: (v: string | null) => v ?? "—",
                    },
                    { title: t("quantity"), dataIndex: "quantity" },
                    { title: t("minLevel"), dataIndex: "minThreshold" },
                    {
                      title: t("maxLevel"),
                      dataIndex: "maxThreshold",
                      render: (v: number | null) => v ?? "—",
                    },
                    {
                      title: t("unitCost"),
                      dataIndex: "unitCost",
                      render: (v: number | null) => (v != null ? v.toFixed(2) : "—"),
                    },
                    {
                      title: t("totalStockValue"),
                      dataIndex: "stockValue",
                      render: (v: number) => v.toFixed(2),
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </>
  );
}
