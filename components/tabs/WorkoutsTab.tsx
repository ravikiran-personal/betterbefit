import React from "react";
import type { DayType, TodayWorkout, SplitPlan } from "../../lib/fitness-engine/types";
import type { AppState, WorkoutSession, ExerciseLog } from "../../lib/app-types";
import type { GeneratedExercise } from "../../lib/fitness-engine";
import { getLocalDateISO, formatDisplayDate, cryptoSafeId } from "../../lib/utils";
import { getDayLabel } from "../../lib/page-helpers";
import { SwipeToDelete } from "../swipe-to-delete";

type MissedWorkoutState = "idle" | "asking" | "log_missed" | "skip_missed" | "show_today";

interface WorkoutsTabProps {
  missedWorkoutState: MissedWorkoutState;
  missedWorkoutInfo: { missedDate: string; missedDayType: DayType } | null;
  setMissedWorkoutState: React.Dispatch<React.SetStateAction<MissedWorkoutState>>;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  todayWorkout: TodayWorkout;
  splitPlan: SplitPlan;
  todaysExercises: GeneratedExercise[];
  exerciseNameOverrides: Record<string, string>;
  setExerciseNameOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  exerciseLogs: Record<string, Array<{ weight: string; reps: string; done: boolean }>>;
  setExerciseLogs: React.Dispatch<React.SetStateAction<Record<string, Array<{ weight: string; reps: string; done: boolean }>>>>;
  expandedAlternates: Record<string, boolean>;
  setExpandedAlternates: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  loggedExerciseCount: number;
  hasAnyLoggedSet: boolean;
  workoutCompletion: number;
  saveWorkout: () => void;
  workoutSaveMessage: string;
  workoutHistory: WorkoutSession[];
  expandedHistoryId: string | null;
  setExpandedHistoryId: React.Dispatch<React.SetStateAction<string | null>>;
  deleteWorkoutSession: (id: string) => void;
  loadWorkoutSession: (session: WorkoutSession) => void;
}

