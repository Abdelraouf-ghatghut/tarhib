import { Form, Input, Modal } from "antd";
import { useTranslation } from "react-i18next";
import type { UseMutationResult } from "@tanstack/react-query";
import type { Po } from "./types";

export function PoRejectModal({
  open,
  onClose,
  detailPo,
  rejectPo,
}: {
  open: boolean;
  onClose: () => void;
  detailPo: Po | null;
  rejectPo: UseMutationResult<unknown, unknown, { id: string; reason: string }>;
}) {
  const { t } = useTranslation();
  const [rejectForm] = Form.useForm();

  return (
    <Modal
      open={open}
      title={t("rejectPo")}
      onCancel={onClose}
      afterOpenChange={(isOpen) => isOpen && rejectForm.resetFields()}
      onOk={() => rejectForm.submit()}
      confirmLoading={rejectPo.isPending}
      destroyOnClose
    >
      <Form
        form={rejectForm}
        layout="vertical"
        onFinish={(v: { reason: string }) => {
          if (!detailPo) return;
          rejectPo.mutate({ id: detailPo.id, reason: v.reason });
        }}
      >
        <Form.Item name="reason" label={t("rejectionReason")} rules={[{ required: true }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
