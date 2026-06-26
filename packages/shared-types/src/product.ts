export type ProductType = "COMMANDABLE" | "SELF_SERVICE_VIP";

export interface Product {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  category: string;
  type: ProductType;
  allowedRoles?: string[];
  isActive: boolean;
}