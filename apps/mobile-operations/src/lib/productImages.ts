import type { CatalogProduct } from "@tarhib/mobile-shared";

// Source unique des illustrations boissons : les deux applications embarquent
// exactement les mêmes fichiers, suivis par Metro depuis la racine du monorepo.
const PRODUCT_IMAGES: Record<string, ReturnType<typeof require>> = {
  "Black Coffee": require("../../../mobile-employee/src/assets/products/free_sugar_coffee.png"),
  Coffee: require("../../../mobile-employee/src/assets/products/sugar_coffee.png"),
  Nescafé: require("../../../mobile-employee/src/assets/products/nescafé.png"),
  Cappuccino: require("../../../mobile-employee/src/assets/products/cappuccino.png"),
  Water: require("../../../mobile-employee/src/assets/products/water.png"),
  "Green Tea": require("../../../mobile-employee/src/assets/products/green_tea.png"),
  "Black Tea": require("../../../mobile-employee/src/assets/products/black_tea.png"),
};

export const operationsProductImage = (
  product: CatalogProduct,
): ReturnType<typeof require> | null => PRODUCT_IMAGES[product.nameEn ?? ""] ?? null;
