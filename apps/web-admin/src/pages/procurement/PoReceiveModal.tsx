import { Form, InputNumber, Modal } from "antd";
import { useTranslation } from "react-i18next";
import type { UseMutationResult } from "@tanstack/react-query";
import type { Po, Product } from "./types";

export function PoReceiveModal({
  open,
  onClose,
  detailPo,
  products,
  getProductName,
  receivePo,
}: {
  open: boolean;
  onClose: () => void;
  detailPo: Po | null;
  products: Product[];
  getProductName: (id: string) => string;
  receivePo: UseMutationResult<
    unknown,
    unknown,
    { id: string; lines: { lineId: string; receivedQty: number }[] }
  >;
}) {
  const { t } = useTranslation();
  const [receiveForm] = Form.useForm();

  return (
    <Modal
      open={open}
      title={t("receiveLines")}
      onCancel={onClose}
      afterOpenChange={(isOpen) => isOpen && receiveForm.resetFields()}
      onOk={() => receiveForm.submit()}
      confirmLoading={receivePo.isPending}
      destroyOnClose
    >
      <Form
        form={receiveForm}
        layout="vertical"
        onFinish={(values: Record<string, number>) => {
          if (!detailPo) return;
          const lines = detailPo.lines
            .filter((l) => (values[l.id] ?? 0) > 0)
            .map((l) => ({ lineId: l.id, receivedQty: values[l.id] ?? 0 }));
          receivePo.mutate({ id: detailPo.id, lines });
        }}
      >
        {detailPo?.lines.map((l) => {
          const product = products.find((p) => p.id === l.productId);
          const conversionRate = product?.unitsPerPurchase ?? 1;
          return (
            <Form.Item
              key={l.id}
              name={l.id}
              label={`${getProductName(l.productId)} (${t("received")}: ${l.receivedQty}/${l.orderedQty})`}
              initialValue={Math.max(0, l.orderedQty - l.receivedQty)}
              extra={
                product?.purchaseUnit && conversionRate > 1 ? (
                  <Form.Item noStyle shouldUpdate>
                    {({ getFieldValue }) => {
                      const qty = (getFieldValue(l.id) as number | undefined) ?? 0;
                      return (
                        <span>
                          {qty} {product.purchaseUnit} = {qty * conversionRate} {product.unit}
                        </span>
                      );
                    }}
                  </Form.Item>
                ) : undefined
              }
            >
              <InputNumber min={0} max={l.orderedQty - l.receivedQty} style={{ width: "100%" }} />
            </Form.Item>
          );
        })}
      </Form>
    </Modal>
  );
}
