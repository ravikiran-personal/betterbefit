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
  repsDone: number | "";
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

type MealPreset = {
  id: string;
  name: string;
  createdAt: string;
  foods: FoodItem[];
};

type Sex = "male" | "female";
type Lifestyle = "sedentary" | "light" | "moderate" | "active";
type Goal = "recomp" | "maintain" | "lose_weight" | "be_more_active";

type Settings = {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  lifestyle: Lifestyle;
  goal: Goal;
  targetCalories: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  stepTarget: number;
  currentStepBaseline: number;
};

type WorkoutSession = {
  id: string;
  date: string;
  totalVolume: number;
  exercises: ExerciseLog[];
};

function NumericInput({
  value,
  onChange,
  placeholder
}: {
  value: number | "";
  onChange: (value: number | "") => void;
  placeholder?: string;
}) {
  const safeValue =
    typeof value === "number" && Number.isFinite(value) ? String(value) : "";

  return (
    <input
      className="input"
      type="tel"
      inputMode="numeric"
      pattern="[0-9]*"
      value={safeValue}
      placeholder={placeholder}
      onChange={(e) => {
        const onlyNumbers = e.target.value.replace(/[^0-9]/g, "");

        if (onlyNumbers === "") {
          onChange("");
          return;
        }

        onChange(Number(onlyNumbers));
      }}
    />
  );
}

const STORAGE_KEY = "recomp-tracker-v2";

const defaultSettings: Settings = {
  weightKg: 86.5,
  heightCm: 181,
  age: 30,
  sex: "male",
  lifestyle: "light",
  goal: "recomp",
  targetCalories: 2000,
  proteinTarget: 160,
  carbTarget: 200,
  fatTarget: 60,
  stepTarget: 10000,
  currentStepBaseline: 5000
};

const workoutTemplate: Omit<
  ExerciseLog,
  "id" | "weight" | "repsDone" | "rpe" | "notes"
>[] = [
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
  { id: cryptoSafeId(), meal: "Breakfast", food: "Curd", grams: 150, calories: 92, protein: 5, carbs: 7, fats: 5 },
  { id: cryptoSafeId(), meal: "Coffee 1", food: "Filter coffee + 1 tbsp sugar", grams: 150, calories: 48, protein: 0, carbs: 12, fats: 0 },
  { id: cryptoSafeId(), meal: "Lunch", food: "Raw basmati rice", grams: 60, calories: 216, protein: 4.3, carbs: 47, fats: 0.4 },
  { id: cryptoSafeId(), meal: "Lunch", food: "Chicken breast", grams: 200, calories: 330, protein: 62, carbs: 0, fats: 7 },
  { id: cryptoSafeId(), meal: "Snack", food: "Banana", grams: 120, calories: 105, protein: 1.3, carbs: 27, fats: 0.4 },
  { id: cryptoSafeId(), meal: "Coffee 2", food: "Filter coffee + 1 tbsp sugar", grams: 150, calories: 48, protein: 0, carbs: 12, fats: 0 },
  { id: cryptoSafeId(), meal: "Dinner", food: "Raw basmati rice", grams: 80, calories: 288, protein: 5.8, carbs: 62, fats: 0.5 },
  { id: cryptoSafeId(), meal: "Dinner", food: "Chicken breast", grams: 200, calories: 330, protein: 62, carbs: 0, fats: 7 },
  { id: cryptoSafeId(), meal: "Dinner", food: "Cucumber", grams: 200, calories: 30, protein: 1.3, carbs: 7, fats: 0.2 },
  { id: cryptoSafeId(), meal: "Dinner", food: "Olive oil / cooking fats", grams: 10, calories: 90, protein: 0, carbs: 0, fats: 10 },
  { id: cryptoSafeId(), meal: "Any", food: "Apple", grams: 180, calories: 95, protein: 0.5, carbs: 25, fats: 0.3 },
  { id: cryptoSafeId(), meal: "Coffee 3", food: "Filter coffee no sugar", grams: 150, calories: 5, protein: 0, carbs: 0, fats: 0 },
  { id: cryptoSafeId(), meal: "Coffee 4", food: "Filter coffee no sugar", grams: 150, calories: 5, protein: 0, carbs: 0, fats: 0 }
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
  workoutHistory: WorkoutSession[];
  foods: FoodItem[];
  mealPresets: MealPreset[];
};

