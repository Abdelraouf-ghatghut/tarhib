import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import React, { useEffect, useSyncExternalStore } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { Lang, SnowTheme } from "./theme";
import { localizedProblemMessage, type ApiProblem } from "./reliability-errors";
export { localizedProblemMessage, normalizeApiError, type ApiProblem } from "./reliability-errors";

type ReliabilityState = {
  online: boolean | null;
  lastSyncedAt: number | null;
  pendingMutations: number;
  notice: { kind: "success" | "error"; problem?: ApiProblem; at: number } | null;
};

let state: ReliabilityState = {
  online: null,
  lastSyncedAt: null,
  pendingMutations: 0,
  notice: null,
};
const listeners = new Set<() => void>();

function emit(patch: Partial<ReliabilityState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export const reliabilityEvents = {
  setOnline(online: boolean | null) {
    emit({ online });
  },
  mutationStarted() {
    emit({ pendingMutations: state.pendingMutations + 1, notice: null });
  },
  mutationSucceeded() {
    emit({
      online: true,
      lastSyncedAt: Date.now(),
      pendingMutations: Math.max(0, state.pendingMutations - 1),
      notice: { kind: "success", at: Date.now() },
    });
  },
  mutationFailed(problem: ApiProblem) {
    emit({
      online: problem.code === "NETWORK" ? false : state.online,
      pendingMutations: Math.max(0, state.pendingMutations - 1),
      notice: { kind: "error", problem, at: Date.now() },
    });
  },
  requestSucceeded() {
    emit({ online: true, lastSyncedAt: Date.now() });
  },
  clearNotice() {
    emit({ notice: null });
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReliabilityState(): ReliabilityState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function useConnectivityMonitor(): void {
  useEffect(
    () =>
      NetInfo.addEventListener((network) => {
        const online = Boolean(network.isConnected && network.isInternetReachable !== false);
        onlineManager.setOnline(online);
        reliabilityEvents.setOnline(online);
      }),
    [],
  );
}

export function ReliabilityBanner({ lang, theme }: { lang: Lang; theme: SnowTheme }) {
  const reliability = useReliabilityState();

  useEffect(() => {
    if (!reliability.notice || reliability.notice.kind === "error") return;
    const timer = setTimeout(() => reliabilityEvents.clearNotice(), 3000);
    return () => clearTimeout(timer);
  }, [reliability.notice]);

  const offline = reliability.online === false;
  const problem = reliability.notice?.kind === "error" ? reliability.notice.problem : null;
  const syncing = reliability.pendingMutations > 0;
  if (!offline && !problem && !syncing && reliability.notice?.kind !== "success") return null;

  const text = offline
    ? lang === "ar"
      ? "لا يوجد اتصال بالإنترنت — لن تُرسل العمليات حتى عودة الشبكة"
      : "Offline — actions will not be sent until the connection returns"
    : problem
      ? localizedProblemMessage(problem, lang)
      : syncing
        ? lang === "ar"
          ? "جارٍ تأكيد العملية من الخادم…"
          : "Waiting for server confirmation…"
        : lang === "ar"
          ? "تم تأكيد العملية من الخادم"
          : "Action confirmed by the server";
  const backgroundColor =
    offline || problem ? theme.danger : syncing ? theme.warning : theme.success;

  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor }]}>
      {syncing && !offline && !problem ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
      <View style={styles.copy}>
        <Text style={styles.message}>{text}</Text>
        {reliability.lastSyncedAt ? (
          <Text style={styles.reference}>
            {lang === "ar" ? "آخر مزامنة" : "Last sync"}:{" "}
            {new Date(reliability.lastSyncedAt).toLocaleTimeString(
              lang === "ar" ? "ar-LY" : "en-GB",
              { hour: "2-digit", minute: "2-digit" },
            )}
          </Text>
        ) : null}
        {problem?.requestId ? (
          <Text style={styles.reference}>
            {lang === "ar" ? "مرجع الدعم" : "Support reference"}: {problem.requestId}
          </Text>
        ) : null}
      </View>
      {problem ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => reliabilityEvents.clearNotice()}
          style={styles.close}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  copy: { flex: 1 },
  message: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", textAlign: "center" },
  reference: { color: "#FFFFFF", fontSize: 11, opacity: 0.9, textAlign: "center", marginTop: 2 },
  close: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  closeText: { color: "#FFFFFF", fontSize: 24, lineHeight: 26 },
});
