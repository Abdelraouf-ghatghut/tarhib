import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

import { BASE_URL, getCurrentAccessToken } from "./api/client";

// Événements émis par apps/backend/src/notifications/notifications.gateway.ts
// (namespace /sla).
export interface OrderEvent {
  orderId: string;
  status?: string;
  branchId: string;
}

export interface SlaTick {
  orderId: string;
  remainingSeconds: number;
  priority: string;
}

let socket: Socket | null = null;

/**
 * Socket partagée vers le namespace /sla — créée au premier abonnement.
 *
 * PR-0.6a : le serveur exige un JWT valide au handshake (sinon connect_error,
 * la socket n'est jamais admise et ne reçoit aucun événement). `auth` en
 * fonction callback = réévalué à CHAQUE tentative de (re)connexion, donc
 * toujours le token courant (pas figé au premier connect — important après un
 * refresh de token ou une reconnexion suite à coupure réseau).
 */
export function getRealtimeSocket(): Socket {
  if (!socket) {
    socket = io(`${BASE_URL}/sla`, {
      transports: ["websocket", "polling"],
      reconnection: true,
      auth: (cb: (data: { token?: string }) => void) =>
        cb({ token: getCurrentAccessToken() ?? undefined }),
    });
    // Ancienne app / session expirée / Redis... : le polling des useQuery
    // (cf. useOrderEvents) reste le filet de sécurité si la socket n'est
    // jamais admise — pas de dégradation silencieuse à masquer davantage ici.
    socket.on("connect_error", (err: Error) => {
      console.warn(`[realtime] connexion WebSocket refusée : ${err.message}`);
    });
  }
  return socket;
}

export function subscribeOrderEvents(handlers: {
  onOrderChange?: (event: OrderEvent) => void;
  onSlaTick?: (tick: SlaTick) => void;
}): () => void {
  const s = getRealtimeSocket();
  const onChange = (event: OrderEvent) => handlers.onOrderChange?.(event);
  const onTick = (tick: SlaTick) => handlers.onSlaTick?.(tick);
  s.on("order:new", onChange);
  s.on("order:status", onChange);
  s.on("sla:tick", onTick);
  return () => {
    s.off("order:new", onChange);
    s.off("order:status", onChange);
    s.off("sla:tick", onTick);
  };
}

/**
 * Invalidation react-query pilotée par le temps réel : toute création ou
 * transition de commande rafraîchit l'historique employé, la file cuisine et
 * les stats du dashboard. Le polling des useQuery reste le filet de sécurité
 * si la socket est coupée.
 */
export function useOrderEvents(
  queryClient: QueryClient,
  onSlaTick?: (tick: SlaTick) => void,
  onOrderChange?: (event: OrderEvent) => void,
): void {
  const tickRef = useRef(onSlaTick);
  tickRef.current = onSlaTick;
  const changeRef = useRef(onOrderChange);
  changeRef.current = onOrderChange;

  useEffect(
    () =>
      subscribeOrderEvents({
        onOrderChange: (event) => {
          void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
          void queryClient.invalidateQueries({ queryKey: ["kitchen-queue"] });
          void queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
          changeRef.current?.(event);
        },
        onSlaTick: (tick) => tickRef.current?.(tick),
      }),
    [queryClient],
  );
}
