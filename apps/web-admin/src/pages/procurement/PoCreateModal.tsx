import { Button, Divider, Form, Input, InputNumber, Modal, Select, Space } from "antd";
import { useTranslation } from "react-i18next";
import type { UseMutationResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { branchesApi, suppliersApi } from "../../lib/api";
import { bilingualName } from "../../lib/bilingualName";
import type { NamedEntity, Product, Supplier } from "./types";

export function PoCreateModal({
  open,
  onClose,
  isRtl,
  companies,
  products,
  suppliers,
  createPo,
}: {
  open: boolean;
  onClose: () => void;
  isRtl: boolean;
  companies: NamedEntity[];
  products: Product[];
  suppliers: Supplier[];
  createPo: UseMutationResult<unknown, unknown, Record<string, unknown>>;
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  // Lieu de livraison choisi dans le formulaire — la liste des branches
  // proposées se limite à celles de la société choisie.
  const watchedDeliveryCompanyId = Form.useWatch("companyId", form) as string | undefined;
  const { data: deliveryBranches = [] } = useQuery<NamedEntity[]>({
    queryKey: ["branches", watchedDeliveryCompanyId],
    queryFn: () => branchesApi.list(watchedDeliveryCompanyId).then((r) => r.data as NamedEntity[]),
    enabled: !!watchedDeliveryCompanyId,
  });

  // Prix produits du fournisseur choisi — chargés une seule fois par
  // changement de fournisseur, puis consultés ligne par ligne (évite un
  // fetch par ligne à chaque sélection de produit).
  const watchedSupplierId = Form.useWatch("supplierId", form) as string | undefined;
  const { data: supplierPrices = [] } = useQuery({
    queryKey: ["supplier-product-prices", watchedSupplierId],
    queryFn: async () => {
      const res = await suppliersApi.productPrices(watchedSupplierId as string);
      return res.data as Array<{ productId: string; unitCost: number }>;
    },
    enabled: !!watchedSupplierId,
  });

  // Pré-remplit le coût unitaire d'une ligne dès que produit + fournisseur
  // sont connus : prix spécifique au fournisseur en priorité, sinon coût
  // interne par défaut du produit.
  function fillLineUnitCost(lineIndex: number, productId: string) {
    const bySupplier = supplierPrices.find((p) => p.productId === productId)?.unitCost;
    const unitCost = bySupplier ?? products.find((p) => p.id === productId)?.unitCost ?? null;
    if (unitCost != null) {
      const lines = form.getFieldValue("lines") as Array<Record<string, unknown>>;
      lines[lineIndex] = { ...lines[lineIndex], unitCost };
      form.setFieldValue("lines", lines);
    }
  }

  return (
    <Modal
      open={open}
      title={t("newPo")}
      onCancel={() => {
        onClose();
        form.resetFields();
      }}
      onOk={() => form.submit()}
      confirmLoading={createPo.isPending}
      width={640}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => createPo.mutate(v as Record<string, unknown>)}
      >
        <Divider>{t("deliveryLocation")}</Divider>
        <Form.Item name="companyId" label={t("company")} rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            options={companies.map((c) => ({
              value: c.id,
              label: bilingualName(c.nameAr, c.nameEn, isRtl),
            }))}
            onChange={() => form.setFieldValue("branchId", undefined)}
          />
        </Form.Item>
        <Form.Item name="branchId" label={t("branch")} rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            disabled={!watchedDeliveryCompanyId}
            placeholder={!watchedDeliveryCompanyId ? t("noCompanySelected") : undefined}
            options={deliveryBranches.map((b) => ({
              value: b.id,
              label: bilingualName(b.nameAr, b.nameEn, isRtl),
            }))}
          />
        </Form.Item>
        <Divider>{t("supplier")}</Divider>
        <Form.Item name="supplierId" label={t("supplier")} rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            options={suppliers.map((s) => ({
              value: s.id,
              label: bilingualName(s.nameAr, s.nameEn, isRtl),
            }))}
          />
        </Form.Item>
        <Form.Item name="notes" label={t("notes")}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Divider>{t("lines")}</Divider>
        <Form.List name="lines" initialValue={[{}]}>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name }) => (
                <Space key={key} wrap align="start" style={{ width: "100%" }}>
                  <Form.Item
                    name={[name, "productId"]}
                    rules={[{ required: true }]}
                    style={{ flex: 2 }}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder={t("product")}
                      options={products.map((p) => ({
                        value: p.id,
                        label: bilingualName(p.nameAr, p.nameEn, isRtl),
                      }))}
                      style={{ minWidth: 200 }}
                      onChange={(productId: string) => fillLineUnitCost(name, productId)}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[name, "orderedQty"]}
                    initialValue={1}
                    rules={[{ required: true }]}
                  >
                    <InputNumber min={1} placeholder={t("qty")} />
                  </Form.Item>
                  <Form.Item name={[name, "unitCost"]}>
                    <InputNumber min={0} placeholder={t("unitCost")} />
                  </Form.Item>
                  <Button danger onClick={() => remove(name)}>
                    ✕
                  </Button>
                </Space>
              ))}
              <Button type="dashed" onClick={() => add()} block>
                + {t("addLine")}
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