function MissedWorkoutCard({
  missedWorkoutState,
  missedWorkoutInfo,
  setMissedWorkoutState,
  setState
}: {
  missedWorkoutState: MissedWorkoutState;
  missedWorkoutInfo: { missedDate: string; missedDayType: DayType } | null;
  setMissedWorkoutState: React.Dispatch<React.SetStateAction<MissedWorkoutState>>;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  if (!missedWorkoutInfo) return null;

  function addMissedWorkoutEntry(completion: "skipped" | "completed" | "partial") {
    if (!missedWorkoutInfo) return;

    setState((prev) => ({
      ...prev,
      workoutHistory: [
        {
          id: cryptoSafeId(),
          date: missedWorkoutInfo.missedDate,
          dayType: missedWorkoutInfo.missedDayType,
          completion,
          totalVolume: completion === "completed" ? 1 : 0,
          exercises: []
        },
        ...prev.workoutHistory
      ]
    }));

    setMissedWorkoutState("show_today");
  }

  const cardStyle: React.CSSProperties = {
    width: "100%",
    background: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    border: "1px solid #E5E7EB"
  };

  const actionGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginTop: 18
  };

  const darkButtonStyle: React.CSSProperties = {
    background: "#F3F4F6",
    color: "#111827",
    border: 0,
    borderRadius: 14,
    minHeight: 52,
    fontWeight: 700,
    cursor: "pointer"
  };

  const greenButtonStyle: React.CSSProperties = {
    background: "#059669",
    color: "#FFFFFF",
    border: 0,
    borderRadius: 14,
    minHeight: 52,
    fontWeight: 700,
    cursor: "pointer"
  };

  if (missedWorkoutState === "asking") {
    return (
      <section className="missed-workout-card" style={cardStyle}>
        <h2 style={{ margin: 0 }}>We noticed you didn&apos;t log yesterday</h2>
        <p style={{ marginTop: 10, color: "#6B7280", lineHeight: 1.6 }}>
          Did you skip {missedWorkoutInfo.missedDayType} day or forget to log it?
        </p>

        <div style={actionGridStyle}>
          <button style={darkButtonStyle} onClick={() => addMissedWorkoutEntry("skipped")}>
            I skipped it
          </button>
          <button style={greenButtonStyle} onClick={() => setMissedWorkoutState("log_missed")}>
            I forgot to log
          </button>
        </div>
      </section>
    );
  }

  if (missedWorkoutState === "log_missed") {
    return (
      <section className="missed-workout-card" style={cardStyle}>
        <h2 style={{ margin: 0 }}>Log yesterday&apos;s {missedWorkoutInfo.missedDayType} session</h2>
        <p style={{ marginTop: 10, color: "#6B7280", lineHeight: 1.6 }}>Did you complete it?</p>

        <div style={{ ...actionGridStyle, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          <button style={greenButtonStyle} onClick={() => addMissedWorkoutEntry("completed")}>
            Yes
          </button>
          <button style={darkButtonStyle} onClick={() => addMissedWorkoutEntry("partial")}>
            Partial
          </button>
          <button style={darkButtonStyle} onClick={() => addMissedWorkoutEntry("skipped")}>
            No
          </button>
        </div>

        <button
          style={{
            marginTop: 14,
            background: "transparent",
            border: 0,
            color: "#6b7280",
            fontSize: 13,
            textDecoration: "underline",
            cursor: "pointer"
          }}
          onClick={() => setMissedWorkoutState("show_today")}
        >
          Skip logging, show today&apos;s workout
        </button>
      </section>
    );
  }

  return null;
}

export function WorkoutsTab({
  missedWorkoutState,
  missedWorkoutInfo,
  setMissedWorkoutState,
  setState,
  todayWorkout,
  splitPlan,
  todaysExercises,
  exerciseNameOverrides,
  setExerciseNameOverrides,
  exerciseLogs,
  setExerciseLogs,
  expandedAlternates,
  setExpandedAlternates,
  loggedExerciseCount,
  hasAnyLoggedSet,
  workoutCompletion,
  saveWorkout,
  workoutSaveMessage,
  workoutHistory,
  expandedHistoryId,
  setExpandedHistoryId,
  deleteWorkoutSession,
  loadWorkoutSession
}: WorkoutsTabProps) {
  return (
    <div className="grid compact-page">
      {(missedWorkoutState === "asking" || missedWorkoutState === "log_missed") && missedWorkoutInfo ? (
        <MissedWorkoutCard
          missedWorkoutState={missedWorkoutState}
          missedWorkoutInfo={missedWorkoutInfo}
          setMissedWorkoutState={setMissedWorkoutState}
          setState={setState}
        />
      ) : null}

      {todayWorkout.isRestDay ? (
        <section
          className="card"
          style={{ background: "#FFFFFF", borderRadius: 20, padding: 24, textAlign: "center" }}
        >
          <div style={{ fontSize: 42 }}>😴</div>
          <h2 style={{ marginBottom: 8 }}>Rest Day</h2>
          <p className="small" style={{ lineHeight: 1.7 }}>
            Recovery is where the gains happen. Sleep well, stay hydrated, hit your steps.
          </p>
          <p style={{ marginTop: 16, color: "#059669", fontWeight: 700 }}>
            Tomorrow: {splitPlan.weeklySchedule[todayWorkout.weekIndex === 6 ? 0 : todayWorkout.weekIndex + 1]} day
          </p>
        </section>
      ) : (
        <>
          <section className="card" style={{ background: "#FFFFFF", borderRadius: 20 }}>
            <div className="small">
              {new Date(getLocalDateISO() + "T00:00:00")
                .toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short" })
                .toUpperCase()}
            </div>

            <h2 style={{ marginTop: 8, marginBottom: 6 }}>
              {getDayLabel(todayWorkout.dayType)} Day
            </h2>

            <p className="small" style={{ margin: 0 }}>
              {({
                push: "Chest, shoulders, triceps",
                pull: "Back, rear delts, biceps",
                lower: "Quads, hamstrings, glutes, calves",
                full: "Full body — push, pull, squat, carry",
                upper: "Upper body strength and hypertrophy",
                legs: "Dedicated lower body",
                rest: "Recovery day"
              } as Record<string, string>)[todayWorkout.dayType] || todayWorkout.splitName}
            </p>

            <div style={{ marginTop: 14, color: "#059669", fontWeight: 700 }}>
              {loggedExerciseCount} / {todaysExercises.length} exercises logged
            </div>
          </section>

          {todaysExercises.length === 0 ? (
            <section className="card" style={{ background: "#FFFFFF", borderRadius: 20 }}>
              <h2 style={{ marginTop: 0 }}>No exercises found</h2>
              <p className="small" style={{ lineHeight: 1.7 }}>
                Apply a workout plan from Settings or adjust your split so today has exercises assigned.
              </p>
            </section>
          ) : null}

          {todaysExercises.map((exercise) => {
            const currentName = exerciseNameOverrides[exercise.exercise] || exercise.exercise;
            const sets = exerciseLogs[currentName] || [];
            const allSetsDone = sets.length > 0 && sets.every((set) => set.done);
            const alternatesOpen = !!expandedAlternates[exercise.exercise];

            return (
              <section
                key={exercise.exercise}
                className="card"
                style={{
                  background: "#FFFFFF",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  borderLeft: allSetsDone ? "4px solid #059669" : "4px solid transparent"
                }}
              >
                <div className="small" style={{ fontSize: 11, textTransform: "uppercase" }}>
                  {exercise.pattern}
                </div>

                <h3 style={{ marginTop: 6, marginBottom: 8, color: "#111827", fontSize: 16, fontWeight: 600 }}>
                  {currentName}
                </h3>

                <div style={{ color: "#059669", fontWeight: 700, fontSize: 13 }}>
                  Target: {exercise.sets} sets × {exercise.targetReps} reps
                </div>

                <button
                  type="button"
                  className="btn secondary"
                  style={{ marginTop: 8, padding: "4px 10px", fontSize: 12, minHeight: "auto", width: "auto" }}
                  onClick={() =>
                    setExpandedAlternates((prev) => ({
                      ...prev,
                      [exercise.exercise]: !prev[exercise.exercise]
                    }))
                  }
                >
                  Alternates {alternatesOpen ? "−" : "+"}
                </button>

                {alternatesOpen ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {[exercise.exercise, ...exercise.alternates]
                      .filter((name) => name !== currentName)
                      .map((alternate) => (
                        <button
                          key={alternate}
                          type="button"
                          onClick={() => {
                            setExerciseNameOverrides((prev) => ({ ...prev, [exercise.exercise]: alternate }));
                            setExerciseLogs((prev) => {
                              const old = prev[currentName] || [];
                              const next = { ...prev };
                              delete next[currentName];
                              next[alternate] = old;
                              return next;
                            });
                            setExpandedAlternates((prev) => ({ ...prev, [exercise.exercise]: false }));
                          }}
                          style={{
                            background: "#F3F4F6",
                            color: "#374151",
                            borderRadius: 999,
                            padding: "6px 10px",
                            fontSize: 12,
                            border: "none",
                            cursor: "pointer"
                          }}
                        >
                          {alternate}
                        </button>
                      ))}
                  </div>
                ) : null}

                <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                  {sets.map((set, setIndex) => (
                    <div
                      key={`${currentName}-${setIndex}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "70px 1fr 1fr 44px",
                        gap: 8,
                        alignItems: "center"
                      }}
                    >
                      <span className="small">Set {setIndex + 1}</span>

                      <input
                        className="input"
                        inputMode="decimal"
                        placeholder="kg"
                        value={set.weight}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, "");
                          setExerciseLogs((prev) => ({
                            ...prev,
                            [currentName]: (prev[currentName] || []).map((row, index) =>
                              index === setIndex ? { ...row, weight: value } : row
                            )
                          }));
                        }}
                      />

                      <input
                        className="input"
                        inputMode="numeric"
                        placeholder="reps"
                        value={set.reps}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, "");
                          setExerciseLogs((prev) => ({
                            ...prev,
                            [currentName]: (prev[currentName] || []).map((row, index) =>
                              index === setIndex ? { ...row, reps: value } : row
                            )
                          }));
                        }}
                      />

                      <button
                        type="button"
                        className="btn"
                        aria-label={set.done ? `Unmark set ${setIndex + 1} as done` : `Mark set ${setIndex + 1} as done`}
                        style={{
                          minHeight: 44,
                          padding: 0,
                          background: set.done ? "#059669" : "#F3F4F6",
                          color: set.done ? "#FFFFFF" : "#111827"
                        }}
                        onClick={() => {
                          setExerciseLogs((prev) => ({
                            ...prev,
                            [currentName]: (prev[currentName] || []).map((row, index) =>
                              index === setIndex ? { ...row, done: !row.done } : row
                            )
                          }));
                        }}
                      >
                        ✓
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {hasAnyLoggedSet ? (
            <button
              className="btn"
              style={{
                width: "100%",
                background: "#059669",
                color: "#FFFFFF",
                fontWeight: 700,
                borderRadius: 14,
                padding: 16
              }}
              onClick={saveWorkout}
            >
              Complete Workout
            </button>
          ) : null}

          {workoutSaveMessage ? (
            <div className="card" style={{ background: "#F0FDF4", color: "#059669" }}>
              {workoutSaveMessage}
            </div>
          ) : null}
        </>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Workout history</h2>
        {workoutHistory.length === 0 ? (
          <p className="small">No workouts logged yet. Complete today&apos;s workout to save your first session.</p>
        ) : (
          <div className="history-card-list">
            {workoutHistory.map((session) => {
              const isExpanded = expandedHistoryId === session.id;
              return (
                <SwipeToDelete
                  key={session.id}
                  className="history-swipe"
                  onDelete={() => deleteWorkoutSession(session.id)}
                >
                  <div className="history-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <strong>{formatDisplayDate(session.date)}</strong>
                        <div className="small">
                          {session.dayType ? `${getDayLabel(session.dayType)} day • ` : ""}
                          {session.completion ? `${session.completion} • ` : ""}
                          {session.totalVolume} total volume
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button
                          className="btn secondary"
                          style={{ width: 52, padding: 0, fontSize: 12, minHeight: 32, height: 32 }}
                          onClick={() => setExpandedHistoryId(isExpanded ? null : session.id)}
                        >
                          {isExpanded ? "Hide" : "View"}
                        </button>
                        {!todayWorkout.isRestDay && session.exercises.length > 0 ? (
                          <button
                            className="btn secondary"
                            style={{ width: 52, padding: 0, fontSize: 12, minHeight: 32, height: 32 }}
                            onClick={() => loadWorkoutSession(session)}
                          >
                            Load
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {isExpanded ? (
                      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                        {session.exercises.map((ex: ExerciseLog) => {
                          const loggedSets = (ex.workoutSets || []).filter((s) => s.weight !== "" || s.reps !== "");
                          if (loggedSets.length === 0) return null;
                          return (
                            <div key={ex.exercise} style={{ background: "#F9FAFB", borderRadius: 10, padding: "10px 12px" }}>
                              <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 6 }}>{ex.exercise}</div>
                              <div style={{ display: "grid", gap: 4 }}>
                                {loggedSets.map((s, i) => (
                                  <div key={i} className="small" style={{ color: "#6B7280" }}>
                                    Set {i + 1}: {s.weight !== "" ? `${s.weight} kg` : "—"} × {s.reps !== "" ? `${s.reps} reps` : "—"}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </SwipeToDelete>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
