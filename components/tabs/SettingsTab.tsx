import React from "react";
import type { Settings, Sex, Lifestyle, Goal } from "../../lib/fitness-engine/types";
import type { FitnessPlan } from "../../lib/fitness-engine";
import { NumericInput } from "../numeric-input";
import { SwipeToDelete } from "../swipe-to-delete";
import { Field } from "../field";

interface SettingsTabProps {
  settingsStep: "profile" | "plan";
  setSettingsStep: React.Dispatch<React.SetStateAction<"profile" | "plan">>;
  settings: Settings;
  updateSettings: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  generatedPlan: FitnessPlan;
  applyGeneratedFullPlan: () => void;
  applyGeneratedNutritionPlan: () => void;
  applyGeneratedWorkoutPlan: () => void;
  targetReason: string;
  isCalculatingTargets: boolean;
  calculateTargetsWithAI: () => void;
  exportBackup: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importBackup: (file: File) => void;
  resetAllLogs: () => void;
}

export function SettingsTab({
  settingsStep,
  setSettingsStep,
  settings,
  updateSettings,
  generatedPlan,
  applyGeneratedFullPlan,
  applyGeneratedNutritionPlan,
  applyGeneratedWorkoutPlan,
  targetReason,
  isCalculatingTargets,
  calculateTargetsWithAI,
  exportBackup,
  fileInputRef,
  importBackup,
  resetAllLogs
}: SettingsTabProps) {
  return (
    <div className="grid compact-page">
      {/* Step indicator */}
      <div style={{ display: "flex", gap: 0, borderRadius: 12, overflow: "hidden", background: "#F3F4F6" }}>
        <button
          style={{
            flex: 1,
            padding: "12px 0",
            border: "none",
            background: settingsStep === "profile" ? "#111827" : "transparent",
            color: settingsStep === "profile" ? "#FFFFFF" : "#6B7280",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.15s"
          }}
          onClick={() => setSettingsStep("profile")}
        >
          1 · About you
        </button>
        <button
          style={{
            flex: 1,
            padding: "12px 0",
            border: "none",
            background: settingsStep === "plan" ? "#111827" : "transparent",
            color: settingsStep === "plan" ? "#FFFFFF" : "#6B7280",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.15s"
          }}
          onClick={() => setSettingsStep("plan")}
        >
          2 · Your plan
        </button>
      </div>

      {settingsStep === "profile" ? (
        <>
          {/* Profile & goal */}
          <div className="card">
            <p className="settings-section-label">Who you are</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Weight (kg)">
                <NumericInput value={settings.weightKg} onChange={(v) => updateSettings("weightKg", v === "" ? 0 : v)} />
              </Field>
              <Field label="Height (cm)">
                <NumericInput value={settings.heightCm} onChange={(v) => updateSettings("heightCm", v === "" ? 0 : v)} />
              </Field>
              <Field label="Age">
                <NumericInput value={settings.age} onChange={(v) => updateSettings("age", v === "" ? 0 : v)} />
              </Field>
              <Field label="Sex">
                <select className="input" value={settings.sex} onChange={(e) => updateSettings("sex", e.target.value as Sex)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Daily activity level">
                <select className="input" value={settings.lifestyle} onChange={(e) => updateSettings("lifestyle", e.target.value as Lifestyle)}>
                  <option value="sedentary">Sedentary — mostly sitting</option>
                  <option value="light">Light — occasional walks</option>
                  <option value="moderate">Moderate — on feet most of the day</option>
                  <option value="active">Active — physical job or sport</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Goal */}
          <div className="card">
            <p className="settings-section-label">What you&apos;re working toward</p>
            <Field label="Primary goal">
              <select className="input" value={settings.goal} onChange={(e) => updateSettings("goal", e.target.value as Goal)}>
                <option value="recomp">Build muscle + lose fat (recomp)</option>
                <option value="maintain">Maintain my current physique</option>
                <option value="lose_weight">Lose weight</option>
                <option value="be_more_active">Just be more active</option>
              </select>
            </Field>
          </div>

          {/* Training */}
          <div className="card">
            <p className="settings-section-label">Training preferences</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Days / week">
                <select className="input" value={settings.workoutsPerWeek} onChange={(e) => updateSettings("workoutsPerWeek", Number(e.target.value))}>
                  <option value={2}>2 days</option>
                  <option value={3}>3 days</option>
                  <option value={4}>4 days</option>
                  <option value={5}>5 days</option>
                </select>
              </Field>
              <Field label="Experience">
                <select className="input" value={settings.experienceLevel} onChange={(e) => updateSettings("experienceLevel", e.target.value as Settings["experienceLevel"])}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </Field>
              <Field label="Session length">
                <select className="input" value={settings.sessionLength} onChange={(e) => updateSettings("sessionLength", Number(e.target.value))}>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={75}>75 min</option>
                </select>
              </Field>
              <Field label="Equipment">
                <select className="input" value={settings.equipmentAccess} onChange={(e) => updateSettings("equipmentAccess", e.target.value as Settings["equipmentAccess"])}>
                  <option value="full_gym">Full gym</option>
                  <option value="machines">Machines only</option>
                  <option value="dumbbells">Dumbbells</option>
                  <option value="home">Home setup</option>
                </select>
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Training focus">
                <select className="input" value={settings.trainingEmphasis} onChange={(e) => updateSettings("trainingEmphasis", e.target.value as Settings["trainingEmphasis"])}>
                  <option value="aesthetic">Aesthetic — look better</option>
                  <option value="strength">Strength — lift more</option>
                  <option value="mobility">Mobility — move better</option>
                  <option value="fat_loss_support">Fat-loss support</option>
                </select>
              </Field>
              <Field label="Injuries / limitations">
                <input className="input" value={settings.limitations} onChange={(e) => updateSettings("limitations", e.target.value)} placeholder="e.g. knee pain, none" />
              </Field>
            </div>
          </div>

          <button
            className="btn"
            style={{ background: "#111827", color: "#FFFFFF", borderRadius: 14, padding: 16, fontWeight: 700, fontSize: 15 }}
            onClick={() => setSettingsStep("plan")}
          >
            See what&apos;s best for me →
          </button>
        </>
      ) : (
        <>
          {/* Plan preview */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Your personalised plan</h2>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "#F0FDF4", padding: "3px 10px", borderRadius: 999, textTransform: "uppercase" }}>
                {generatedPlan.nutrition.confidence} confidence
              </span>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Nutrition</p>
                <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>{generatedPlan.nutrition.calories} kcal · P {generatedPlan.nutrition.protein}g · C {generatedPlan.nutrition.carbs}g · F {generatedPlan.nutrition.fats}g</p>
              </div>
              <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Workout</p>
                <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>{generatedPlan.workout.split} · {generatedPlan.workout.exercises.length} exercises</p>
              </div>
              <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cardio</p>
                <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>{generatedPlan.cardio.weeklyMinutes} min / week</p>
              </div>
            </div>

            <div style={{ margin: "16px 0", borderTop: "1px solid #F3F4F6", paddingTop: 16 }}>
              {[...generatedPlan.nutrition.reasoning, ...generatedPlan.workout.reasoning].slice(0, 4).map((reason) => (
                <div key={reason} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ color: "#059669", fontSize: 14, marginTop: 1 }}>✓</span>
                  <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{reason}</p>
                </div>
              ))}
            </div>

            <button
              className="btn"
              style={{ width: "100%", background: "#059669", color: "#FFFFFF", borderRadius: 14, padding: 16, fontWeight: 700, fontSize: 15, marginBottom: 10 }}
              onClick={() => { applyGeneratedFullPlan(); setSettingsStep("profile"); }}
            >
              Apply full plan — let&apos;s go
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button className="btn secondary" onClick={applyGeneratedNutritionPlan}>Nutrition only</button>
              <button className="btn secondary" onClick={applyGeneratedWorkoutPlan}>Workout only</button>
            </div>
          </div>

          {/* Manual override for targets */}
          <div className="card">
            <p className="settings-section-label">Override targets manually</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Calories">
                <NumericInput value={settings.targetCalories} onChange={(v) => updateSettings("targetCalories", v === "" ? 0 : v)} />
              </Field>
              <Field label="Protein (g)">
                <NumericInput value={settings.proteinTarget} onChange={(v) => updateSettings("proteinTarget", v === "" ? 0 : v)} />
              </Field>
              <Field label="Carbs (g)">
                <NumericInput value={settings.carbTarget} onChange={(v) => updateSettings("carbTarget", v === "" ? 0 : v)} />
              </Field>
              <Field label="Fat (g)">
                <NumericInput value={settings.fatTarget} onChange={(v) => updateSettings("fatTarget", v === "" ? 0 : v)} />
              </Field>
              <Field label="Step target">
                <NumericInput value={settings.stepTarget} onChange={(v) => updateSettings("stepTarget", v === "" ? 0 : v)} />
              </Field>
              <Field label="Step baseline">
                <NumericInput value={settings.currentStepBaseline} onChange={(v) => updateSettings("currentStepBaseline", v === "" ? 0 : v)} />
              </Field>
            </div>
          </div>

          {targetReason ? (
            <div className="card" style={{ background: "#F9FAFB" }}>
              <p className="settings-section-label">AI reason</p>
              <p className="small" style={{ lineHeight: 1.6, margin: 0 }}>{targetReason}</p>
            </div>
          ) : null}

          <button className="btn secondary" onClick={calculateTargetsWithAI} disabled={isCalculatingTargets}>
            {isCalculatingTargets ? "Calculating..." : "Recalculate with AI"}
          </button>

          <button
            style={{ background: "none", border: "none", color: "#9CA3AF", fontSize: 13, padding: "8px 0", cursor: "pointer", textAlign: "left" }}
            onClick={() => setSettingsStep("profile")}
          >
            ← Back to profile
          </button>
        </>
      )}

      {/* Always-visible bottom section */}
      <div className="card">
        <p className="settings-section-label">Data</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <button className="btn secondary" onClick={exportBackup}>Export backup</button>
          <button className="btn secondary" onClick={() => fileInputRef.current?.click()}>Import backup</button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importBackup(file);
          }}
        />
        <SwipeToDelete
          className="settings-reset-swipe"
          onDelete={resetAllLogs}
        >
          <div className="card settings-reset-card">
            <strong>Reset all logs</strong>
            <p className="small">Swipe left to clear check-ins, workouts and nutrition logs.</p>
          </div>
        </SwipeToDelete>
      </div>
    </div>
  );
}
