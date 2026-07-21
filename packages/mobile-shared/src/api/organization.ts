import { api } from "./client";

export interface OrganizationCompany {
  id: string;
  nameAr: string;
  nameEn: string;
  active: boolean;
}

export interface OrganizationBranch {
  id: string;
  companyId: string;
  nameAr: string;
  nameEn: string;
  active: boolean;
}

export async function fetchCompanies(): Promise<OrganizationCompany[]> {
  const { data } = await api.get<OrganizationCompany[]>("/companies");
  return data.filter((company) => company.active);
}

export async function fetchBranches(companyId: string): Promise<OrganizationBranch[]> {
  const { data } = await api.get<OrganizationBranch[]>("/branches", { params: { companyId } });
  return data.filter((branch) => branch.active);
}
