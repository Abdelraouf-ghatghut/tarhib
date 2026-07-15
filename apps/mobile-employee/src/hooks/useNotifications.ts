import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export interface AppNotification {
  id: string;
  orderId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

const STORAGE_KEY = "tarhib-employee-notifications";
const MAX_NOTIFICATIONS = 50;

export interface Notifications {
  items: AppNotification[];
  unreadCount: number;
  add: (notification: Omit<AppNotification, "id" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

/**
 * Fil de notifications dérivé des vrais événements temps réel (order:status
 * sur le namespace /sla, voir useOrderEvents) — pas de backend notifications
 * (aucune entité/endpoint n'existe, voir realtime.ts). Persisté localement
 * comme le panier (useCart) pour survivre à la fermeture de l'app.
 */
export function useNotifications(): Notifications {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        setItems(JSON.parse(raw) as AppNotification[]);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  return {
    items,
    unreadCount: items.filter((n) => !n.read).length,
    add: (notification) =>
      setItems((current) => {
        // ponytail: dédoublonnage par orderId+body — le socket peut réémettre le même événement (reconnexion).
        if (
          current.some((n) => n.orderId === notification.orderId && n.body === notification.body)
        ) {
          return current;
        }
        const entry: AppNotification = {
          ...notification,
          id: `${notification.orderId}-${Date.now()}`,
          read: false,
        };
        return [entry, ...current].slice(0, MAX_NOTIFICATIONS);
      }),
    markRead: (id) =>
      setItems((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n))),
    markAllRead: () => setItems((current) => current.map((n) => ({ ...n, read: true }))),
  };
}
