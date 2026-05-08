import { useState, useEffect, useRef } from "react";
import type { Tab } from "../../lib/app-types";
import { NumericInput } from "../numeric-input";

interface DashboardTabProps {
  greeting: string;
  todayDisplayDate: string;
  currentStreak: number;
  dayScore: number;
  dayScoreColor: string;
  dayScoreCircumference: number;
  dayScoreOffset: number;
  completedTasks: number;
  dailyTasks: Array<{ id: string; done: boolean; label: string; tab: Tab }>;
  consistencyMsg: { text: string; color: string };
  effectiveProtein: number | null;
  effectiveCalories: number | null;
  displaySteps: number | null;
  workoutCompletion: number;
  proteinTarget: number;
  stepTarget: number;
  targetCalories: number;
  todayWeight: string | number | "";
  todaySteps: string | number | "";
  updateTodayMetric: (key: "weight" | "steps", value: string | number | "") => void;
  setTab: (tab: Tab) => void;
}

export function DashboardTab({
  greeting,
  todayDisplayDate,
  currentStreak,
  dayScore,
  dayScoreColor,
  dayScoreCircumference,
  dayScoreOffset,
  completedTasks,
  dailyTasks,
  consistencyMsg,
  effectiveProtein,
  effectiveCalories,
  displaySteps,
  workoutCompletion,
  proteinTarget,
  stepTarget,
  targetCalories,
  todayWeight,
  todaySteps,
  updateTodayMetric,
  setTab
}: DashboardTabProps) {
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const prevDoneRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const newlyDone: string[] = [];
    dailyTasks.forEach((task) => {
      if (task.done && !prevDoneRef.current[task.id]) {
        newlyDone.push(task.id);
      }
    });
    prevDoneRef.current = Object.fromEntries(dailyTasks.map((t) => [t.id, t.done]));

    if (newlyDone.length > 0) {
      setCompletingIds((prev) => new Set([...prev, ...newlyDone]));
      setTimeout(() => {
        setCompletingIds((prev) => {
          const next = new Set(prev);
          newlyDone.forEach((id) => next.delete(id));
          return next;
        });
      }, 450);
    }
  }, [dailyTasks]);

  return (
    <div className="today-dashboard">
      <section className="today-header">
        <div>
          <h1>{greeting}</h1>
          <p>{todayDisplayDate}</p>
        </div>

        {currentStreak > 0 ? (
          <div className="today-streak-pill">{currentStreak} day streak</div>
        ) : null}
      </section>

      <section className="day-score-card">
        <div className="day-score-ring">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="54" fill="none" stroke="#E5E7EB" strokeWidth="10" />
            <circle
              cx="70"
              cy="70"
              r="54"
              fill="none"
              stroke={dayScoreColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={dayScoreCircumference}
              strokeDashoffset={dayScoreOffset}
              transform="rotate(-90 70 70)"
            />
          </svg>

          <div className="day-score-center">
            <strong>{dayScore}%</strong>
            <span>today</span>
          </div>
        </div>

        <p className="day-score-subtext">
          {completedTasks} of {dailyTasks.length} tasks done
        </p>
      </section>

      <section className="today-task-list">
        {dailyTasks.map((task) => (
          <button
            key={task.id}
            className={`today-task-card ${task.done ? "done" : ""} ${completingIds.has(task.id) ? "task-completing" : ""}`}
            onClick={() => setTab(task.tab)}
          >
            <span className="today-task-check">{task.done ? "✓" : ""}</span>
            <span className="today-task-label">{task.label}</span>
            <span className="today-task-arrow">›</span>
          </button>
        ))}
      </section>

      <section className="quick-log-card">
        <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9CA3AF" }}>Today&apos;s log</p>
        <div className="quick-log-grid">
          <div>
            <label className="label">Weight (kg)</label>
            <NumericInput value={todayWeight} onChange={(v) => updateTodayMetric("weight", v)} />
          </div>
          <div>
            <label className="label">Steps</label>
            <NumericInput value={todaySteps} onChange={(v) => updateTodayMetric("steps", v)} />
          </div>
        </div>
      </section>

      <section className="consistency-card" style={{ borderLeftColor: consistencyMsg.color }}>
        <p className="consistency-text" style={{ color: consistencyMsg.color }}>{consistencyMsg.text}</p>
      </section>

      <section
        className="priority-card"
        style={{
          borderLeftColor:
            (effectiveProtein ?? 0) < proteinTarget - 20 ||
            (displaySteps ?? 0) < stepTarget - 2000 ||
            workoutCompletion < 50 ||
            (effectiveCalories !== null && effectiveCalories > targetCalories + 150)
              ? "#D97706"
              : "#059669"
        }}
      >
        {(() => {
          const proteinGap = Math.round(proteinTarget - (effectiveProtein ?? 0));
          const stepGap = Math.round(stepTarget - (displaySteps ?? 0)).toLocaleString();

          if (proteinGap > 20) {
            return (
              <>
                <div className="priority-top">
                  <span className="priority-icon">🥩</span>
                  <span className="priority-label">PROTEIN GAP</span>
                </div>
                <p className="priority-action">
                  Add {proteinGap}g of protein today. Try chicken breast, eggs, paneer or whey.
                </p>
              </>
            );
          }

          if (stepTarget - (displaySteps ?? 0) > 2000) {
            return (
              <>
                <div className="priority-top">
                  <span className="priority-icon">👟</span>
                  <span className="priority-label">STEP GAP</span>
                </div>
                <p className="priority-action">
                  Take a 15-minute walk after your next meal to close {stepGap} steps.
                </p>
              </>
            );
          }

          if (workoutCompletion < 50) {
            return (
              <>
                <div className="priority-top">
                  <span className="priority-icon">🏋️</span>
                  <span className="priority-label">WORKOUT</span>
                </div>
                <p className="priority-action">
                  Open your workout tab and log today&apos;s session.
                </p>
              </>
            );
          }

          if (effectiveCalories !== null && effectiveCalories > targetCalories + 150) {
            return (
              <>
                <div className="priority-top">
                  <span className="priority-icon">🍽️</span>
                  <span className="priority-label">CALORIES HIGH</span>
                </div>
                <p className="priority-action">
                  Trim one meal — reduce oil, rice or sugar to get closer to your target.
                </p>
              </>
            );
          }

          return (
            <>
              <div className="priority-top">
                <span className="priority-icon">✅</span>
                <span className="priority-label">ON TRACK</span>
              </div>
              <p className="priority-action">
                You&apos;re doing everything right today. Stay consistent and let the process work.
              </p>
            </>
          );
        })()}

        <div className="priority-footer">
          {(proteinTarget - (effectiveProtein ?? 0)) > 20
            ? "Open Nutrition to log a meal"
            : (stepTarget - (displaySteps ?? 0)) > 2000
            ? "Open Check-in to log steps"
            : workoutCompletion < 50
            ? "Open Train to log your session"
            : (effectiveCalories !== null && effectiveCalories > targetCalories + 150)
            ? "Open Nutrition to trim a meal"
            : null}
        </div>
      </section>
    </div>
  );
}
