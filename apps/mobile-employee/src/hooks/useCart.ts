import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";

import type { CatalogProduct } from "@tarhib/mobile-shared";

const CART_STORAGE_KEY = "tarhib-employee-cart";

export interface Cart {
  quantities: Record<string, number>;
  /** Lignes du panier (produits avec quantité > 0), dans l'ordre du catalogue. */
  lines: CatalogProduct[];
  totalItems: number;
  add: (productId: string, quantity?: number) => void;
  remove: (productId: string) => void;
  /** Remplace tout le panier (utilisé pour « إعادة الطلب »). */
  setLines: (quantities: Record<string, number>) => void;
  clear: () => void;
}

export function useCart(products: CatalogProduct[]): Cart {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        setQuantities(JSON.parse(raw) as Record<string, number>);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    void AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(quantities));
  }, [quantities, loaded]);

  const lines = useMemo(
    () => products.filter((product) => (quantities[product.id] ?? 0) > 0),
    [products, quantities],
  );
  const totalItems = useMemo(
    () => Object.values(quantities).reduce((sum, qty) => sum + qty, 0),
    [quantities],
  );

  return {
    quantities,
    lines,
    totalItems,
    add: (productId, quantity = 1) =>
      setQuantities((current) => ({
        ...current,
        [productId]: (current[productId] ?? 0) + quantity,
      })),
    remove: (productId) =>
      setQuantities((current) => ({
        ...current,
        [productId]: Math.max((current[productId] ?? 0) - 1, 0),
      })),
    setLines: (next) => setQuantities(next),
    clear: () => setQuantities({}),
  };
}