const initialState: AppState = {
  settings: defaultSettings,
  dailyLogs: seedWeekLogs(),
  workoutLogs: seedWorkoutLogs(),
  workoutHistory: [],
  foods: mealTemplate,
  mealPresets: []
};

export default function Page() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [state, setState] = useState<AppState>(initialState);
  const [mealPresetName, setMealPresetName] = useState("");
  const [targetReason, setTargetReason] = useState("");
  const [isCalculatingTargets, setIsCalculatingTargets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("recomp-tracker-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as AppState;

      setState({
        settings: {
          ...defaultSettings,
          ...parsed.settings,
          weightKg: numberOrDefault(parsed.settings?.weightKg, defaultSettings.weightKg),
          heightCm: numberOrDefault(parsed.settings?.heightCm, defaultSettings.heightCm),
          age: numberOrDefault((parsed.settings as Settings)?.age, defaultSettings.age),
          sex: isSex((parsed.settings as Settings)?.sex) ? (parsed.settings as Settings).sex : defaultSettings.sex,
          lifestyle: isLifestyle((parsed.settings as Settings)?.lifestyle) ? (parsed.settings as Settings).lifestyle : defaultSettings.lifestyle,
          goal: isGoal((parsed.settings as Settings)?.goal) ? (parsed.settings as Settings).goal : defaultSettings.goal,
          targetCalories: numberOrDefault(parsed.settings?.targetCalories, defaultSettings.targetCalories),
          proteinTarget: numberOrDefault(parsed.settings?.proteinTarget, defaultSettings.proteinTarget),
          carbTarget: numberOrDefault((parsed.settings as Settings)?.carbTarget, defaultSettings.carbTarget),
          fatTarget: numberOrDefault((parsed.settings as Settings)?.fatTarget, defaultSettings.fatTarget),
          stepTarget: numberOrDefault(parsed.settings?.stepTarget, defaultSettings.stepTarget),
          currentStepBaseline: numberOrDefault(parsed.settings?.currentStepBaseline, defaultSettings.currentStepBaseline)
        },
        dailyLogs: (parsed.dailyLogs?.length ? parsed.dailyLogs : seedWeekLogs()).map((d) => ({
          date: d.date || todayISO(),
          weight: cleanNumber(d.weight),
          steps: cleanNumber(d.steps),
          calories: cleanNumber(d.calories),
          protein: cleanNumber(d.protein),
          cardioMinutes: cleanNumber(d.cardioMinutes),
          waist: cleanNumber(d.waist)
        })),
        workoutLogs: (parsed.workoutLogs?.length ? parsed.workoutLogs : seedWorkoutLogs()).map((w) => ({
          ...w,
          weight: cleanNumber(w.weight),
          repsDone: cleanNumber(w.repsDone),
          rpe: cleanNumber(w.rpe),
          notes: w.notes || ""
        })),
        workoutHistory: Array.isArray((parsed as AppState).workoutHistory)
          ? (parsed as AppState).workoutHistory.map((session) => ({
              ...session,
              totalVolume: numberOrDefault(session.totalVolume, 0),
              exercises: session.exercises.map((w) => ({
                ...w,
                weight: cleanNumber(w.weight),
                repsDone: cleanNumber(w.repsDone),
                rpe: cleanNumber(w.rpe),
                notes: w.notes || ""
              }))
            }))
          : [],
        foods: (parsed.foods?.length ? parsed.foods : mealTemplate).map((f) => ({
          ...f,
          grams: numberOrDefault(f.grams, 0),
          calories: numberOrDefault(f.calories, 0),
          protein: numberOrDefault(f.protein, 0),
          carbs: numberOrDefault(f.carbs, 0),
          fats: numberOrDefault(f.fats, 0)
        })),
        mealPresets: Array.isArray((parsed as AppState).mealPresets)
          ? (parsed as AppState).mealPresets.map((preset) => ({
              ...preset,
              foods: preset.foods.map((f) => ({
                ...f,
                grams: numberOrDefault(f.grams, 0),
                calories: numberOrDefault(f.calories, 0),
                protein: numberOrDefault(f.protein, 0),
                carbs: numberOrDefault(f.carbs, 0),
                fats: numberOrDefault(f.fats, 0)
              }))
            }))
          : []
      });
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

  async function calculateTargetsWithAI() {
    setIsCalculatingTargets(true);
    setTargetReason("");

    try {
      const response = await fetch("/api/calculate-targets", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          weightKg: state.settings.weightKg,
          heightCm: state.settings.heightCm,
          age: state.settings.age,
          sex: state.settings.sex,
          lifestyle: state.settings.lifestyle,
          goal: state.settings.goal
        })
      });

      if (!response.ok) {
        throw new Error("Target calculation failed.");
      }

      const result = await response.json();
      console.log("AI target result:", result);

      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          targetCalories: numberOrDefault(result.calories, prev.settings.targetCalories),
          proteinTarget: numberOrDefault(result.protein, prev.settings.proteinTarget),
          carbTarget: numberOrDefault(result.carbs, prev.settings.carbTarget),
          fatTarget: numberOrDefault(result.fats, prev.settings.fatTarget),
          stepTarget: numberOrDefault(result.steps, prev.settings.stepTarget)
        }
      }));

      setTargetReason(String(result.reason || "Targets updated."));
    } catch {
      alert("Could not calculate targets. Check your API route and Vercel environment variables.");
    } finally {
      setIsCalculatingTargets(false);
    }
  }

  function updateSettings<K extends keyof Settings>(key: K, value: Settings[K]) {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
  }

  function updateDaily(index: number, key: keyof DailyLog, value: string | number | "") {
    setState((prev) => {
      const copy = [...prev.dailyLogs];

      if (key === "date") {
        copy[index] = { ...copy[index], date: String(value) };
      } else {
        copy[index] = { ...copy[index], [key]: cleanNumber(value) };
      }

      return { ...prev, dailyLogs: copy };
    });
  }

  function updateWorkout(id: string, key: keyof ExerciseLog, value: string | number | "") {
    setState((prev) => ({
      ...prev,
      workoutLogs: prev.workoutLogs.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]:
                key === "notes" || key === "day" || key === "exercise" || key === "targetReps"
                  ? String(value)
                  : cleanNumber(value)
            }
          : item
      )
    }));
  }

  function updateFood(id: string, key: keyof FoodItem, value: string | number | "") {
    setState((prev) => ({
      ...prev,
      foods: prev.foods.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]:
                key === "meal" || key === "food"
                  ? String(value)
                  : numberOrDefault(cleanNumber(value), 0)
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

  function saveCurrentMealsAsPreset() {
    const name = mealPresetName.trim();

    if (!name) {
      alert("Name the preset first, for example: Normal training day.");
      return;
    }

    if (state.foods.length === 0) {
      alert("Add at least one food item before saving a preset.");
      return;
    }

    const preset: MealPreset = {
      id: cryptoSafeId(),
      name,
      createdAt: todayISO(),
      foods: state.foods.map((food) => ({
        ...food,
        id: cryptoSafeId()
      }))
    };

    setState((prev) => ({
      ...prev,
      mealPresets: [preset, ...prev.mealPresets]
    }));

    setMealPresetName("");
  }

  function applyMealPreset(preset: MealPreset) {
    setState((prev) => ({
      ...prev,
      foods: preset.foods.map((food) => ({
        ...food,
        id: cryptoSafeId()
      }))
    }));
  }

  function deleteMealPreset(id: string) {
    if (!confirm("Delete this meal preset?")) return;

    setState((prev) => ({
      ...prev,
      mealPresets: prev.mealPresets.filter((preset) => preset.id !== id)
    }));
  }

  function calculateExerciseVolume(exercise: ExerciseLog) {
    const weight = numberOrDefault(exercise.weight, 0);
    const reps = numberOrDefault(exercise.repsDone, 0);
    return weight * reps;
  }

  function calculateSessionVolume(exercises: ExerciseLog[]) {
    return exercises.reduce((sum, exercise) => sum + calculateExerciseVolume(exercise), 0);
  }

  function getPreviousExercise(exerciseName: string) {
    for (const session of state.workoutHistory) {
      const match = session.exercises.find((exercise) => exercise.exercise === exerciseName);
      if (match) return match;
    }
    return null;
  }

  function logWorkout() {
    const hasLoggedData = state.workoutLogs.some(
      (exercise) => exercise.weight !== "" || exercise.repsDone !== "" || exercise.rpe !== "" || exercise.notes.trim() !== ""
    );

    if (!hasLoggedData) {
      alert("Add at least one exercise entry before logging the workout.");
      return;
    }

    const session: WorkoutSession = {
      id: cryptoSafeId(),
      date: todayISO(),
      totalVolume: calculateSessionVolume(state.workoutLogs),
      exercises: state.workoutLogs.map((exercise) => ({ ...exercise, id: cryptoSafeId() }))
    };

    setState((prev) => ({
      ...prev,
      workoutHistory: [session, ...prev.workoutHistory],
      workoutLogs: seedWorkoutLogs()
    }));
  }

  function loadWorkoutSession(session: WorkoutSession) {
    setState((prev) => ({
      ...prev,
      workoutLogs: session.exercises.map((exercise) => ({ ...exercise, id: cryptoSafeId() }))
    }));
    setTab("workouts");
  }

  function deleteWorkoutSession(id: string) {
    if (!confirm("Delete this workout session?")) return;

    setState((prev) => ({
      ...prev,
      workoutHistory: prev.workoutHistory.filter((session) => session.id !== id)
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
          <MetricCard title="Carb Target" value={`${state.settings.carbTarget} g`} hint="AI-calculated target" />
          <MetricCard title="Fat Target" value={`${state.settings.fatTarget} g`} hint="AI-calculated target" />
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
            <div className="row">
              <button className="btn" onClick={logWorkout}>
                Log workout
              </button>
              <button className="btn secondary" onClick={() => setState((prev) => ({ ...prev, workoutLogs: seedWorkoutLogs() }))}>
                Reset workout log
              </button>
            </div>
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
                {state.workoutLogs.map((item) => {
                  const previous = getPreviousExercise(item.exercise);
                  const previousVolume = previous ? calculateExerciseVolume(previous) : 0;
                  const currentVolume = calculateExerciseVolume(item);
                  const hasCurrentVolume = currentVolume > 0;
                  const hasProgress = previousVolume > 0 && currentVolume > previousVolume;

                  return (
                    <tr key={item.id}>
                      <td>{item.day}</td>
                      <td>
                        <strong>{item.exercise}</strong>
                        <div className="small">
                          {previous
                            ? `Previous: ${numberOrDefault(previous.weight, 0)} kg x ${numberOrDefault(previous.repsDone, 0)} reps = ${previousVolume}`
                            : "New exercise"}
                        </div>
                        <div className="small">
                          {hasCurrentVolume
                            ? hasProgress
                              ? "Progressive overload achieved"
                              : previousVolume > 0
                                ? `Beat ${previousVolume} total volume`
                                : `Current volume: ${currentVolume}`
                            : ""}
                        </div>
                      </td>
                      <td>{item.sets}</td>
                      <td>{item.targetReps}</td>
                      <td>
                        <NumericInput
                          value={item.weight}
                          onChange={(v) => updateWorkout(item.id, "weight", v)}
                          placeholder={previous ? String(numberOrDefault(previous.weight, 0)) : "New exercise"}
                        />
                      </td>
                      <td>
                        <NumericInput
                          value={item.repsDone}
                          onChange={(v) => updateWorkout(item.id, "repsDone", v)}
                          placeholder={previous ? String(numberOrDefault(previous.repsDone, 0)) : ""}
                        />
                      </td>
                      <td>
                        <NumericInput
                          value={item.rpe}
                          onChange={(v) => updateWorkout(item.id, "rpe", v)}
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ marginTop: 16, background: "#0f172a" }}>
            <strong>Progression rule:</strong> stay 1-2 reps shy of failure on most sets. When you hit the top of the target rep range on all working sets with solid form, increase load next week.
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h2 style={{ marginTop: 0 }}>Workout history</h2>
            {state.workoutHistory.length === 0 ? (
              <p className="small">No workouts logged yet. Fill today’s workout and press Log workout.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Total volume</th>
                      <th>Exercises</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.workoutHistory.map((session) => (
                      <tr key={session.id}>
                        <td>{session.date}</td>
                        <td>{session.totalVolume}</td>
                        <td>
                          {session.exercises
                            .filter((exercise) => calculateExerciseVolume(exercise) > 0)
                            .map((exercise) => `${exercise.exercise}: ${numberOrDefault(exercise.weight, 0)} x ${numberOrDefault(exercise.repsDone, 0)}`)
                            .join(", ")}
                        </td>
                        <td>
                          <div className="row">
                            <button className="btn secondary" onClick={() => loadWorkoutSession(session)}>
                              Load
                            </button>
                            <button className="btn warn" onClick={() => deleteWorkoutSession(session.id)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

            <div className="card" style={{ marginTop: 16, background: "#0f172a" }}>
              <h3 style={{ marginTop: 0 }}>Full-day meal preset</h3>
              <p className="small">
                Save the current full nutrition table as a reusable preset. Later, apply it with one click.
              </p>
              <div className="row">
                <input
                  className="input"
                  value={mealPresetName}
                  placeholder="Preset name, e.g. Normal training day"
                  onChange={(e) => setMealPresetName(e.target.value)}
                />
                <button className="btn" onClick={saveCurrentMealsAsPreset}>
                  Save current day as preset
                </button>
              </div>
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
                        <NumericInput value={item.grams} onChange={(v) => updateFood(item.id, "grams", v)} />
                      </td>
                      <td>
                        <NumericInput value={item.calories} onChange={(v) => updateFood(item.id, "calories", v)} />
                      </td>
                      <td>
                        <NumericInput value={item.protein} onChange={(v) => updateFood(item.id, "protein", v)} />
                      </td>
                      <td>
                        <NumericInput value={item.carbs} onChange={(v) => updateFood(item.id, "carbs", v)} />
                      </td>
                      <td>
                        <NumericInput value={item.fats} onChange={(v) => updateFood(item.id, "fats", v)} />
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
              <p>Carb target: <strong>{state.settings.carbTarget} g</strong></p>
              <p>Fat target: <strong>{state.settings.fatTarget} g</strong></p>
              <p className="small">
                For your case, start near maintenance with high protein, then let waist, average weight, and gym performance determine adjustments.
              </p>
            </div>

            <div className="card">
              <h2 style={{ marginTop: 0 }}>Saved full-day presets</h2>
              {state.mealPresets.length === 0 ? (
                <p className="small">No presets yet. Build your nutrition table, name it, then save it.</p>
              ) : (
                <div className="grid">
                  {state.mealPresets.map((preset) => {
                    const totals = preset.foods.reduce(
                      (acc, food) => {
                        acc.calories += food.calories;
                        acc.protein += food.protein;
                        acc.carbs += food.carbs;
                        acc.fats += food.fats;
                        return acc;
                      },
                      { calories: 0, protein: 0, carbs: 0, fats: 0 }
                    );

                    return (
                      <div key={preset.id} className="card" style={{ background: "#0f172a" }}>
                        <div className="row space-between">
                          <div>
                            <strong>{preset.name}</strong>
                            <div className="small">
                              {Math.round(totals.calories)} cal | P {totals.protein.toFixed(1)}g | C {totals.carbs.toFixed(1)}g | F {totals.fats.toFixed(1)}g
                            </div>
                          </div>
                          <div className="row">
                            <button className="btn" onClick={() => applyMealPreset(preset)}>
                              Apply
                            </button>
                            <button className="btn warn" onClick={() => deleteMealPreset(preset.id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                        <input
                          className="input"
                          value={row.date}
                          onChange={(e) => updateDaily(index, "date", e.target.value)}
                        />
                      </td>
                      <td>
                        <NumericInput
                          value={row.weight}
                          onChange={(v) => updateDaily(index, "weight", v)}
                        />
                      </td>
                      <td>
                        <NumericInput
                          value={row.waist}
                          onChange={(v) => updateDaily(index, "waist", v)}
                        />
                      </td>
                      <td>
                        <NumericInput
                          value={row.steps}
                          onChange={(v) => updateDaily(index, "steps", v)}
                        />
                      </td>
                      <td>
                        <NumericInput
                          value={row.calories}
                          onChange={(v) => updateDaily(index, "calories", v)}
                        />
                      </td>
                      <td>
                        <NumericInput
                          value={row.protein}
                          onChange={(v) => updateDaily(index, "protein", v)}
                        />
                      </td>
                      <td>
                        <NumericInput
                          value={row.cardioMinutes}
                          onChange={(v) => updateDaily(index, "cardioMinutes", v)}
                        />
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
              <NumericInput value={state.settings.weightKg} onChange={(v) => updateSettings("weightKg", v === "" ? 0 : v)} />
            </Field>
            <Field label="Height (cm)">
              <NumericInput value={state.settings.heightCm} onChange={(v) => updateSettings("heightCm", v === "" ? 0 : v)} />
            </Field>
            <Field label="Age">
              <NumericInput value={state.settings.age} onChange={(v) => updateSettings("age", v === "" ? 0 : v)} />
            </Field>
            <Field label="Sex">
              <select
                className="input"
                value={state.settings.sex}
                onChange={(e) => updateSettings("sex", e.target.value as Sex)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
            <Field label="Lifestyle">
              <select
                className="input"
                value={state.settings.lifestyle}
                onChange={(e) => updateSettings("lifestyle", e.target.value as Lifestyle)}
              >
                <option value="sedentary">Sedentary</option>
                <option value="light">Light activity</option>
                <option value="moderate">Moderate activity</option>
                <option value="active">Active</option>
              </select>
            </Field>
            <Field label="Goal">
              <select
                className="input"
                value={state.settings.goal}
                onChange={(e) => updateSettings("goal", e.target.value as Goal)}
              >
                <option value="recomp">Recomp: build muscle + lose fat</option>
                <option value="maintain">Maintain physique</option>
                <option value="lose_weight">Lose weight</option>
                <option value="be_more_active">Be more active</option>
              </select>
            </Field>

            <button className="btn" onClick={calculateTargetsWithAI} disabled={isCalculatingTargets}>
              {isCalculatingTargets ? "Calculating..." : "Calculate targets with AI"}
            </button>

            {targetReason ? (
              <div className="card" style={{ marginTop: 14, background: "#0f172a" }}>
                <strong>AI reason:</strong>
                <p className="small" style={{ lineHeight: 1.6 }}>{targetReason}</p>
              </div>
            ) : null}

            <div className="card" style={{ marginTop: 14, background: "#0f172a" }}>
              <h3 style={{ marginTop: 0 }}>Current targets</h3>
              <p>Calories: <strong>{state.settings.targetCalories}</strong></p>
              <p>Protein: <strong>{state.settings.proteinTarget} g</strong></p>
              <p>Carbs: <strong>{state.settings.carbTarget} g</strong></p>
              <p>Fats: <strong>{state.settings.fatTarget} g</strong></p>
              <p>Steps: <strong>{state.settings.stepTarget}</strong></p>
            </div>

            <Field label="Current step baseline">
              <NumericInput value={state.settings.currentStepBaseline} onChange={(v) => updateSettings("currentStepBaseline", v === "" ? 0 : v)} />
            </Field>

            <button
              className="btn warn"
              onClick={() => {
                if (!confirm("Delete all logs? This cannot be undone.")) return;

                setState((prev) => ({
                  ...prev,
                  dailyLogs: seedWeekLogs(),
                  workoutLogs: seedWorkoutLogs(),
                  workoutHistory: [],
                  foods: []
                }));
              }}
            >
              Delete all logs
            </button>
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

function cleanNumber(value: unknown): number | "" {
  if (value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const num = Number(value);
    return Number.isFinite(num) ? num : "";
  }
  return "";
}

function numberOrDefault(value: unknown, fallback: number): number {
  const cleaned = cleanNumber(value);
  return cleaned === "" ? fallback : cleaned;
}

function numberOrNull(value: number | "" | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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

function isSex(value: unknown): value is Sex {
  return value === "male" || value === "female";
}

function isLifestyle(value: unknown): value is Lifestyle {
  return value === "sedentary" || value === "light" || value === "moderate" || value === "active";
}

function isGoal(value: unknown): value is Goal {
  return value === "recomp" || value === "maintain" || value === "lose_weight" || value === "be_more_active";
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
