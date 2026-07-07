import { useState } from "react";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const { Title } = Typography;

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onFinish(values: { email: string; password: string }) {
    setLoading(true);
    try {
      await login(values.email, values.password);
      navigate("/");
    } catch (err) {
      const internalOnly = err instanceof Error && err.message === "INTERNAL_ONLY";
      void message.error(internalOnly ? t("internalOnlyAccess") : t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--neutral-secondary-soft)",
      }}
    >
      <Card style={{ width: 380 }}>
        <Title level={3} style={{ textAlign: "center", marginBlockEnd: 32 }}>
          {t("appTitle")}
        </Title>

        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item name="email" label={t("email")} rules={[{ required: true, type: "email" }]}>
            <Input size="large" />
          </Form.Item>

          <Form.Item name="password" label={t("password")} rules={[{ required: true }]}>
            <Input.Password size="large" />
          </Form.Item>

          <Form.Item style={{ marginBlockEnd: 0 }}>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              {t("signIn")}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
