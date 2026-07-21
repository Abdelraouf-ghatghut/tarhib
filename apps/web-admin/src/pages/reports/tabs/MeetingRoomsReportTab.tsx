import { Card, Col, Row, Statistic } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { reportingApi, meetingRoomsAdminApi } from "../../../lib/api";
import { bilingualName } from "../../../lib/bilingualName";
import type { MeetingRoomsReport } from "../types";

interface RoomLite {
  id: string;
  nameAr: string;
  nameEn: string | null;
}

export function MeetingRoomsReportTab({
  params,
  filterCompanyId,
}: {
  params: Record<string, string>;
  filterCompanyId: string | undefined;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const { data: meetingData, isPending: loadingMeeting } = useQuery({
    queryKey: ["reports", "meeting-rooms", params],
    queryFn: () => reportingApi.meetingRooms(params).then((r) => r.data as MeetingRoomsReport),
  });

  // Résolution du nom de la salle la plus réservée — fetch local (pas dans
  // useReportLookups partagé) pour ne pas imposer cette requête aux onglets
  // qui n'affichent pas de salles.
  const { data: rooms = [] } = useQuery({
    queryKey: ["meeting-rooms-admin", filterCompanyId],
    queryFn: () => meetingRoomsAdminApi.list(filterCompanyId).then((r) => r.data as RoomLite[]),
  });
  const mostBookedRoomName = (() => {
    const room = rooms.find((r) => r.id === meetingData?.mostBookedRoomId);
    return room ? bilingualName(room.nameAr, room.nameEn, isAr) : "—";
  })();

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBlockEnd: 16 }}>
        <Col xs={24} sm={8}>
          <Card loading={loadingMeeting}>
            <Statistic title={t("totalBookings")} value={meetingData?.totalBookings ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loadingMeeting}>
            <Statistic
              title={t("confirmed")}
              value={meetingData?.confirmed ?? 0}
              valueStyle={{ color: "var(--fg-success)" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loadingMeeting}>
            <Statistic
              title={t("cancelled")}
              value={meetingData?.cancelled ?? 0}
              valueStyle={meetingData?.cancelled ? { color: "var(--fg-danger)" } : undefined}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card loading={loadingMeeting}>
            <Statistic
              title={t("cancellationRate")}
              value={meetingData?.cancellationRate ?? 0}
              suffix="%"
              valueStyle={
                meetingData?.cancellationRate ? { color: "var(--fg-warning-subtle)" } : undefined
              }
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
        <Col xs={24} sm={8}>
          <Card loading={loadingMeeting}>
            <Statistic title={t("mostBookedRoom")} value={mostBookedRoomName} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
