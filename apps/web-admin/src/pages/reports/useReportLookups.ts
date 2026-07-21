import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  branchesApi,
  companiesApi,
  employeesApi,
  productsAdminApi,
  suppliersApi,
} from "../../lib/api";
import { bilingualName } from "../../lib/bilingualName";
import { useEntityLookup } from "../../hooks/useEntityLookup";
import type { Branch, Company, EmployeeLite, ProductAdmin, Supplier } from "./types";

/**
 * Résolveurs id → libellé partagés par tous les onglets Reports. Chaque
 * onglet peut appeler ce hook indépendamment : react-query dédoublonne les
 * requêtes par queryKey, donc aucun fetch réseau supplémentaire n'est émis.
 */
export function useReportLookups(filterCompanyId: string | undefined) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list().then((r) => r.data as Company[]),
  });

  const { data: allBranches = [] } = useQuery({
    queryKey: ["branches-all"],
    queryFn: () => branchesApi.list().then((r) => r.data as Branch[]),
  });

  const { data: branches } = useQuery({
    queryKey: ["branches", filterCompanyId],
    queryFn: () => branchesApi.list(filterCompanyId).then((r) => r.data as Branch[]),
    enabled: !!filterCompanyId,
  });

  const { data: employeesList = [] } = useQuery({
    queryKey: ["employees", filterCompanyId],
    queryFn: () =>
      employeesApi
        .list(filterCompanyId ? { companyId: filterCompanyId } : undefined)
        .then((r) => r.data as EmployeeLite[]),
  });

  const { data: suppliersList = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => suppliersApi.list().then((r) => r.data as Supplier[]),
  });

  const { data: productsList = [] } = useQuery({
    queryKey: ["products-admin"],
    queryFn: () => productsAdminApi.list().then((r) => r.data as ProductAdmin[]),
  });

  const supplierName = useEntityLookup(
    suppliersList,
    (s) => s.id,
    (s) => bilingualName(s.nameAr, s.nameEn, isAr),
  );
  const productName = useEntityLookup(
    productsList,
    (p) => p.id,
    (p) => bilingualName(p.nameAr, p.nameEn, isAr),
  );
  const employeeName = useEntityLookup(
    employeesList,
    (e) => e.id,
    (e) =>
      (isAr ? `${e.firstNameAr} ${e.lastNameAr}` : `${e.firstNameEn} ${e.lastNameEn}`).trim() ||
      e.email,
  );
  const companyName = (id: string) => {
    const c = companies?.find((x) => x.id === id);
    return c ? bilingualName(c.nameAr, c.nameEn, isAr) : null;
  };
  const branchName = (id: string) => {
    const b = allBranches.find((x) => x.id === id);
    if (!b) return id.slice(0, 8);
    const name = bilingualName(b.nameAr, b.nameEn, isAr);
    const company = companyName(b.companyId);
    return company ? `${name} (${company})` : name;
  };

  return {
    isAr,
    companies,
    branches,
    suppliersList,
    productsList,
    supplierName,
    productName,
    employeeName,
    companyName,
    branchName,
  };
}
