import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Lang,
} from "@tarhib/mobile-shared";

export interface OpsNotification {
  id: string;
  refId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

const STORAGE_KEY = "tarhib-operations-notifications";
const MAX_NOTIFICATIONS = 50;

export interface OpsNotifications {
  items: OpsNotification[];
  unreadCount: number;
  add: (notification: Omit<OpsNotification, "id" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

/**
 * Fil de notifications Operations, dérivé des événements temps réel (socket
 * /sla, voir realtime.ts) et des seuils de stock bas — aucun backend
 * notifications n'existe (même limitation que côté Employee, voir
 * apps/mobile-employee/src/hooks/useNotifications.ts). Persisté localement.
 */
export function useOperationsNotifications(lang: Lang): OpsNotifications {
  const [items, setItems] = useState<OpsNotification[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        setItems(JSON.parse(raw) as OpsNotification[]);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    let active = true;
    const sync = () =>
      fetchNotifications()
        .then((rows) => {
          if (!active) return;
          const remote = rows.map((row) => ({
            id: row.id,
            refId: row.referenceId ?? row.id,
            title: lang === "ar" ? row.titleAr : row.titleEn,
            body: lang === "ar" ? row.bodyAr : row.bodyEn,
            createdAt: row.createdAt,
            read: Boolean(row.readAt),
          }));
          setItems((current) =>
            [
              ...remote,
              ...current.filter((item) => !remote.some((remoteItem) => remoteItem.id === item.id)),
            ].slice(0, MAX_NOTIFICATIONS),
          );
        })
        .catch(() => undefined);
    void sync();
    const timer = setInterval(sync, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [lang]);

  useEffect(() => {
    if (!loaded) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  return {
    items,
    unreadCount: items.filter((n) => !n.read).length,
    add: (notification) =>
      setItems((current) => {
        // ponytail: dédoublonnage par refId+body — le socket peut réémettre le même événement (reconnexion).
        if (current.some((n) => n.refId === notification.refId && n.body === notification.body)) {
          return current;
        }
        const entry: OpsNotification = {
          ...notification,
          id: `${notification.refId}-${Date.now()}`,
          read: false,
        };
        return [entry, ...current].slice(0, MAX_NOTIFICATIONS);
      }),
    markRead: (id) => {
      setItems((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)));
      void markNotificationRead(id).catch(() => undefined);
    },
    markAllRead: () => {
      setItems((current) => current.map((n) => ({ ...n, read: true })));
      void markAllNotificationsRead().catch(() => undefined);
    },
  };
}
