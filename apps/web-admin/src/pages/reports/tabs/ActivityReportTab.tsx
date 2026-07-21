import { Card, Col, Row, Table } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { reportingApi } from "../../../lib/api";
import { bilingualName } from "../../../lib/bilingualName";
import type { UserActivityReport } from "../types";
import { useReportLookups } from "../useReportLookups";

export function ActivityReportTab({
  params,
  filterCompanyId,
}: {
  params: Record<string, string>;
  filterCompanyId: string | undefined;
}) {
  const { t } = useTranslation();
  const { isAr } = useReportLookups(filterCompanyId);

  const { data: activityData, isPending: loadingActivity } = useQuery({
    queryKey: ["reports", "user-activity", params],
    queryFn: () => reportingApi.userActivity(params).then((r) => r.data as UserActivityReport),
  });

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card title={t("topEmployees")} loading={loadingActivity}>
            <Table
              rowKey="employeeId"
              dataSource={activityData?.topEmployees ?? []}
              pagination={false}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                {
                  title: t("employee"),
                  dataIndex: "nameAr",
                  render: (_: string, row: { nameAr: string; nameEn: string }) =>
                    bilingualName(row.nameAr, row.nameEn, isAr),
                },
                { title: t("totalOrders"), dataIndex: "orderCount" },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title={t("ordersByBranch")} loading={loadingActivity}>
            <Table
              rowKey="branchId"
              dataSource={activityData?.ordersByBranch ?? []}
              pagination={false}
              size="small"
              scroll={{ x: "max-content" }}
              columns={[
                {
                  title: t("branch"),
                  dataIndex: "nameAr",
                  render: (_: string, row: { nameAr: string; nameEn: string }) =>
                    bilingualName(row.nameAr, row.nameEn, isAr),
                },
                { title: t("totalOrders"), dataIndex: "orderCount" },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
