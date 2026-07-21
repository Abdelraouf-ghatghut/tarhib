import { Card, Col, Progress, Row, Statistic, Table } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { reportingApi } from "../../../lib/api";
import type { QuotaReport } from "../types";
import { useReportLookups } from "../useReportLookups";

export function QuotasReportTab({
  params,
  filterCompanyId,
}: {
  params: Record<string, string>;
  filterCompanyId: string | undefined;
}) {
  const { t } = useTranslation();
  const { productName, employeeName } = useReportLookups(filterCompanyId);

  const { data: quotaData, isPending: loadingQuota } = useQuery({
    queryKey: ["reports", "quotas", params],
    queryFn: () => reportingApi.quotas(params).then((r) => r.data as QuotaReport),
  });

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col xs={24} sm={8}>
          <Card loading={loadingQuota}>
            <Statistic
              title={t("quotaAverageConsumption")}
              value={(quotaData?.averageConsumptionRate ?? 0) * 100}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loadingQuota}>
            <Statistic title={t("quotaTotal")} value={quotaData?.total ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loadingQuota}>
            <Statistic
              title={t("quotaNearCap")}
              value={quotaData?.nearCapCount ?? 0}
              valueStyle={
                (quotaData?.nearCapCount ?? 0) > 0 ? { color: "var(--fg-danger)" } : undefined
              }
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card title={t("quotaConsumptionByProduct")} loading={loadingQuota}>
            <Table
              rowKey="productId"
              dataSource={quotaData?.byProduct ?? []}
              pagination={false}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                { title: t("product"), dataIndex: "productId", render: productName },
                { title: t("maxQuantity"), dataIndex: "maxQuantity" },
                { title: t("usedQuantity"), dataIndex: "usedQuantity" },
                {
                  title: t("quotaConsumption"),
                  dataIndex: "consumptionRate",
                  render: (v: number) => (
                    <Progress
                      percent={Math.round(v * 100)}
                      size="small"
                      status={v >= 0.8 ? "exception" : "normal"}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title={t("quotaNearCapEmployees")} loading={loadingQuota}>
            <Table
              rowKey={(r) => `${r.employeeId}-${r.productId}`}
              dataSource={quotaData?.nearCapEmployees ?? []}
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                { title: t("employee"), dataIndex: "employeeId", render: employeeName },
                { title: t("product"), dataIndex: "productId", render: productName },
                {
                  title: t("quotaConsumption"),
                  dataIndex: "consumptionRate",
                  render: (v: number) => `${Math.round(v * 100)}%`,
                },
                { title: t("period"), dataIndex: "periodEnd" },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
