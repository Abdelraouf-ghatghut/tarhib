import { useRef } from "react";
import { Button, Col, Form, Input, Row, Switch, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CrudTable } from "../../components/CrudTable";
import type { CrudTableHandle } from "../../components/CrudTable";
import { companiesApi } from "../../lib/api";

const { Title } = Typography;

interface Company {
  id: string;
  nameAr: string;
  nameEn: string | null;
  slug: string;
  active: boolean;
}

export function CompaniesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const crudRef = useRef<CrudTableHandle>(null);

  const { data, isPending } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as Company[]),
  });

  async function onSave(values: Record<string, unknown>, id?: string) {
    if (id) {
      await companiesApi.update(id, values);
    } else {
      await companiesApi.create(values);
    }
    void qc.invalidateQueries({ queryKey: ["companies"] });
  }

  async function onDelete(id: string) {
    await companiesApi.remove(id);
    void qc.invalidateQueries({ queryKey: ["companies"] });
  }

  return (
    <>
      <Row justify="space-between" align="middle" style={{ marginBlockEnd: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            {t("companies")}
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => crudRef.current?.openCreate()}
          >
            {t("add")}
          </Button>
        </Col>
      </Row>
      <CrudTable<Company>
        ref={crudRef}
        hideAddButton
        data={data}
        isPending={isPending}
        onSave={onSave}
        onDelete={onDelete}
        columns={[
          { title: t("nameAr"), dataIndex: "nameAr" },
          {
            title: t("nameEn"),
            dataIndex: "nameEn",
            render: (v: string | null) => v?.trim() || "—",
          },
          { title: t("slug"), dataIndex: "slug" },
          {
            title: t("active"),
            dataIndex: "active",
            render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "✓" : "✗"}</Tag>,
            width: 80,
          },
        ]}
        formContent={(rec) => (
          <>
            <Form.Item name="nameAr" label={t("nameAr")} rules={[{ required: true }]}>
              <Input dir="rtl" />
            </Form.Item>
            <Form.Item name="nameEn" label={t("nameEnOptional")}>
              <Input dir="ltr" />
            </Form.Item>
            <Form.Item
              name="slug"
              label={t("slug")}
              rules={[
                { required: true },
                {
                  pattern: /^[a-z0-9-]+$/,
                  message: t("slugFormat"),
                },
              ]}
            >
              <Input dir="ltr" placeholder="acme-corp" disabled={!!rec} />
            </Form.Item>
            <Form.Item
              name="active"
              label={t("active")}
              valuePropName="checked"
              initialValue={true}
            >
              <Switch />
            </Form.Item>
          </>
        )}
      />
    </>
  );
}
