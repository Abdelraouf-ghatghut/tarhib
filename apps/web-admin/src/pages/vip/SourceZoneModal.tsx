import { Form, Modal, Select } from "antd";
import { useTranslation } from "react-i18next";
import type { ZoneAction } from "./types";

export function SourceZoneModal({
  zoneAction,
  allowedZones,
  onClose,
  loading,
  onSubmit,
  form,
}: {
  zoneAction: ZoneAction | null;
  // CENTRAL n'est jamais proposé ici : y accéder implique un transfert
  // physique avec délai (voir Transferts de stock), pas une réappro
  // instantanée. Restreint en plus à ce que l'appelant a le droit de voir.
  allowedZones: readonly string[];
  onClose: () => void;
  loading: boolean;
  onSubmit: (values: { sourceZone: string }) => void;
  form: ReturnType<typeof Form.useForm>[0];
}) {
  const { t } = useTranslation();

  return (
    <Modal
      open={!!zoneAction}
      title={t("sourceZone")}
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={loading}
      okText={t("confirm")}
      cancelText={t("cancel")}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ sourceZone: "KITCHEN" }}
        onFinish={onSubmit}
      >
        <Form.Item
          name="sourceZone"
          label={t("sourceZone")}
          tooltip={t("sourceZoneHint")}
          rules={[{ required: true }]}
        >
          <Select
            options={allowedZones.map((z) => ({
              value: z,
              label: t(`zone_${z}`),
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
