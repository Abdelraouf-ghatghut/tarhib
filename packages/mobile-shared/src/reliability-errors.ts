import { AxiosError } from "axios";

import type { Lang } from "./theme";

export type ApiProblem = {
  status: number | null;
  code: string;
  message: string;
  requestId: string | null;
  retryable: boolean;
};

const messages: Record<string, Record<Lang, string>> = {
  NETWORK: {
    ar: "تعذر الاتصال بالخادم. تحقق من الشبكة ثم أعد المحاولة.",
    en: "The server is unreachable. Check your connection and try again.",
  },
  TIMEOUT: {
    ar: "استغرقت العملية وقتًا طويلًا. تحقق من النتيجة قبل إعادة المحاولة.",
    en: "The request timed out. Check the result before trying again.",
  },
  "400": { ar: "البيانات المرسلة غير صالحة. راجع الحقول.", en: "Invalid data. Review the fields." },
  "401": { ar: "انتهت الجلسة. سجّل الدخول مجددًا.", en: "Your session expired. Sign in again." },
  "403": {
    ar: "ليس لديك صلاحية لتنفيذ هذه العملية.",
    en: "You are not allowed to perform this action.",
  },
  "404": { ar: "العنصر المطلوب غير موجود أو تم حذفه.", en: "The requested item no longer exists." },
  "409": {
    ar: "تغيّرت البيانات على الخادم. حدّث الصفحة قبل المتابعة.",
    en: "Server data changed. Refresh before continuing.",
  },
  "422": {
    ar: "تعذر اعتماد البيانات. راجع القيم المدخلة.",
    en: "The data could not be accepted. Review your input.",
  },
  "429": {
    ar: "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.",
    en: "Too many attempts. Wait briefly and try again.",
  },
  "500": {
    ar: "حدث خطأ في الخادم. أعد المحاولة لاحقًا.",
    en: "A server error occurred. Try again later.",
  },
  DEFAULT: {
    ar: "تعذر إتمام العملية. أعد المحاولة.",
    en: "The action could not be completed. Try again.",
  },
};

export function localizedProblemMessage(problem: ApiProblem, lang: Lang): string {
  return messages[problem.code]?.[lang] ?? messages.DEFAULT![lang];
}

export function normalizeApiError(error: unknown, lang: Lang): ApiProblem {
  const axiosError = error instanceof AxiosError ? error : null;
  const status = axiosError?.response?.status ?? null;
  const code =
    axiosError?.code === "ECONNABORTED" || axiosError?.code === "ETIMEDOUT"
      ? "TIMEOUT"
      : axiosError && !axiosError.response
        ? "NETWORK"
        : status && messages[String(status)]
          ? String(status)
          : "DEFAULT";
  const headers = axiosError?.response?.headers as Record<string, unknown> | undefined;
  const requestIdValue = headers?.["x-request-id"] ?? headers?.["x-correlation-id"];
  return {
    status,
    code,
    message: messages[code]?.[lang] ?? messages.DEFAULT![lang],
    requestId: typeof requestIdValue === "string" ? requestIdValue : null,
    retryable:
      code === "NETWORK" ||
      code === "TIMEOUT" ||
      status === 409 ||
      status === 429 ||
      (status ?? 0) >= 500,
  };
}
