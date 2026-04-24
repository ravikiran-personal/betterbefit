"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Tab = "dashboard" | "workouts" | "nutrition" | "checkin" | "settings";

type DailyLog = {
  date: string;
  weight: number | "";
  steps: number | "";
  calories: number | "";
  protein: number | "";
  cardioMinutes: number | "";
  waist: number | "";
};

type ExerciseLog = {
  id: string;
  day: string;
  exercise: string;
  sets: number;
  targetReps: string;
  weight: number | "";
  repsDone: string;
  rpe: number | "";
  notes: string;
};

type FoodItem = {
  id: string;
  meal: string;
  food: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

type Settings = {
  weightKg: number;
  heightCm: number;
  targetCalories: number;
  proteinTarget: number;
  stepTarget: number;
  currentStepBaseline: number;
};

const STORAGE_KEY = "recomp-tracker-v1";

const defaultSettings: Settings = {
  weightKg: 86.5,
  heightCm: 181,
  targetCalories: 2000,
  proteinTarget: 160,
  stepTarget: 10000,
  currentStepBaseline: 5000
};

const workoutTemplate: Omit<ExerciseLog, "id" | "weight" | "repsDone" | "rpe" | "notes">[] = [
  { day: "Day 1 - Push", exercise: "Incline DB Press", sets: 3, targetReps: "6-10" },
  { day: "Day 1 - Push", exercise: "Machine Chest Press", sets: 3, targetReps: "8-12" },
  { day: "Day 1 - Push", exercise: "Seated DB Shoulder Press", sets: 3, targetReps: "8-10" },
  { day: "Day 1 - Push", exercise: "Lateral Raise", sets: 3, targetReps: "12-15" },
  { day: "Day 1 - Push", exercise: "Triceps Pushdown", sets: 3, targetReps: "10-12" },

  { day: "Day 2 - Lower", exercise: "Leg Press or Squat", sets: 3, targetReps: "6-10" },
  { day: "Day 2 - Lower", exercise: "Romanian Deadlift", sets: 3, targetReps: "8-10" },
  { day: "Day 2 - Lower", exercise: "Walking Lunges", sets: 3, targetReps: "10/leg" },
  { day: "Day 2 - Lower", exercise: "Leg Curl", sets: 3, targetReps: "10-12" },
  { day: "Day 2 - Lower", exercise: "Calf Raise", sets: 3, targetReps: "12-15" },

  { day: "Day 3 - Pull", exercise: "Pull-Ups / Assisted Pull-Ups", sets: 3, targetReps: "AMRAP" },
  { day: "Day 3 - Pull", exercise: "Lat Pulldown", sets: 3, targetReps: "8-12" },
  { day: "Day 3 - Pull", exercise: "Seated Row", sets: 3, targetReps: "8-12" },
  { day: "Day 3 - Pull", exercise: "Face Pull", sets: 3, targetReps: "12-15" },
  { day: "Day 3 - Pull", exercise: "Biceps Curl", sets: 3, targetReps: "10-12" },

  { day: "Day 4 - Full Body", exercise: "DB Bench or Push-Ups", sets: 3, targetReps: "8-12" },
  { day: "Day 4 - Full Body", exercise: "Cable Row", sets: 3, targetReps: "8-12" },
  { day: "Day 4 - Full Body", exercise: "Goblet Squat", sets: 3, targetReps: "10-12" },
  { day: "Day 4 - Full Body", exercise: "Farmer Carry", sets: 2, targetReps: "30-60 sec" },
  { day: "Day 4 - Full Body", exercise: "Hanging Knee Raise", sets: 3, targetReps: "10-15" }
];

const mealTemplate: FoodItem[] = [
  {
    id: cryptoSafeId(),
    meal: "Breakfast",
    food: "Curd",
    grams: 150,
    calories: 92,
    protein: 5,
    carbs: 7,
    fats: 5
  },
  {
    id: cryptoSafeId(),
    meal: "Coffee 1",
    food: "Filter coffee + 1 tbsp sugar",
    grams: 150,
    calories: 48,
    protein: 0,
    carbs: 12,
    fats: 0
  },
  {
    id: cryptoSafeId(),
    meal: "Lunch",
    food: "Raw basmati rice",
    grams: 60,
    calories: 216,
    protein: 4.3,
    carbs: 47,
    fats: 0.4
  },
  {
    id: cryptoSafeId(),
    meal: "Lunch",
    food: "Chicken breast",
    grams: 200,
    calories: 330,
    protein: 62,
    carbs: 0,
    fats: 7
  },
  {
    id: cryptoSafeId(),
    meal: "Snack",
    food: "Banana",
    grams: 120,
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fats: 0.4
  },
  {
    id: cryptoSafeId(),
    meal: "Coffee 2",
    food: "Filter coffee + 1 tbsp sugar",
    grams: 150,
    calories: 48,
    protein: 0,
    carbs: 12,
    fats: 0
  },
  {
    id: cryptoSafeId(),
    meal: "Dinner",
    food: "Raw basmati rice",
    grams: 80,
    calories: 288,
    protein: 5.8,
    carbs: 62,
    fats: 0.5
  },
  {
    id: cryptoSafeId(),
    meal: "Dinner",
    food: "Chicken breast",
    grams: 200,
    calories: 330,
    protein: 62,
    carbs: 0,
    fats: 7
  },
  {
    id: cryptoSafeId(),
    meal: "Dinner",
    food: "Cucumber",
    grams: 200,
    calories: 30,
    protein: 1.3,
    carbs: 7,
    fats: 0.2
  },
  {
    id: cryptoSafeId(),
    meal: "Dinner",
    food: "Olive oil / cooking fats",
    grams: 10,
    calories: 90,
    protein: 0,
    carbs: 0,
    fats: 10
  },
  {
    id: cryptoSafeId(),
    meal: "Any",
    food: "Apple",
    grams: 180,
    calories: 95,
    protein: 0.5,
    carbs: 25,
    fats: 0.3
  },
  {
    id: cryptoSafeId(),
    meal: "Coffee 3",
    food: "Filter coffee no sugar",
    grams: 150,
    calories: 5,
    protein: 0,
    carbs: 0,
    fats: 0
  },
  {
    id: cryptoSafeId(),
    meal: "Coffee 4",
    food: "Filter coffee no sugar",
    grams: 150,
    calories: 5,
    protein: 0,
    carbs: 0,
    fats: 0
  }
];

function cryptoSafeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function seedWeekLogs(): DailyLog[] {
  return Array.from({ length: 7 }).map((_, i) => ({
    date: todayISO(-6 + i),
    weight: "",
    steps: "",
    calories: "",
    protein: "",
    cardioMinutes: "",
    waist: ""
  }));
}

function seedWorkoutLogs(): ExerciseLog[] {
  return workoutTemplate.map((item) => ({
    id: cryptoSafeId(),
    ...item,
    weight: "",
    repsDone: "",
    rpe: "",
    notes: ""
  }));
}

type AppState = {
  settings: Settings;
  dailyLogs: DailyLog[];
  workoutLogs: ExerciseLog[];
  foods: FoodItem[];
};

const initialState: AppState = {
  settings: defaultSettings,
  dailyLogs: seedWeekLogs(),
  workoutLogs: seedWorkoutLogs(),
  foods: mealTemplate
};

export default function Page() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [state, setState] = useState<AppState>(initialState);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AppState;
      setState(parsed);
    } catch {
      // ignore malformed data
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const avgWeight = average(state.dailyLogs.map((d) => numberOrNull(d.weight)));
  const avgSteps = average(state.dailyLogs.map((d) => numberOrNull(d.steps)));
  const avgCalories = average(state.dailyLogs.map((d) => numberOrNull(d.calories)));
  const avgProtein = average(state.dailyLogs.map((d) => numberOrNull(d.protein)));
  const avgCardio = average(state.dailyLogs.map((d) => numberOrNull(d.cardioMinutes)));
  const avgWaist = average(state.dailyLogs.map((d) => numberOrNull(d.waist)));

  const foodTotals = useMemo(() => {
    return state.foods.reduce(
      (acc, item) => {
        acc.calories += item.calories;
        acc.protein += item.protein;
        acc.carbs += item.carbs;
        acc.fats += item.fats;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [state.foods]);

  const workoutCompletion = useMemo(() => {
    const filled = state.workoutLogs.filter(
      (x) => x.weight !== "" || x.repsDone !== "" || x.rpe !== "" || x.notes.trim() !== ""
    ).length;
    return Math.round((filled / state.workoutLogs.length) * 100);
  }, [state.workoutLogs]);

  const stepPlan = getStepPlan(state.settings.currentStepBaseline, state.settings.stepTarget);
  const recommendation = getRecommendation({
    avgCalories,
    avgProtein,
    avgSteps,
    avgWeight,
    avgWaist,
    workoutCompletion,
    settings: state.settings,
    foodTotals
  });

  function updateSettings<K extends keyof Settings>(key: K, value: Settings[K]) {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
  }

  function updateDaily(index: number, key: keyof DailyLog, value: string) {
    setState((prev) => {
      const copy = [...prev.dailyLogs];
      const asNumber =
        key === "date" ? value : value.trim() === "" ? "" : Number(value);
      copy[index] = { ...copy[index], [key]: asNumber as never };
      return { ...prev, dailyLogs: copy };
    });
  }

  function updateWorkout(id: string, key: keyof ExerciseLog, value: string) {
    setState((prev) => ({
      ...prev,
      workoutLogs: prev.workoutLogs.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]:
                key === "notes" || key === "day" || key === "exercise" || key === "targetReps"
                  ? value
                  : value.trim() === ""
                    ? ""
                    : key === "repsDone"
                      ? value
                      : Number(value)
            }
          : item
      )
    }));
  }

  function updateFood(id: string, key: keyof FoodItem, value: string) {
    setState((prev) => ({
      ...prev,
      foods: prev.foods.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]:
                key === "meal" || key === "food"
                  ? value
                  : value.trim() === ""
                    ? 0
                    : Number(value)
            }
          : item
      )
    }));
  }

  function addFood() {
    setState((prev) => ({
      ...prev,
      foods: [
        ...prev.foods,
        {
          id: cryptoSafeId(),
          meal: "New meal",
          food: "New food",
          grams: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0
        }
      ]
    }));
  }

  function deleteFood(id: string) {
    setState((prev) => ({
      ...prev,
      foods: prev.foods.filter((x) => x.id !== id)
    }));
  }

  function resetWeek() {
    setState((prev) => ({
      ...prev,
      dailyLogs: seedWeekLogs(),
      workoutLogs: seedWorkoutLogs()
    }));
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recomp-tracker-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        setState(parsed);
      } catch {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <main className="container">
      <div className="row space-between">
        <div>
          <h1 className="title">Recomp Tracker</h1>
          <p className="subtitle">
            Private, local-first tracker for training, nutrition, cardio, steps, and weekly decisions.
          </p>
        </div>

        <div className="row">
          <button className="btn secondary" onClick={exportBackup}>
            Export backup
          </button>
          <button className="btn secondary" onClick={() => fileInputRef.current?.click()}>
            Import backup
          </button>
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
        </div>
      </div>

      <div className="tabbar">
        <button className={`tab ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>
          Dashboard
        </button>
        <button className={`tab ${tab === "workouts" ? "active" : ""}`} onClick={() => setTab("workouts")}>
          Workouts
        </button>
        <button className={`tab ${tab === "nutrition" ? "active" : ""}`} onClick={() => setTab("nutrition")}>
          Nutrition
        </button>
        <button className={`tab ${tab === "checkin" ? "active" : ""}`} onClick={() => setTab("checkin")}>
          Weekly Check-In
        </button>
        <button className={`tab ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>
          Settings
        </button>
      </div>

      {tab === "dashboard" && (
        <div className="grid grid-4">
          <MetricCard title="Avg Weight" value={formatNumber(avgWeight, "kg")} hint="7-day average" />
          <MetricCard title="Avg Steps" value={formatNumber(avgSteps)} hint={`Target ${state.settings.stepTarget}`} />
          <MetricCard title="Avg Calories" value={formatNumber(avgCalories)} hint={`Target ${state.settings.targetCalories}`} />
          <MetricCard title="Avg Protein" value={formatNumber(avgProtein, "g")} hint={`Target ${state.settings.proteinTarget}g`} />
          <MetricCard title="Avg Cardio" value={formatNumber(avgCardio, "min")} hint="Daily average" />
          <MetricCard title="Avg Waist" value={formatNumber(avgWaist, "cm")} hint="Optional but useful" />
          <MetricCard title="Workout Completion" value={`${workoutCompletion}%`} hint="Filled log rows" />
          <MetricCard title="Meal Plan Calories" value={`${Math.round(foodTotals.calories)}`} hint="Planned daily intake" />
          
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="row space-between">
              <h2 style={{ margin: 0 }}>Current recommendation</h2>
              <span className="badge">Auto-adjusted</span>
            </div>
            <p style={{ marginTop: 12, lineHeight: 1.6 }}>{recommendation}</p>
          </div>

          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <h2 style={{ marginTop: 0 }}>Step progression</h2>
            <div className="grid grid-4">
              {stepPlan.map((item) => (
                <div key={item.week} className="card" style={{ background: "#0f172a" }}>
                  <div className="small">Week {item.week}</div>
                  <div className="metric-value">{item.target.toLocaleString()}</div>
                  <div className="small">{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <h2 style={{ marginTop: 0 }}>Cardio routine</h2>
            <ul style={{ lineHeight: 1.8 }}>
              <li>2 x 25-minute incline treadmill walks on lifting off-days</li>
              <li>1 x 35-minute Zone 2 walk on the weekend</li>
              <li>10-minute walk after 2 meals daily to help steps and recovery</li>
              <li>Keep intensity conversational, not all-out</li>
            </ul>
          </div>
        </div>
      )}

      {tab === "workouts" && (
        <div className="card">
          <div className="row space-between">
            <h2 style={{ margin: 0 }}>4-day training plan with logging</h2>
            <button className="btn secondary" onClick={() => setState((prev) => ({ ...prev, workoutLogs: seedWorkoutLogs() }))}>
              Reset workout log
            </button>
          </div>

          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Exercise</th>
                  <th>Sets</th>
                  <th>Target reps</th>
                  <th>Weight</th>
                  <th>Reps done</th>
                  <th>RPE</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {state.workoutLogs.map((item) => (
                  <tr key={item.id}>
                    <td>{item.day}</td>
                    <td>{item.exercise}</td>
                    <td>{item.sets}</td>
                    <td>{item.targetReps}</td>
                    <td>
                      <input
                        className="input"
                        value={item.weight}
                        onChange={(e) => updateWorkout(item.id, "weight", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={item.repsDone}
                        onChange={(e) => updateWorkout(item.id, "repsDone", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={item.rpe}
                        onChange={(e) => updateWorkout(item.id, "rpe", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={item.notes}
                        onChange={(e) => updateWorkout(item.id, "notes", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ marginTop: 16, background: "#0f172a" }}>
            <strong>Progression rule:</strong> stay 1–2 reps shy of failure on most sets. When you hit the top of the target rep range on all working sets with solid form, increase load next week.
          </div>
        </div>
      )}

      {tab === "nutrition" && (
        <div className="grid grid-2">
          <div className="card">
            <div className="row space-between">
              <h2 style={{ margin: 0 }}>Daily meal plan</h2>
              <button className="btn" onClick={addFood}>
                Add food
              </button>
            </div>

            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Meal</th>
                    <th>Food</th>
                    <th>g/ml</th>
                    <th>Cal</th>
                    <th>P</th>
                    <th>C</th>
                    <th>F</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {state.foods.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input className="input" value={item.meal} onChange={(e) => updateFood(item.id, "meal", e.target.value)} />
                      </td>
                      <td>
                        <input className="input" value={item.food} onChange={(e) => updateFood(item.id, "food", e.target.value)} />
                      </td>
                      <td>
                        <input className="input" value={item.grams} onChange={(e) => updateFood(item.id, "grams", e.target.value)} />
                      </td>
                      <td>
                        <input className="input" value={item.calories} onChange={(e) => updateFood(item.id, "calories", e.target.value)} />
                      </td>
                      <td>
                        <input className="input" value={item.protein} onChange={(e) => updateFood(item.id, "protein", e.target.value)} />
                      </td>
                      <td>
                        <input className="input" value={item.carbs} onChange={(e) => updateFood(item.id, "carbs", e.target.value)} />
                      </td>
                      <td>
                        <input className="input" value={item.fats} onChange={(e) => updateFood(item.id, "fats", e.target.value)} />
                      </td>
                      <td>
                        <button className="btn warn" onClick={() => deleteFood(item.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid">
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Planned totals</h2>
              <p>Calories: <strong>{Math.round(foodTotals.calories)}</strong></p>
              <p>Protein: <strong>{foodTotals.protein.toFixed(1)} g</strong></p>
              <p>Carbs: <strong>{foodTotals.carbs.toFixed(1)} g</strong></p>
              <p>Fats: <strong>{foodTotals.fats.toFixed(1)} g</strong></p>
            </div>

            <div className="card">
              <h2 style={{ marginTop: 0 }}>Recomp target</h2>
              <p>Calories target: <strong>{state.settings.targetCalories}</strong></p>
              <p>Protein target: <strong>{state.settings.proteinTarget} g</strong></p>
              <p className="small">
                For your case, start near maintenance with high protein, then let waist, average weight, and gym performance determine adjustments.
              </p>
            </div>

            <div className="card">
              <h2 style={{ marginTop: 0 }}>Suggested base setup</h2>
              <ul style={{ lineHeight: 1.8 }}>
                <li>Keep chicken and curd as your anchor proteins</li>
                <li>Move 2 coffees to no sugar</li>
                <li>Add fruit daily</li>
                <li>Add one proper vegetable serving besides cucumber</li>
                <li>Keep rice higher around training days</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === "checkin" && (
        <div className="grid">
          <div className="card">
            <div className="row space-between">
              <h2 style={{ margin: 0 }}>7-day check-in</h2>
              <button className="btn secondary" onClick={resetWeek}>
                Reset week
              </button>
            </div>

            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Weight</th>
                    <th>Waist</th>
                    <th>Steps</th>
                    <th>Calories</th>
                    <th>Protein</th>
                    <th>Cardio min</th>
                  </tr>
                </thead>
                <tbody>
                  {state.dailyLogs.map((row, index) => (
                    <tr key={row.date + index}>
                      <td>
                        <input className="input" value={row.date} onChange={(e) => updateDaily(index, "date", e.target.value)} />
                      </td>
                      <td>
                        <input className="input" value={row.weight} onChange={(e) => updateDaily(index, "weight", e.target.value)} />
                      </td>
                      <td>
                        <input className="input" value={row.waist} onChange={(e) => updateDaily(index, "waist", e.target.value)} />
                      </td>
                      <td>
                        <input className="input" value={row.steps} onChange={(e) => updateDaily(index, "steps", e.target.value)} />
                      </td>
                      <td>
                        <input className="input" value={row.calories} onChange={(e) => updateDaily(index, "calories", e.target.value)} />
                      </td>
                      <td>
                        <input className="input" value={row.protein} onChange={(e) => updateDaily(index, "protein", e.target.value)} />
                      </td>
                      <td>
                        <input className="input" value={row.cardioMinutes} onChange={(e) => updateDaily(index, "cardioMinutes", e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-3">
            <MetricCard title="Avg Weight" value={formatNumber(avgWeight, "kg")} hint="Use average, not daily spikes" />
            <MetricCard title="Avg Waist" value={formatNumber(avgWaist, "cm")} hint="Best fat-loss signal" />
            <MetricCard title="Avg Steps" value={formatNumber(avgSteps)} hint="NEAT target" />
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Decision rule</h2>
            <p style={{ lineHeight: 1.7 }}>{recommendation}</p>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="grid grid-2">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Body and targets</h2>
            <Field label="Current weight (kg)">
              <input className="input" value={state.settings.weightKg} onChange={(e) => updateSettings("weightKg", Number(e.target.value))} />
            </Field>
            <Field label="Height (cm)">
              <input className="input" value={state.settings.heightCm} onChange={(e) => updateSettings("heightCm", Number(e.target.value))} />
            </Field>
            <Field label="Target calories">
              <input className="input" value={state.settings.targetCalories} onChange={(e) => updateSettings("targetCalories", Number(e.target.value))} />
            </Field>
            <Field label="Protein target (g)">
              <input className="input" value={state.settings.proteinTarget} onChange={(e) => updateSettings("proteinTarget", Number(e.target.value))} />
            </Field>
            <Field label="Current step baseline">
              <input className="input" value={state.settings.currentStepBaseline} onChange={(e) => updateSettings("currentStepBaseline", Number(e.target.value))} />
            </Field>
            <Field label="Target steps">
              <input className="input" value={state.settings.stepTarget} onChange={(e) => updateSettings("stepTarget", Number(e.target.value))} />
            </Field>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>How this app is meant to be used</h2>
            <ul style={{ lineHeight: 1.8 }}>
              <li>Log bodyweight daily, then judge progress from the 7-day average</li>
              <li>Track waist 2-3 times per week if possible</li>
              <li>Use workout logs to confirm strength is stable or rising</li>
              <li>Keep calories roughly consistent for at least 2 weeks before making big changes</li>
              <li>Adjust steps upward in waves, not overnight</li>
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="card">
      <div className="small">{title}</div>
      <div className="metric-value">{value}</div>
      <div className="small">{hint}</div>
    </div>
  );
}

function numberOrNull(value: number | "" | undefined): number | null {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function average(values: Array<number | null>): number | null {
  const clean = values.filter((x): x is number => x !== null);
  if (!clean.length) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function formatNumber(value: number | null, suffix = ""): string {
  if (value === null) return "-";
  return `${value.toFixed(1)}${suffix ? ` ${suffix}` : ""}`;
}

function getStepPlan(start: number, target: number) {
  const step1 = Math.min(start + 2000, target);
  const step2 = Math.min(step1 + 1500, target);
  const step3 = Math.min(step2 + 1500, target);
  const step4 = target;

  return [
    { week: 1, target: step1, note: "Add two 10-minute walks" },
    { week: 2, target: step2, note: "Keep post-meal walks" },
    { week: 3, target: step3, note: "Add one longer evening walk" },
    { week: 4, target: step4, note: "Hold target consistently" }
  ];
}

function getRecommendation(input: {
  avgCalories: number | null;
  avgProtein: number | null;
  avgSteps: number | null;
  avgWeight: number | null;
  avgWaist: number | null;
  workoutCompletion: number;
  settings: Settings;
  foodTotals: { calories: number; protein: number; carbs: number; fats: number };
}) {
  const messages: string[] = [];

  if ((input.avgProtein ?? 0) < input.settings.proteinTarget - 15) {
    messages.push("Protein is below target. Raise protein before making aggressive calorie cuts.");
  }

  if ((input.avgSteps ?? 0) < input.settings.stepTarget - 1500) {
    messages.push("Steps are still below target. Prioritize walking consistency before changing calories.");
  }

  if ((input.avgCalories ?? input.foodTotals.calories) > input.settings.targetCalories + 150) {
    messages.push("Average intake is above target. Trim 100-150 kcal, preferably from sugar or cooking fats.");
  }

  if ((input.avgCalories ?? input.foodTotals.calories) < input.settings.targetCalories - 250) {
    messages.push("Average intake is well below target. Increase calories slightly to support training and recomp.");
  }

  if (input.workoutCompletion < 40) {
    messages.push("Training data is sparse. Log workouts more consistently before making major adjustments.");
  }

  if (!messages.length) {
    return "Stay the course. Keep calories near target, keep protein high, push steps toward 10k, and only adjust if waist and weekly averages stall for 2+ weeks.";
  }

  return messages.join(" ");
}
