import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import { PlusOutlined, EditOutlined, EyeOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { hrApi, employeesApi } from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";
import { useAuth } from "../../hooks/useAuth";
import { compressScannedImage } from "../../lib/contractDocuments";
import { SecureDocumentViewer } from "../../components/SecureDocumentViewer";

const { Title } = Typography;

interface Employee {
  id: string;
  firstNameAr: string;
  firstNameEn: string;
  lastNameAr: string;
  lastNameEn: string;
}

interface EmploymentContract {
  id: string;
  employeeId: string;
  type: "CDI" | "CDD";
  startDate: string;
  endDate: string | null;
  jobTitle: string;
  baseSalary: number;
  status: "ACTIVE" | "ENDED" | "RENEWED";
  documentUrl: string | null;
}

const STATUS_COLOR: Record<EmploymentContract["status"], string> = {
  ACTIVE: "green",
  ENDED: "default",
  RENEWED: "blue",
};

export function ContractsPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");
  const { hasPermission } = useAuth();
  const canManage = hasPermission("hr.contract.manage");
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmploymentContract | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [viewingContract, setViewingContract] = useState<EmploymentContract | null>(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.list().then((r) => r.data as Employee[]),
  });
  const employeeName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    if (!e) return id.slice(0, 8);
    return isAr ? `${e.firstNameAr} ${e.lastNameAr}` : `${e.firstNameEn} ${e.lastNameEn}`;
  };

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["hr", "contracts"],
    queryFn: () => hrApi.contracts.list().then((r) => r.data as EmploymentContract[]),
  });

  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        startDate: dayjs(values.startDate as dayjs.Dayjs).format("YYYY-MM-DD"),
        endDate: values.endDate ? dayjs(values.endDate as dayjs.Dayjs).format("YYYY-MM-DD") : null,
      };
      const response = editing
        ? hrApi.contracts.update(editing.id, payload)
        : hrApi.contracts.create(payload);
      const saved = await response;
      let documentUploadFailed = false;
      if (documentFile) {
        try {
          const compressed = await compressScannedImage(documentFile);
          await hrApi.contracts.uploadDocument(saved.data.id, compressed);
        } catch {
          documentUploadFailed = true;
        }
      }
      return { documentUploadFailed };
    },
    onSuccess: ({ documentUploadFailed }) => {
      if (documentUploadFailed) message.warning(t("contractSavedDocumentFailed"));
      else message.success(t("saved"));
      queryClient.invalidateQueries({ queryKey: ["hr", "contracts"] });
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      setDocumentFile(null);
    },
    onError: (err) => message.error(getErrorMessage(err, t)),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDocumentFile(null);
    setModalOpen(true);
  };

  const openEdit = (c: EmploymentContract) => {
    setEditing(c);
    setDocumentFile(null);
    form.setFieldsValue({
      ...c,
      startDate: dayjs(c.startDate),
      endDate: c.endDate ? dayjs(c.endDate) : null,
    });
    setModalOpen(true);
  };

  const columns = [
    { title: t("employee"), dataIndex: "employeeId", key: "employeeId", render: employeeName },
    {
      title: t("contractType"),
      dataIndex: "type",
      key: "type",
      render: (value: EmploymentContract["type"]) => t(`contractType_${value}`),
    },
    { title: t("jobTitle"), dataIndex: "jobTitle", key: "jobTitle" },
    {
      title: t("baseSalary"),
      dataIndex: "baseSalary",
      key: "baseSalary",
      render: (v: number) => `${v.toFixed(2)} ${t("currencyUnit")}`,
    },
    { title: t("startDate"), dataIndex: "startDate", key: "startDate" },
    {
      title: t("endDate"),
      dataIndex: "endDate",
      key: "endDate",
      render: (v: string | null) => v ?? "—",
    },
    {
      title: t("status"),
      dataIndex: "status",
      key: "status",
      render: (v: EmploymentContract["status"]) => (
        <Tag color={STATUS_COLOR[v]}>{t(`contractStatusHr_${v}`)}</Tag>
      ),
    },
    {
      title: t("contractDocument"),
      dataIndex: "documentUrl",
      key: "documentUrl",
      render: (value: string | null, contract: EmploymentContract) =>
        value ? (
          <Button size="small" icon={<EyeOutlined />} onClick={() => setViewingContract(contract)}>
            {t("viewDocument")}
          </Button>
        ) : (
          <Tag>{t("noDocument")}</Tag>
        ),
    },
    ...(canManage
      ? [
          {
            title: t("actions"),
            key: "actions",
            render: (_: unknown, r: EmploymentContract) => (
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
            ),
          },
        ]
      : []),
  ];

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          {t("employmentContracts")}
        </Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("add")}
          </Button>
        )}
      </div>

      <Table
        rowKey="id"
        dataSource={contracts}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: "max-content" }}
      />

      <Modal
        open={modalOpen}
        title={editing ? t("edit") : t("add")}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          setDocumentFile(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item name="employeeId" label={t("employee")} rules={[{ required: true }]}>
            <Select
              disabled={!!editing}
              showSearch
              optionFilterProp="label"
              options={employees.map((e) => ({ value: e.id, label: employeeName(e.id) }))}
            />
          </Form.Item>
          <Form.Item name="type" label={t("contractType")} rules={[{ required: true }]}>
            <Select
              options={["CDI", "CDD"].map((v) => ({
                value: v,
                label: t(`contractType_${v}`),
              }))}
            />
          </Form.Item>
          <Form.Item name="jobTitle" label={t("jobTitle")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="baseSalary" label={t("baseSalary")} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} addonAfter={t("currencyUnit")} />
          </Form.Item>
          <Form.Item name="startDate" label={t("startDate")} rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="endDate" label={t("endDate")}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="status" label={t("status")} initialValue="ACTIVE">
            <Select
              options={["ACTIVE", "ENDED", "RENEWED"].map((v) => ({
                value: v,
                label: t(`contractStatusHr_${v}`),
              }))}
            />
          </Form.Item>
          <Form.Item label={t("contractDocument")} extra={t("contractDocumentHint")}>
            <Upload
              accept="application/pdf,image/jpeg,image/png"
              maxCount={1}
              beforeUpload={(file) => {
                if (file.size > 15 * 1024 * 1024) {
                  message.error(t("contractDocumentTooLarge"));
                  return Upload.LIST_IGNORE;
                }
                setDocumentFile(file as File);
                return false;
              }}
              onRemove={() => {
                setDocumentFile(null);
                return true;
              }}
              fileList={
                documentFile
                  ? [{ uid: "contract-document", name: documentFile.name, status: "done" }]
                  : []
              }
            >
              <Button icon={<UploadOutlined />}>
                {editing?.documentUrl ? t("replaceDocument") : t("selectDocument")}
              </Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
      <SecureDocumentViewer
        open={!!viewingContract}
        documentId={viewingContract?.id ?? null}
        title={viewingContract ? employeeName(viewingContract.employeeId) : t("contractDocument")}
        loadDocument={hrApi.contracts.downloadDocument}
        onClose={() => setViewingContract(null)}
      />
    </div>
  );
}

export default ContractsPage;
