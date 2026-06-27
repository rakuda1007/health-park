import {
  TELEMETRY_ANONYMOUS_ID_LS_KEY,
  TELEMETRY_ANONYMOUS_ID_RE,
} from "./constants";

function newAnonymousId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** この端末の匿名 ID。初回生成して localStorage に保持する。 */
export function getOrCreateAnonymousTelemetryId(): string {
  if (typeof window === "undefined") {
    throw new Error("getOrCreateAnonymousTelemetryId はブラウザ専用です。");
  }
  const existing = localStorage.getItem(TELEMETRY_ANONYMOUS_ID_LS_KEY);
  if (existing && TELEMETRY_ANONYMOUS_ID_RE.test(existing)) {
    return existing;
  }
  const id = newAnonymousId();
  localStorage.setItem(TELEMETRY_ANONYMOUS_ID_LS_KEY, id);
  return id;
}
