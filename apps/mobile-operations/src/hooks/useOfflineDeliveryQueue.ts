import NetInfo from "@react-native-community/netinfo";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import { transitionDeliveryTask } from "@tarhib/mobile-shared";

export type OfflineDeliveryProof = {
  taskId: string;
  recipientName: string;
  recipientCode?: string;
  clientRequestId: string;
  occurredAt: string;
};

const STORAGE_KEY = "tarhib.operations.pending-deliveries.v1";

async function readQueue(): Promise<OfflineDeliveryProof[]> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OfflineDeliveryProof[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: OfflineDeliveryProof[]): Promise<void> {
  if (!queue.length) {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(queue));
}

export function useOfflineDeliveryQueue(onSynced: () => void) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    setPendingCount((await readQueue()).length);
  }, []);

  const enqueue = useCallback(async (proof: OfflineDeliveryProof) => {
    const queue = await readQueue();
    if (!queue.some((item) => item.clientRequestId === proof.clientRequestId)) {
      queue.push(proof);
      await writeQueue(queue);
    }
    setPendingCount(queue.length);
  }, []);

  const flush = useCallback(async () => {
    const network = await NetInfo.fetch();
    if (!network.isConnected || network.isInternetReachable === false) return;
    const queue = await readQueue();
    if (!queue.length) return;
    setSyncing(true);
    const remaining: OfflineDeliveryProof[] = [];
    for (const proof of queue) {
      try {
        await transitionDeliveryTask(proof.taskId, "deliver", undefined, undefined, proof);
      } catch {
        remaining.push(proof);
      }
    }
    await writeQueue(remaining);
    setPendingCount(remaining.length);
    setSyncing(false);
    if (remaining.length < queue.length) onSynced();
  }, [onSynced]);

  useEffect(() => {
    void refreshCount();
    return NetInfo.addEventListener((network) => {
      if (network.isConnected && network.isInternetReachable !== false) void flush();
    });
  }, [flush, refreshCount]);

  return { enqueue, flush, pendingCount, syncing };
}
