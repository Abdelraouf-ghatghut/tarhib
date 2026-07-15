import type { CatalogProduct } from "@tarhib/mobile-shared";

// Illustrations locales du catalogue Boissons (écran d'accueil) — le backend
// ne sert pas encore d'images produit (imageUrl est toujours null en seed).
const PRODUCT_IMAGES: Record<string, ReturnType<typeof require>> = {
  "Black Coffee": require("../assets/products/free_sugar_coffee.png"),
  Coffee: require("../assets/products/sugar_coffee.png"),
  Nescafé: require("../assets/products/nescafé.png"),
  Cappuccino: require("../assets/products/cappuccino.png"),
  Water: require("../assets/products/water.png"),
  "Green Tea": require("../assets/products/green_tea.png"),
  "Black Tea": require("../assets/products/black_tea.png"),
};

export function productImage(product: CatalogProduct): ReturnType<typeof require> | null {
  return PRODUCT_IMAGES[product.nameEn ?? ""] ?? null;
}
