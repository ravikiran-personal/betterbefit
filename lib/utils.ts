import type { Sex, Lifestyle, Goal } from "./fitness-engine/types";

export function cryptoSafeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function todayISO(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function getLocalDateISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

export function formatDisplayDate(dateISO: string): string {
  const date = new Date(dateISO + "T00:00:00");
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function cleanNumber(value: unknown): number | "" {
  if (value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const num = Number(value);
    return Number.isFinite(num) ? num : "";
  }
  return "";
}

export function numberOrDefault(value: unknown, fallback: number): number {
  const cleaned = cleanNumber(value);
  return cleaned === "" ? fallback : cleaned;
}

export function numberOrNull(value: number | "" | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function average(values: Array<number | null>): number | null {
  const clean = values.filter((x): x is number => x !== null);
  if (!clean.length) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

export function formatNumber(value: number | null, suffix = ""): string {
  if (value === null) return "-";
  return `${value.toFixed(1)}${suffix ? ` ${suffix}` : ""}`;
}

export function isSex(value: unknown): value is Sex {
  return value === "male" || value === "female";
}

export function isLifestyle(value: unknown): value is Lifestyle {
  return value === "sedentary" || value === "light" || value === "moderate" || value === "active";
}

export function isGoal(value: unknown): value is Goal {
  return value === "recomp" || value === "maintain" || value === "lose_weight" || value === "be_more_active";
}
