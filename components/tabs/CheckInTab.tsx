import React from "react";
import type { DailyLog } from "../../lib/app-types";
import type { WeeklyNutritionAdjustment } from "../../lib/fitness-engine/intelligence";
import { numberOrNull, formatDisplayDate, formatNumber } from "../../lib/utils";
import { todayISO } from "../../lib/utils";
import { NumericInput } from "../numeric-input";
import { Field } from "../field";

interface CheckInTabProps {
  avgWeight: number | null;
  avgWaist: number | null;
  displaySteps: number | null;
  dailyLogs: DailyLog[];
  expandedDays: Record<string, boolean>;
  setExpandedDays: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  todayStr: string;
  updateDaily: (index: number, key: keyof DailyLog, value: string | number | "") => void;
  resetWeek: () => void;
  weeklyNutritionAdjustment: WeeklyNutritionAdjustment;
  applyWeeklyNutritionAdjustment: () => void;
  recommendation: string;
}

export function CheckInTab({
  avgWeight,
  avgWaist,
  displaySteps,
  dailyLogs,
  expandedDays,
  setExpandedDays,
  todayStr,
  updateDaily,
  resetWeek,
  weeklyNutritionAdjustment,
  applyWeeklyNutritionAdjustment,
  recommendation
}: CheckInTabProps) {
  return (
    <div className="grid compact-page">
      {/* Weekly metrics summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <div className="checkin-metric-pill">
          <span className="checkin-metric-label">Avg Weight</span>
          <span className="checkin-metric-value">{formatNumber(avgWeight, "kg")}</span>
        </div>
        <div className="checkin-metric-pill">
          <span className="checkin-metric-label">Avg Waist</span>
          <span className="checkin-metric-value">{formatNumber(avgWaist, "cm")}</span>
        </div>
        <div className="checkin-metric-pill">
          <span className="checkin-metric-label">Avg Steps</span>
          <span className="checkin-metric-value">{formatNumber(displaySteps)}</span>
        </div>
      </div>

      {/* 7-day log */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Daily Log</h2>
          <button className="btn secondary" style={{ padding: "4px 12px", fontSize: 12, minHeight: "auto" }} onClick={resetWeek}>
            Reset
          </button>
        </div>

        <div className="checkin-list" style={{ padding: "8px 0" }}>
          {dailyLogs.map((row, index) => {
            const isOpen = !!expandedDays[`checkin-${row.date}-${index}`];
            const hasWeight = numberOrNull(row.weight) !== null;
            const hasSteps = numberOrNull(row.steps) !== null;
            const hasAnyMetric = hasWeight || hasSteps;
            const isComplete = hasWeight && hasSteps;
            const statusColor = isComplete ? "#059669" : hasAnyMetric ? "#D97706" : "#D1D5DB";
            const isToday = row.date === todayStr;

            return (
              <div key={row.date + index} style={{ borderBottom: "1px solid #F9FAFB" }}>
                <button
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                  onClick={() =>
                    setExpandedDays((prev) => ({
                      ...prev,
                      [`checkin-${row.date}-${index}`]: !prev[`checkin-${row.date}-${index}`]
                    }))
                  }
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: 14, color: "#111827" }}>{formatDisplayDate(row.date || todayISO())}</strong>
                      {isToday && <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "#F0FDF4", padding: "1px 7px", borderRadius: 999 }}>Today</span>}
                    </div>
                    <div className="small" style={{ marginTop: 2, color: "#9CA3AF" }}>
                      {hasAnyMetric
                        ? [
                            hasWeight ? `${row.weight} kg` : null,
                            hasSteps ? `${row.steps} steps` : null
                          ].filter(Boolean).join(" · ")
                        : "No data logged"}
                    </div>
                  </div>
                  <span style={{ color: "#9CA3AF", fontSize: 16 }}>{isOpen ? "−" : "+"}</span>
                </button>

                {isOpen ? (
                  <div style={{ padding: "0 20px 20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <Field label="Weight (kg)">
                        <NumericInput value={row.weight} onChange={(v) => updateDaily(index, "weight", v)} />
                      </Field>
                      <Field label="Waist (cm)">
                        <NumericInput value={row.waist} onChange={(v) => updateDaily(index, "waist", v)} />
                      </Field>
                      <Field label="Steps">
                        <NumericInput value={row.steps} onChange={(v) => updateDaily(index, "steps", v)} />
                      </Field>
                      <Field label="Cardio (min)">
                        <NumericInput value={row.cardioMinutes} onChange={(v) => updateDaily(index, "cardioMinutes", v)} />
                      </Field>

                    </div>
                    <div style={{ marginTop: 10 }}>
                      <Field label="Date">
                        <input
                          className="input"
                          type="date"
                          value={row.date || todayISO()}
                          onChange={(e) => updateDaily(index, "date", e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Nutrition intelligence */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Weekly insight</h2>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", background: "#F3F4F6", padding: "2px 8px", borderRadius: 999, textTransform: "uppercase" }}>
            {weeklyNutritionAdjustment.confidence}
          </span>
        </div>
        <p style={{ margin: "0 0 12px", lineHeight: 1.7, color: "#374151" }}>
          <strong>{weeklyNutritionAdjustment.title}</strong>: {weeklyNutritionAdjustment.summary}
        </p>
        {weeklyNutritionAdjustment.calorieDelta !== 0 ? (
          <button className="btn" onClick={applyWeeklyNutritionAdjustment}>
            Apply {weeklyNutritionAdjustment.calorieDelta > 0 ? "+" : ""}{weeklyNutritionAdjustment.calorieDelta} kcal adjustment
          </button>
        ) : null}
      </div>

      {/* Decision rule */}
      <div className="card" style={{ borderLeft: "3px solid #059669" }}>
        <p className="small" style={{ margin: 0, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>This week&apos;s call</p>
        <p style={{ margin: 0, lineHeight: 1.7, color: "#111827" }}>{recommendation}</p>
      </div>
    </div>
  );
}
