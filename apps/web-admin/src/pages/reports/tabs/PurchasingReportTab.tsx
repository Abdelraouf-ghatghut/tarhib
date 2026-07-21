import { useState } from "react";
import { Card, Col, Row, Select, Space, Statistic, Table } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { reportingApi } from "../../../lib/api";
import type { PurchasingReport } from "../types";
import { useReportLookups } from "../useReportLookups";

export function PurchasingReportTab({
  params,
  filterCompanyId,
}: {
  params: Record<string, string>;
  filterCompanyId: string | undefined;
}) {
  const { t } = useTranslation();
  const { suppliersList, productsList, supplierName, productName } =
    useReportLookups(filterCompanyId);

  // Achats : ressource Tarhib globale — companyId/branchId filtrent ici sur
  // le LIEU DE LIVRAISON du bon de commande, jamais un scope obligatoire.
  // Fournisseur/produit sont des filtres propres à cet onglet.
  const [purchasingSupplierId, setPurchasingSupplierId] = useState<string | undefined>();
  const [purchasingProductId, setPurchasingProductId] = useState<string | undefined>();

  const purchasingParams = {
    ...params,
    ...(purchasingSupplierId ? { supplierId: purchasingSupplierId } : {}),
    ...(purchasingProductId ? { productId: purchasingProductId } : {}),
  };

  const { data: purchasingData, isPending: loadingPurchasing } = useQuery({
    queryKey: ["reports", "purchasing", purchasingParams],
    queryFn: () =>
      reportingApi.purchasing(purchasingParams).then((r) => r.data as PurchasingReport),
  });

  return (
    <>
      {/* Filtres propres aux achats — fournisseur et produit, en plus des
          filtres société/branche/dates partagés ci-dessus. */}
      <Space wrap style={{ marginBlockEnd: 16 }}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t("supplier")}
          style={{ minWidth: 200 }}
          value={purchasingSupplierId}
          onChange={setPurchasingSupplierId}
          options={suppliersList.map((s) => ({ value: s.id, label: supplierName(s.id) }))}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t("product")}
          style={{ minWidth: 200 }}
          value={purchasingProductId}
          onChange={setPurchasingProductId}
          options={productsList.map((p) => ({ value: p.id, label: productName(p.id) }))}
        />
      </Space>

      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col xs={24} sm={8}>
          <Card loading={loadingPurchasing}>
            <Statistic
              title={t("totalSpend")}
              value={purchasingData?.totalSpend ?? 0}
              precision={2}
              suffix={t("currencyUnit")}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card title={t("spendByProduct")} loading={loadingPurchasing}>
            <Table
              rowKey="productId"
              dataSource={purchasingData?.byProduct ?? []}
              pagination={false}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                { title: t("product"), dataIndex: "productId", render: productName },
                { title: t("quantity"), dataIndex: "quantity" },
                {
                  title: t("totalCost"),
                  dataIndex: "totalCost",
                  render: (v: number) => v.toFixed(2),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title={t("spendBySupplier")} loading={loadingPurchasing}>
            <Table
              rowKey="supplierId"
              dataSource={purchasingData?.bySupplier ?? []}
              pagination={false}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                { title: t("supplier"), dataIndex: "supplierId", render: supplierName },
                { title: t("quantity"), dataIndex: "quantity" },
                {
                  title: t("totalCost"),
                  dataIndex: "totalCost",
                  render: (v: number) => v.toFixed(2),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginBlockStart: 16 }}>
        <Col span={24}>
          <Card title={t("spendByProductSupplier")} loading={loadingPurchasing}>
            <Table
              rowKey={(r) => `${r.productId}-${r.supplierId}`}
              dataSource={purchasingData?.byProductSupplier ?? []}
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                { title: t("product"), dataIndex: "productId", render: productName },
                { title: t("supplier"), dataIndex: "supplierId", render: supplierName },
                { title: t("quantity"), dataIndex: "quantity" },
                {
                  title: t("totalCost"),
                  dataIndex: "totalCost",
                  render: (v: number) => v.toFixed(2),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
