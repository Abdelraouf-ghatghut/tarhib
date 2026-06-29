import {
  Card,
  Col,
  DatePicker,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { companiesApi, branchesApi, reportingApi } from "../../lib/api";

import { useAuth } from "../../hooks/useAuth";

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface OrdersReport {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

interface InventoryReport {
  total: number;
  belowThreshold: number;
  outOfStock: number;
}

interface SlaReport {
  total: number;
  onTime: number;
  late: number;
  complianceRate: number;
}

interface UserActivityReport {
  total: number;
  topEmployees: { employeeId: string; orderCount: number }[];
  ordersByBranch: { branchId: string; orderCount: number }[];
}

interface MeetingRoomsReport {
  totalBookings: number;
  confirmed: number;
  cancelled: number;
  cancellationRate: number;
  mostBookedRoomId: string | null;
  avgDurationMinutes: number;
}

interface Company {
  id: string;
  nameAr: string;
  nameEn: string;
}
interface Branch {
  id: string;
  nameAr: string;
  nameEn: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "orange",
  APPROVED: "blue",
  IN_PROGRESS: "processing",
  DELIVERED: "green",
  REJECTED: "red",
};

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const { companyId: authCompanyId, isSuperadmin } = useAuth();

  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>(
    isSuperadmin ? undefined : (authCompanyId ?? undefined),
  );
  const [filterBranchId, setFilterBranchId] = useState<string | undefined>(undefined);

  const params = {
    ...(filterCompanyId ? { companyId: filterCompanyId } : {}),
    ...(filterBranchId ? { branchId: filterBranchId } : {}),
    ...(dateRange ? { from: dateRange[0], to: dateRange[1] } : {}),
  };

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as Company[]),
    enabled: isSuperadmin,
  });

  const { data: branches } = useQuery({
    queryKey: ["branches", filterCompanyId],
    queryFn: () => branchesApi.list(filterCompanyId).then((r) => r.data as Branch[]),
    enabled: !!filterCompanyId,
  });

  const { data: ordersData, isPending: loadingOrders } = useQuery({
    queryKey: ["reports", "orders", params],
    queryFn: () =>
      reportingApi.orders(params as Record<string, string>).then((r) => r.data as OrdersReport),
  });

  const { data: slaData, isPending: loadingSla } = useQuery({
    queryKey: ["reports", "sla", params],
    queryFn: () =>
      reportingApi.sla(params as Record<string, string>).then((r) => r.data as SlaReport),
  });

  const { data: inventoryData, isPending: loadingInv } = useQuery({
    queryKey: ["reports", "inventory", params],
    queryFn: () =>
      reportingApi
        .inventory(params as Record<string, string>)
        .then((r) => r.data as InventoryReport),
  });

  const { data: activityData, isPending: loadingActivity } = useQuery({
    queryKey: ["reports", "user-activity", params],
    queryFn: () =>
      reportingApi
        .userActivity(params as Record<string, string>)
        .then((r) => r.data as UserActivityReport),
  });

  const { data: meetingData, isPending: loadingMeeting } = useQuery({
    queryKey: ["reports", "meeting-rooms", params],
    queryFn: () =>
      reportingApi
        .meetingRooms(params as Record<string, string>)
        .then((r) => r.data as MeetingRoomsReport),
  });

  const complianceRate = Math.round(slaData?.complianceRate ?? 0);

  const filters = (
    <Space wrap style={{ marginBlockEnd: 24 }}>
      {isSuperadmin && (
        <Select
          allowClear
          placeholder={t("filterByCompany")}
          style={{ minWidth: 200 }}
          value={filterCompanyId}
          onChange={(v) => {
            setFilterCompanyId(v);
            setFilterBranchId(undefined);
          }}
          options={companies?.map((c) => ({
            value: c.id,
            label: i18n.language === "ar" ? c.nameAr : c.nameEn,
          }))}
        />
      )}
      <Select
        allowClear
        placeholder={t("filterByBranch")}
        style={{ minWidth: 180 }}
        value={filterBranchId}
        onChange={setFilterBranchId}
        options={branches?.map((b) => ({
          value: b.id,
          label: i18n.language === "ar" ? b.nameAr : b.nameEn,
        }))}
        disabled={!filterCompanyId}
      />
      <RangePicker onChange={(_, s) => setDateRange(s[0] && s[1] ? [s[0], s[1]] : null)} />
    </Space>
  );

  const ordersTab = (
    <>
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 24 }}>
        <Col xs={24} sm={8}>
          <Card loading={loadingOrders}>
            <Statistic title={t("totalOrders")} value={ordersData?.total ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loadingSla}>
            <Statistic
              title={t("onTime")}
              value={slaData?.onTime ?? 0}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loadingSla}>
            <Statistic
              title={t("late")}
              value={slaData?.late ?? 0}
              valueStyle={slaData?.late ? { color: "#cf1322" } : undefined}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card title={t("status")} loading={loadingOrders}>
            <Space wrap>
              {Object.entries(ordersData?.byStatus ?? {}).map(([s, c]) => (
                <Tag color={STATUS_COLORS[s] ?? "default"} key={s}>
                  {s}: {c}
                </Tag>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title={t("complianceRate")} loading={loadingSla}>
            <Progress
              type="circle"
              percent={complianceRate}
              size={100}
              strokeColor={
                complianceRate >= 90 ? "#52c41a" : complianceRate >= 70 ? "#faad14" : "#cf1322"
              }
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  const inventoryTab = (
    <Row gutter={[16, 16]}>
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
            valueStyle={inventoryData?.belowThreshold ? { color: "#faad14" } : undefined}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card loading={loadingInv}>
          <Statistic
            title={t("outOfStock")}
            value={inventoryData?.outOfStock ?? 0}
            valueStyle={inventoryData?.outOfStock ? { color: "#cf1322" } : undefined}
          />
        </Card>
      </Col>
    </Row>
  );

  const activityTab = (
    <>
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col xs={24} sm={8}>
          <Card loading={loadingActivity}>
            <Statistic title={t("totalOrders")} value={activityData?.total ?? 0} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card title={t("topEmployees")} loading={loadingActivity}>
            <Table
              rowKey="employeeId"
              dataSource={activityData?.topEmployees ?? []}
              pagination={false}
              size="small"
              columns={[
                { title: "ID", dataIndex: "employeeId", render: (v: string) => v.slice(0, 8) },
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
              columns={[
                { title: "ID", dataIndex: "branchId", render: (v: string) => v.slice(0, 8) },
                { title: t("totalOrders"), dataIndex: "orderCount" },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  const meetingTab = (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={8}>
        <Card loading={loadingMeeting}>
          <Statistic title={t("totalBookings")} value={meetingData?.totalBookings ?? 0} />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card loading={loadingMeeting}>
          <Statistic
            title={t("cancellationRate")}
            value={meetingData?.cancellationRate ?? 0}
            suffix="%"
            valueStyle={meetingData?.cancellationRate ? { color: "#faad14" } : undefined}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card loading={loadingMeeting}>
          <Statistic
            title={t("avgDuration")}
            value={meetingData?.avgDurationMinutes ?? 0}
            suffix={t("minutes")}
          />
        </Card>
      </Col>
    </Row>
  );

  return (
    <>
      <Title level={4}>{t("reports")}</Title>
      {filters}
      <Tabs
        items={[
          { key: "orders", label: t("ordersReport"), children: ordersTab },
          { key: "inventory", label: t("inventoryReport"), children: inventoryTab },
          { key: "activity", label: t("activityReport"), children: activityTab },
          { key: "meeting-rooms", label: t("meetingRoomsReport"), children: meetingTab },
        ]}
      />
    </>
  );
}
