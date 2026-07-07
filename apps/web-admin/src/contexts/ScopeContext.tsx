import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "../hooks/useAuth";
import { router } from "../router";

interface ScopeState {
  companyId: string | null;
  branchId: string | null;
  setCompanyId: (id: string | null) => void;
  setBranchId: (id: string | null) => void;
}

const ScopeContext = createContext<ScopeState | null>(null);

export function ScopeProvider({ children }: { children: ReactNode }) {
  const { companyId: authCompanyId, isSuperadmin } = useAuth();

  const [companyId, setCompanyIdState] = useState<string | null>(
    isSuperadmin ? null : (authCompanyId ?? null),
  );
  const [branchId, setBranchId] = useState<string | null>(null);

  const setCompanyId = (id: string | null) => {
    setCompanyIdState(id);
    setBranchId(null); // reset branch when company changes
  };

  // Le filtre société/branche est un filtre d'AFFICHAGE propre à chaque page
  // (ex. Employés) — il ne doit pas persister quand on navigue ailleurs
  // (ex. Inventaire), sous peine de masquer des données par surprise.
  const pathnameRef = useRef(router.state.location.pathname);
  useEffect(() => {
    return router.subscribe((state) => {
      if (state.location.pathname !== pathnameRef.current) {
        pathnameRef.current = state.location.pathname;
        setCompanyIdState(isSuperadmin ? null : (authCompanyId ?? null));
        setBranchId(null);
      }
    });
  }, [authCompanyId, isSuperadmin]);

  const value = useMemo(
    () => ({ companyId, branchId, setCompanyId, setBranchId }),

    [companyId, branchId],
  );

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useScope(): ScopeState {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error("useScope must be used inside ScopeProvider");
  return ctx;
}
