import { Button, Card, Descriptions, Divider, Modal, Space, Table, Tag, Typography } from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  InboxOutlined,
  SendOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { UseMutationResult } from "@tanstack/react-query";
import { StatusStepper } from "../../components/StatusStepper";
import { STATUS_COLOR, type Po } from "./types";

const { Text } = Typography;

export function PoDetailModal({
  detailPo,
  onClose,
  isMobile,
  isRtl,
  getSupplierName,
  getCompanyName,
  getBranchName,
  getProductName,
  employeeName,
  submitPo,
  validatePo,
  sendPo,
  cancelPo,
  onOpenReject,
  onOpenReceive,
  receiveLoading,
}: {
  detailPo: Po | null;
  onClose: () => void;
  isMobile: boolean;
  isRtl: boolean;
  getSupplierName: (id: string) => string;
  getCompanyName: (id: string) => string;
  getBranchName: (id: string) => string;
  getProductName: (id: string) => string;
  employeeName: (id: string | null) => string | null;
  submitPo: UseMutationResult<unknown, unknown, string>;
  validatePo: UseMutationResult<unknown, unknown, string>;
  sendPo: UseMutationResult<unknown, unknown, string>;
  cancelPo: UseMutationResult<unknown, unknown, string>;
  onOpenReject: () => void;
  onOpenReceive: () => void;
  receiveLoading: boolean;
}) {
  const { t } = useTranslation();

  const linesColumns = [
    {
      title: t("product"),
      dataIndex: "productId",
      key: "productId",
      render: (id: string) => getProductName(id),
    },
    { title: t("orderedQty"), dataIndex: "orderedQty", key: "orderedQty" },
    { title: t("receivedQty"), dataIndex: "receivedQty", key: "receivedQty" },
    {
      title: t("unitCost"),
      dataIndex: "unitCost",
      key: "unitCost",
      render: (v: number | null) => (v != null ? `${v}` : "—"),
    },
  ];

  return (
    <Modal
      open={!!detailPo}
      title={`${t("purchaseOrder")} — ${detailPo ? t(`poStatus_${detailPo.status}`) : ""}`}
      onCancel={onClose}
      footer={
        detailPo && (
          <Space wrap style={{ justifyContent: "flex-end", width: "100%" }}>
            {detailPo.status === "DRAFT" && (
              <>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={submitPo.isPending}
                  onClick={() => submitPo.mutate(detailPo.id)}
                >
                  {t("submitForValidation")}
                </Button>
                <Button
                  icon={<SendOutlined />}
                  loading={sendPo.isPending}
                  onClick={() => sendPo.mutate(detailPo.id)}
                >
                  {t("sendDirectly")}
                </Button>
              </>
            )}
            {detailPo.status === "PENDING_VALIDATION" && (
              <>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={validatePo.isPending}
                  onClick={() => validatePo.mutate(detailPo.id)}
                >
                  {t("validate")}
                </Button>
                <Button danger icon={<CloseOutlined />} onClick={onOpenReject}>
                  {t("reject")}
                </Button>
              </>
            )}
            {detailPo.status === "VALIDATED" && (
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={sendPo.isPending}
                onClick={() => sendPo.mutate(detailPo.id)}
              >
                {t("send")}
              </Button>
            )}
            {(detailPo.status === "SENT" || detailPo.status === "PARTIALLY_RECEIVED") && (
              <Button
                type="primary"
                icon={<InboxOutlined />}
                loading={receiveLoading}
                onClick={onOpenReceive}
              >
                {t("receive")}
              </Button>
            )}
            {detailPo.status !== "RECEIVED" && detailPo.status !== "CANCELLED" && (
              <Button
                danger
                icon={<StopOutlined />}
                loading={cancelPo.isPending}
                onClick={() => cancelPo.mutate(detailPo.id)}
              >
                {t("cancel")}
              </Button>
            )}
          </Space>
        )
      }
      width={720}
      style={{ maxWidth: "calc(100vw - 24px)" }}
      destroyOnClose
    >
      {detailPo && (
        <>
          <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label={t("supplier")}>
              {getSupplierName(detailPo.supplierId)}
            </Descriptions.Item>
            <Descriptions.Item label={t("deliveryLocation")}>
              {getCompanyName(detailPo.companyId)} — {getBranchName(detailPo.branchId)}
            </Descriptions.Item>
            <Descriptions.Item label={t("status")}>
              <Tag color={STATUS_COLOR[detailPo.status]}>{t(`poStatus_${detailPo.status}`)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t("date")}>
              {new Date(detailPo.createdAt).toLocaleString(isRtl ? "ar" : "en-GB")}
            </Descriptions.Item>
            {detailPo.notes && (
              <Descriptions.Item label={t("notes")} span={2}>
                {detailPo.notes}
              </Descriptions.Item>
            )}
            {detailPo.rejectionReason && (
              <Descriptions.Item label={t("rejectionReason")} span={2}>
                <Text type="danger">{detailPo.rejectionReason}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
          <Divider />
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {detailPo.lines.map((l) => (
                <Card key={l.id} size="small">
                  <Text strong style={{ display: "block", marginBlockEnd: 6 }}>
                    {getProductName(l.productId)}
                  </Text>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <Text type="secondary">{t("orderedQty")}</Text>
                    <Text>{l.orderedQty}</Text>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <Text type="secondary">{t("receivedQty")}</Text>
                    <Text>{l.receivedQty}</Text>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <Text type="secondary">{t("unitCost")}</Text>
                    <Text>{l.unitCost != null ? l.unitCost : "—"}</Text>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Table
              rowKey="id"
              dataSource={detailPo.lines}
              columns={linesColumns}
              pagination={false}
              size="small"
              scroll={{ x: "max-content" }}
            />
          )}

          <Typography.Title level={5} style={{ marginBlockStart: 20, marginBlockEnd: 8 }}>
            {t("statusHistory")}
          </Typography.Title>
          <StatusStepper
            steps={[
              {
                key: "created",
                label: t("poCreated"),
                at: detailPo.createdAt,
                actor: employeeName(detailPo.createdBy),
              },
              ...(detailPo.rejectedAt
                ? [
                    {
                      key: "rejected",
                      label: t("poRejected"),
                      at: detailPo.rejectedAt,
                      actor: employeeName(detailPo.rejectedBy),
                      isTerminalNegative: true,
                    },
                  ]
                : [
                    {
                      key: "validated",
                      label: t("poValidated"),
                      at: detailPo.validatedAt,
                      actor: employeeName(detailPo.validatedBy),
                    },
                  ]),
              {
                key: "sent",
                label: t("poSent"),
                at: detailPo.sentAt,
                actor: employeeName(detailPo.sentBy),
              },
              {
                key: "received",
                label: t("poReceived"),
                at: detailPo.receivedAt,
                actor: employeeName(detailPo.receivedBy),
              },
              ...(detailPo.cancelledAt
                ? [
                    {
                      key: "cancelled",
                      label: t("poCancelled"),
                      at: detailPo.cancelledAt,
                      actor: employeeName(detailPo.cancelledBy),
                      isTerminalNegative: true,
                    },
                  ]
                : []),
            ]}
          />
        </>
      )}
    </Modal>
  );
}
