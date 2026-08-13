import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import { normalizeApiError, reliabilityEvents } from "../reliability";

const DEFAULT_BASE_URL = Platform.select({
  android: "http://10.0.2.2:3000",
  default: "http://localhost:3000",
});

// EXPO_PUBLIC_* env vars are inlined at build time by Expo — set this to the
// LAN IP of the backend when testing on a physical device / pilot branch.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL;

// Sans timeout, axios attend indéfiniment (pas de défaut côté lib) — sur
// réseau mobile dégradé (signal faible, bascule wifi/cellulaire), une requête
// pendante bloquait l'UI (spinner infini) sans jamais déclencher le retry/
// l'état d'erreur (PR-1.8). 15s couvre large les endpoints les plus lourds
// mesurés (rapports < 10ms côté serveur, marge pour la latence réseau).
export const api = axios.create({ baseURL: BASE_URL, timeout: 15_000 });

type TokenHandlers = {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onTokensRefreshed: (accessToken: string, refreshToken: string, expiresIn: number) => void;
  onSessionExpired: () => void;
};

// Wired once by the auth store at startup — kept out-of-band to avoid a
// circular import between the client and the store (the client needs to
// read tokens the store owns; the store needs to call the client).
let handlers: TokenHandlers = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  onTokensRefreshed: () => {},
  onSessionExpired: () => {},
};

export function configureApiClient(next: TokenHandlers): void {
  handlers = next;
}

// Utilisé par realtime.ts pour le handshake WebSocket (PR-0.6a) — toujours le
// token COURANT (pas figé à la connexion), réévalué à chaque tentative de
// (re)connexion.
export function getCurrentAccessToken(): string | null {
  return handlers.getAccessToken();
}

api.interceptors.request.use((config) => {
  const token = handlers.getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  const retriedConfig = config as InternalAxiosRequestConfig & { _retry?: boolean };
  if ((config.method ?? "get").toLowerCase() !== "get" && !retriedConfig._retry) {
    reliabilityEvents.mutationStarted();
  }
  return config;
});

// Never intercept the auth endpoints themselves — a 401 there means the
// credentials/refresh-token are actually invalid, not "access token expired".
const AUTH_ENDPOINTS = ["/auth/login", "/auth/refresh", "/auth/otp/"];

// De-dupes concurrent 401s into a single in-flight refresh call, mirroring
// the Flutter api_client.dart Dio interceptor this replaces.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = handlers.getRefreshToken();
    if (!refreshToken) return null;
    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        { refreshToken },
        { timeout: 15_000 },
      );
      handlers.onTokensRefreshed(data.accessToken, data.refreshToken, data.expiresIn);
      return data.accessToken as string;
    } catch {
      handlers.onSessionExpired();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => {
    if ((response.config.method ?? "get").toLowerCase() === "get")
      reliabilityEvents.requestSucceeded();
    else reliabilityEvents.mutationSucceeded();
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthEndpoint = !!config?.url && AUTH_ENDPOINTS.some((e) => config.url!.includes(e));

    if (error.response?.status === 401 && config && !isAuthEndpoint && !config._retry) {
      config._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        config.headers.set("Authorization", `Bearer ${newToken}`);
        return api(config);
      }
    }
    const isMutation = !!config && (config.method ?? "get").toLowerCase() !== "get";
    if (isMutation) reliabilityEvents.mutationFailed(normalizeApiError(error, "ar"));
    else if (!error.response) reliabilityEvents.setOnline(false);
    return Promise.reject(error);
  },
);
