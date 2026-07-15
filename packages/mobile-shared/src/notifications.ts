import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { useAuthStore } from "./store/auth-store";

let registered = false;
let handlerConfigured = false;

/**
 * Affiche l'alerte même quand l'app est au premier plan — sans ça,
 * expo-notifications reçoit le push silencieusement (pas de bannière/son).
 * Idempotent, appelé depuis useNotificationTapHandler.
 */
async function ensureForegroundHandler(): Promise<void> {
  if (handlerConfigured || Platform.OS === "web") return;
  handlerConfigured = true;
  try {
    const Notifications = await import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Expo Go / simulateur sans config FCM — best-effort.
  }
}

/**
 * Réagit au tap sur une notification push (app au premier plan, en fond, ou
 * relancée depuis l'état "killed" via getLastNotificationResponseAsync) et
 * en extrait `data.orderId` (voir orders.service.ts → sendPush(..., data)).
 * L'abonnement se fait une seule fois au montage — `onOpenOrder` est lu via
 * une ref pour ne pas ré-abonner à chaque render si l'appelant passe une
 * fonction inline.
 */
export function useNotificationTapHandler(onOpenOrder: (orderId: string) => void): void {
  const handlerRef = useRef(onOpenOrder);
  handlerRef.current = onOpenOrder;

  useEffect(() => {
    if (Platform.OS === "web") return;
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    void ensureForegroundHandler();

    void import("expo-notifications")
      .then((Notifications) => {
        if (cancelled) return;

        const openFromData = (data: unknown) => {
          const orderId = (data as { orderId?: unknown } | null)?.orderId;
          if (typeof orderId === "string") handlerRef.current(orderId);
        };

        // Notification tapée alors que l'app tournait déjà (premier ou arrière-plan).
        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          openFromData(response.notification.request.content.data);
        });

        // App relancée depuis l'état "killed" par un tap sur la notification.
        void Notifications.getLastNotificationResponseAsync().then((response) => {
          if (response) openFromData(response.notification.request.content.data);
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);
}

/**
 * Enregistre le token push natif (FCM/APNs) auprès du backend
 * (PATCH /auth/device-token → employees.fcm_token, consommé par
 * NotificationsService.sendPush via firebase-admin).
 *
 * Token NATIF (getDevicePushTokenAsync) et non ExponentPushToken : le backend
 * envoie directement via firebase-admin. No-op sur web et en Expo Go (pas de
 * config FCM) — best-effort, n'affecte jamais le flux de connexion.
 */
export async function registerPushToken(): Promise<void> {
  if (registered || Platform.OS === "web") return;
  try {
    const Notifications = await import("expo-notifications");
    const permissions = await Notifications.requestPermissionsAsync();
    if (!permissions.granted) return;
    const token = await Notifications.getDevicePushTokenAsync();
    const value = typeof token.data === "string" ? token.data : null;
    if (!value) return;
    registered = true;
    await useAuthStore.getState().registerDeviceToken(value);
  } catch {
    // Expo Go / simulateur sans Google Play Services : on réessaiera à la
    // prochaine session, jamais bloquant.
  }
}
