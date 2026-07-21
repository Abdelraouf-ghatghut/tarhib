import { Form, InputNumber, Modal } from "antd";
import { useTranslation } from "react-i18next";
import type { UseMutationResult } from "@tanstack/react-query";
import type { VipLocation } from "./types";

export function EditProductModal({
  editingProduct,
  onClose,
  isRtl,
  adjustProduct,
  form,
}: {
  editingProduct: VipLocation | null;
  onClose: () => void;
  isRtl: boolean;
  adjustProduct: UseMutationResult<
    unknown,
    unknown,
    { id: string; values: Record<string, unknown> }
  >;
  form: ReturnType<typeof Form.useForm>[0];
}) {
  const { t } = useTranslation();

  return (
    <Modal
      open={!!editingProduct}
      title={
        editingProduct ? (isRtl ? editingProduct.productNameAr : editingProduct.productNameEn) : ""
      }
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={adjustProduct.isPending}
      okText={t("save")}
      cancelText={t("cancel")}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => {
          if (!editingProduct) return;
          adjustProduct.mutate({ id: editingProduct.id, values: v as Record<string, unknown> });
        }}
      >
        <Form.Item name="quantity" label={t("quantity")} rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="minThreshold" label={t("minThreshold")}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="maxThreshold" label={t("maxThreshold")}>
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
