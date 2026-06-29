import { useState } from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import { meetingRoomsAdminApi, branchesApi, companiesApi } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

const { Title } = Typography;

interface MeetingRoom {
  id: string;
  nameAr: string;
  nameEn: string;
  branchId: string;
  companyId: string;
  capacity: number;
  amenities: Record<string, unknown> | null;
  active: boolean;
}

interface Booking {
  id: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface NamedEntity {
  id: string;
  nameAr: string;
  nameEn: string;
}

export function MeetingRoomsAdminPage() {
  const { t, i18n } = useTranslation();
  const { companyId: authCompanyId, isSuperadmin } = useAuth();
  const qc = useQueryClient();
  const isAr = i18n.language === "ar";

  const [viewRoom, setViewRoom] = useState<MeetingRoom | null>(null);
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>(
    isSuperadmin ? undefined : (authCompanyId ?? undefined),
  );

  const { data, isPending } = useQuery({
    queryKey: ["meeting-rooms-admin", filterCompanyId],
    queryFn: () => meetingRoomsAdminApi.list(filterCompanyId).then((r) => r.data as MeetingRoom[]),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as NamedEntity[]),
    enabled: isSuperadmin,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list().then((r) => r.data as NamedEntity[]),
  });

  const { data: bookings } = useQuery({
    queryKey: ["room-bookings", viewRoom?.id],
    queryFn: () => meetingRoomsAdminApi.getBookings(viewRoom!.id).then((r) => r.data as Booking[]),
    enabled: !!viewRoom,
  });

  async function onSave(values: Record<string, unknown>, id?: string) {
    try {
      if (id) await meetingRoomsAdminApi.update(id, values);
      else await meetingRoomsAdminApi.create(values);
      void qc.invalidateQueries({ queryKey: ["meeting-rooms-admin"] });
    } catch (err) {
      void message.error(String(err));
    }
  }

  async function onDelete(id: string) {
    await meetingRoomsAdminApi.remove(id);
    void qc.invalidateQueries({ queryKey: ["meeting-rooms-admin"] });
  }

  const label = (e: NamedEntity) => (isAr ? e.nameAr : e.nameEn);
  const branchName = (id: string) => {
    const b = branches.find((x) => x.id === id);
    return b ? label(b) : id.slice(0, 8);
  };

  return (
    <>
      <Title level={4}>{t("meetingRoomsAdmin")}</Title>

      {isSuperadmin && (
        <Space wrap style={{ marginBlockEnd: 16 }}>
          <Select
            allowClear
            placeholder={t("filterByCompany")}
            style={{ minWidth: 200 }}
            value={filterCompanyId}
            onChange={setFilterCompanyId}
            options={companies.map((c) => ({ value: c.id, label: label(c) }))}
          />
        </Space>
      )}

      <CrudTable<MeetingRoom>
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        extraActions={(rec) => (
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setViewRoom(rec)}
            title={t("bookings")}
          />
        )}
        columns={[
          {
            title: isAr ? t("nameAr") : t("nameEn"),
            key: "name",
            render: (_, r) => (isAr ? r.nameAr : r.nameEn),
          },
          { title: t("branch"), dataIndex: "branchId", render: branchName },
          { title: t("capacity"), dataIndex: "capacity" },
          {
            title: t("active"),
            dataIndex: "active",
            render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "✓" : "✗"}</Tag>,
            width: 80,
          },
        ]}
        formContent={() => (
          <>
            <Form.Item name="nameAr" label={t("nameAr")} rules={[{ required: true }]}>
              <Input dir="rtl" />
            </Form.Item>
            <Form.Item name="nameEn" label={t("nameEn")} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
              <Select
                options={companies.map((c) => ({ value: c.id, label: label(c) }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item name="branchId" label={t("branch")} rules={[{ required: true }]}>
              <Select
                options={branches.map((b) => ({ value: b.id, label: label(b) }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item name="capacity" label={t("capacity")} initialValue={10}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
          </>
        )}
      />

      <Drawer
        open={!!viewRoom}
        onClose={() => setViewRoom(null)}
        title={viewRoom ? `${t("bookings")} — ${isAr ? viewRoom.nameAr : viewRoom.nameEn}` : ""}
        width={520}
      >
        <Table<Booking>
          rowKey="id"
          dataSource={bookings}
          size="small"
          pagination={false}
          columns={[
            { title: "ID", dataIndex: "id", render: (v: string) => v.slice(0, 8) },
            {
              title: t("startTime"),
              dataIndex: "startTime",
              render: (v: string) => v.slice(0, 16),
            },
            {
              title: t("endTime"),
              dataIndex: "endTime",
              render: (v: string) => v.slice(0, 16),
            },
            {
              title: t("status"),
              dataIndex: "status",
              render: (v: string) => (
                <Tag color={v === "CONFIRMED" ? "green" : v === "CANCELLED" ? "red" : "default"}>
                  {v}
                </Tag>
              ),
            },
          ]}
        />
      </Drawer>
    </>
  );
}
