/// <reference types="jest" />
import { AxiosError, AxiosHeaders } from "axios";

import { localizedProblemMessage, normalizeApiError } from "./reliability-errors";

describe("mobile API error normalization", () => {
  it.each([400, 401, 403, 404, 409, 422, 429, 500])("maps HTTP %s", (status) => {
    const error = new AxiosError("failed", undefined, undefined, undefined, {
      status,
      statusText: "failed",
      headers: new AxiosHeaders({ "x-request-id": "support-123" }),
      config: { headers: new AxiosHeaders() },
      data: {},
    });
    const problem = normalizeApiError(error, "en");
    expect(problem.code).toBe(String(status));
    expect(problem.requestId).toBe("support-123");
  });

  it("distinguishes timeout and network errors", () => {
    expect(normalizeApiError(new AxiosError("timeout", "ECONNABORTED"), "ar").code).toBe("TIMEOUT");
    expect(normalizeApiError(new AxiosError("offline"), "ar").code).toBe("NETWORK");
  });

  it("localizes the same problem without changing its code", () => {
    const problem = normalizeApiError(new AxiosError("offline"), "ar");
    expect(localizedProblemMessage(problem, "ar")).not.toBe(localizedProblemMessage(problem, "en"));
  });
});
