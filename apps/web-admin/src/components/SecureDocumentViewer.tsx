import { useEffect, useState } from "react";
import { Empty, Modal, Spin, message } from "antd";
import { useTranslation } from "react-i18next";
import { getErrorMessage } from "../lib/errors";

interface Props {
  open: boolean;
  documentId: string | null;
  title: string;
  loadDocument: (id: string) => Promise<{ data: Blob }>;
  onClose: () => void;
}

export function SecureDocumentViewer({ open, documentId, title, loadDocument, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <Modal open={open} title={title} onCancel={onClose} footer={null} width="92vw" destroyOnClose>
      <div style={{ height: "78vh", display: "grid", placeItems: "center" }}>
        {open && documentId ? (
          <DocumentContent
            key={documentId}
            documentId={documentId}
            title={title}
            loadDocument={loadDocument}
            onError={onClose}
          />
        ) : (
          <Empty description={t("noDocument")} />
        )}
      </div>
    </Modal>
  );
}

function DocumentContent({
  documentId,
  title,
  loadDocument,
  onError,
}: Pick<Props, "documentId" | "title" | "loadDocument"> & { onError: () => void }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    void loadDocument(documentId!)
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setUrl(objectUrl);
      })
      .catch((err) => {
        if (active) {
          void message.error(getErrorMessage(err, t));
          onError();
        }
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId, loadDocument, onError, t]);

  return url ? (
    <iframe
      src={url}
      title={title}
      style={{ width: "100%", height: "100%", border: 0, borderRadius: 8 }}
    />
  ) : (
    <Spin size="large" />
  );
}
