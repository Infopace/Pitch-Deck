/**
 * True only for a request that got no response at all — no internet, the
 * server unreachable, DNS/CORS failure, a timeout. False for anything the
 * server actually answered (a 401, a 404, a 500), since those are real
 * responses with their own meaning, not a connectivity problem.
 *
 * Axios's own tell for this: `err.request` exists (the request went out)
 * but `err.response` never arrived.
 */
export function isNetworkError(err: unknown): boolean {
  const e = err as { response?: unknown; request?: unknown; code?: string; message?: string } | null | undefined;
  if (!e || typeof e !== "object") return false;
  if (e.response) return false;
  return e.code === "ERR_NETWORK" || e.code === "ECONNABORTED" || e.message === "Network Error" || !!e.request;
}
