import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "../hooks/useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isBooting } = useAuth();

  // Restauration de session (refresh cookie) en cours : ne pas rediriger
  // vers /login avant de savoir si l'utilisateur a une session valide
  if (isBooting) {
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
        <Spin size="large" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}
