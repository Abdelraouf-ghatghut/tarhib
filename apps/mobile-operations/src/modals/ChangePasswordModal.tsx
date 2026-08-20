import React from "react";
import { Modal } from "react-native";
import { RequiredPasswordChangeScreen, type SnowTheme } from "@tarhib/mobile-shared";

export function ChangePasswordModal({
  visible,
  theme,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  theme: SnowTheme;
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <RequiredPasswordChangeScreen
        theme={theme}
        required={false}
        onCancel={onClose}
        onSubmit={onSubmit}
      />
    </Modal>
  );
}
