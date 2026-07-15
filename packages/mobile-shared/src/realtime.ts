import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

import { BASE_URL } from "./api/client";

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

/** Socket partagée vers le namespace /sla — créée au premier abonnement. */
export function getRealtimeSocket(): Socket {
  if (!socket) {
    socket = io(`${BASE_URL}/sla`, {
      transports: ["websocket", "polling"],
      reconnection: true,
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
