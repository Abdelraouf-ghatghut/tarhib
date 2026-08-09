import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Input, Modal, Space, Table, Typography, Upload, message } from "antd";
import { DeleteOutlined, EyeOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { companyDocumentsApi } from "../../lib/api";
import { compressScannedImage } from "../../lib/contractDocuments";
import { getErrorMessage } from "../../lib/errors";
import { SecureDocumentViewer } from "../../components/SecureDocumentViewer";

const { Title } = Typography;
interface CompanyDocument {
  id: string;
  name: string;
  documentUrl: string;
  createdAt: string;
}

export default function CompanyDocumentsPage() {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [viewing, setViewing] = useState<CompanyDocument | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["company-documents"],
    queryFn: () => companyDocumentsApi.list().then((r) => r.data as CompanyDocument[]),
  });
  const create = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!file) throw new Error("contractDocumentRequired");
      return companyDocumentsApi.create(name, await compressScannedImage(file));
    },
    onSuccess: () => {
      void message.success(t("saved"));
      void queryClient.invalidateQueries({ queryKey: ["company-documents"] });
      setCreateOpen(false);
      setFile(null);
      form.resetFields();
    },
    onError: (err) => void message.error(getErrorMessage(err, t)),
  });
  const remove = useMutation({
    mutationFn: companyDocumentsApi.remove,
    onSuccess: () => {
      void message.success(t("deleted"));
      void queryClient.invalidateQueries({ queryKey: ["company-documents"] });
    },
    onError: (err) => void message.error(getErrorMessage(err, t)),
  });
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          {t("companyDocuments")}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          {t("add")}
        </Button>
      </div>
      <Table
        rowKey="id"
        dataSource={data}
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: t("documentName"), dataIndex: "name", key: "name" },
          {
            title: t("createdAt"),
            dataIndex: "createdAt",
            key: "createdAt",
            render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
          },
          {
            title: t("actions"),
            key: "actions",
            render: (_: unknown, row: CompanyDocument) => (
              <Space>
                <Button size="small" icon={<EyeOutlined />} onClick={() => setViewing(row)}>
                  {t("viewDocument")}
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    modal.confirm({
                      title: t("deleteConfirm"),
                      okText: t("confirm"),
                      cancelText: t("cancel"),
                      okButtonProps: { danger: true },
                      onOk: () => remove.mutateAsync(row.id),
                    })
                  }
                />
              </Space>
            ),
          },
        ]}
      />
      <Modal
        open={createOpen}
        title={t("addCompanyDocument")}
        onCancel={() => {
          setCreateOpen(false);
          setFile(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={create.isPending}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (!file) {
              void message.error(t("errors.contractDocumentRequired"));
              return;
            }
            create.mutate(values);
          }}
        >
          <Form.Item name="name" label={t("documentName")} rules={[{ required: true, min: 2 }]}>
            <Input placeholder={t("documentNameExample")} maxLength={255} />
          </Form.Item>
          <Form.Item label={t("contractDocument")} required extra={t("contractDocumentHint")}>
            <Upload
              accept="application/pdf,image/jpeg,image/png"
              maxCount={1}
              beforeUpload={(selected) => {
                if (selected.size > 15 * 1024 * 1024) {
                  void message.error(t("contractDocumentTooLarge"));
                  return Upload.LIST_IGNORE;
                }
                setFile(selected as File);
                return false;
              }}
              onRemove={() => {
                setFile(null);
                return true;
              }}
              fileList={file ? [{ uid: "company-document", name: file.name, status: "done" }] : []}
            >
              <Button icon={<UploadOutlined />}>{t("selectDocument")}</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
      <SecureDocumentViewer
        open={!!viewing}
        documentId={viewing?.id ?? null}
        title={viewing?.name ?? t("companyDocuments")}
        loadDocument={companyDocumentsApi.download}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}
