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

type WorkoutSet = {
  id: string;
  weight: number | "";
  reps: number | "";
  rpe: number | "";
};

type ExerciseLog = {
  id: string;
  day: string;
  dayLabel: string;
  pattern: string;
  exercise: string;
  alternates: string[];
  sets: number;
  targetReps: string;
  workoutSets: WorkoutSet[];
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

type FoodSearchResult = {
  source: string;
  food: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: "high" | "medium" | "low";
  note: string;
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
  workoutsPerWeek: number;
  experienceLevel: "beginner" | "intermediate" | "advanced";
  sessionLength: number;
  equipmentAccess: "full_gym" | "home" | "dumbbells" | "machines";
  limitations: string;
  trainingEmphasis: "aesthetic" | "strength" | "mobility" | "fat_loss_support";
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
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (typeof value === "number" && Number.isFinite(value)) {
      setDraft(String(value));
    }

    if (value === "") {
      setDraft("");
    }
  }, [value]);

  return (
    <input
      className="input"
      type="text"
      inputMode="decimal"
      value={draft}
      placeholder={placeholder}
      onChange={(e) => {
        let val = e.target.value;

        val = val.replace(/[^0-9.]/g, "");

        const parts = val.split(".");
        if (parts.length > 2) {
          val = parts[0] + "." + parts.slice(1).join("");
        }

        const finalParts = val.split(".");
        if (finalParts[1]?.length > 1) {
          val = finalParts[0] + "." + finalParts[1].slice(0, 1);
        }

        setDraft(val);

        if (val === "" || val === ".") {
          onChange("");
          return;
        }

        if (val.endsWith(".")) {
          return;
        }

        onChange(Number(val));
      }}
      onBlur={() => {
        if (draft === "" || draft === ".") {
          setDraft("");
          onChange("");
          return;
        }

        const num = Number(draft);

        if (!Number.isFinite(num)) {
          setDraft("");
          onChange("");
          return;
        }

        const rounded = Math.round(num * 10) / 10;
        setDraft(String(rounded));
        onChange(rounded);
      }}
    />
  );

}

function SwipeToDelete({
  children,
  onDelete,
  className = "",
  disabled = false,
  label = "Swipe left to delete"
}: {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
  disabled?: boolean;
  label?: string;
}) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const currentX = useRef<number | null>(null);

  function shouldIgnoreSwipe(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    return !!target.closest("input, textarea, select, a");
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (disabled || shouldIgnoreSwipe(e.target)) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = e.touches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (disabled || startX.current === null) return;
    currentX.current = e.touches[0].clientX;
  }

  function handleTouchEnd() {
    if (disabled || startX.current === null || currentX.current === null || startY.current === null) {
      startX.current = null;
      startY.current = null;
      currentX.current = null;
      return;
    }

    const deltaX = startX.current - currentX.current;

    if (deltaX > 70) {
      onDelete();
    }

    startX.current = null;
    startY.current = null;
    currentX.current = null;
  }

  return (
    <div
      className={`swipe-delete ${disabled ? "disabled" : ""} ${className}`}
      aria-label={label}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="swipe-delete-bg">Delete</div>
      <div className="swipe-delete-content">{children}</div>
    </div>
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
  currentStepBaseline: 5000,
  workoutsPerWeek: 4,
  experienceLevel: "intermediate",
  sessionLength: 60,
  equipmentAccess: "full_gym",
  limitations: "",
  trainingEmphasis: "aesthetic"
};

const workoutTemplate: Omit<
  ExerciseLog,
  "id" | "workoutSets" | "weight" | "repsDone" | "rpe" | "notes"
>[] = [
  { day: "push", dayLabel: "Push", pattern: "Incline Press", exercise: "Incline DB Press", alternates: ["Incline Barbell Press", "Smith Machine Incline Press", "Low Incline Machine Press", "Feet-Elevated Push-Up"], sets: 3, targetReps: "6-10" },
  { day: "push", dayLabel: "Push", pattern: "Horizontal Press", exercise: "Machine Chest Press", alternates: ["Flat DB Press", "Barbell Bench Press", "Cable Chest Press", "Push-Up"], sets: 3, targetReps: "8-12" },
  { day: "push", dayLabel: "Push", pattern: "Overhead Press", exercise: "Seated DB Shoulder Press", alternates: ["Machine Shoulder Press", "Standing Barbell Press", "Arnold Press", "Landmine Press"], sets: 3, targetReps: "8-10" },
  { day: "push", dayLabel: "Push", pattern: "Side Delts", exercise: "Lateral Raise", alternates: ["Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], sets: 3, targetReps: "12-15" },
  { day: "push", dayLabel: "Push", pattern: "Triceps", exercise: "Triceps Pushdown", alternates: ["Overhead Cable Extension", "Close-Grip Push-Up", "Machine Dip", "Skull Crusher"], sets: 3, targetReps: "10-12" },

  { day: "lower", dayLabel: "Lower", pattern: "Squat Pattern", exercise: "Leg Press or Squat", alternates: ["Hack Squat", "Goblet Squat", "Smith Squat", "Split Squat"], sets: 3, targetReps: "6-10" },
  { day: "lower", dayLabel: "Lower", pattern: "Hip Hinge", exercise: "Romanian Deadlift", alternates: ["DB Romanian Deadlift", "Hip Thrust", "Good Morning", "Cable Pull-Through"], sets: 3, targetReps: "8-10" },
  { day: "lower", dayLabel: "Lower", pattern: "Single-Leg", exercise: "Walking Lunges", alternates: ["Bulgarian Split Squat", "Step-Up", "Reverse Lunge", "Single-Leg Leg Press"], sets: 3, targetReps: "10/leg" },
  { day: "lower", dayLabel: "Lower", pattern: "Hamstring Curl", exercise: "Leg Curl", alternates: ["Seated Leg Curl", "Lying Leg Curl", "Swiss Ball Curl", "Nordic Curl"], sets: 3, targetReps: "10-12" },
  { day: "lower", dayLabel: "Lower", pattern: "Calves", exercise: "Calf Raise", alternates: ["Seated Calf Raise", "Leg Press Calf Raise", "Single-Leg Calf Raise"], sets: 3, targetReps: "12-15" },

  { day: "pull", dayLabel: "Pull", pattern: "Vertical Pull", exercise: "Pull-Ups / Assisted Pull-Ups", alternates: ["Lat Pulldown", "Neutral-Grip Pulldown", "Assisted Pull-Up", "Cable Pullover"], sets: 3, targetReps: "AMRAP" },
  { day: "pull", dayLabel: "Pull", pattern: "Lat Focus", exercise: "Lat Pulldown", alternates: ["Pull-Up", "Assisted Pull-Up", "Single-Arm Pulldown", "Machine High Row"], sets: 3, targetReps: "8-12" },
  { day: "pull", dayLabel: "Pull", pattern: "Horizontal Row", exercise: "Seated Row", alternates: ["Chest-Supported Row", "One-Arm DB Row", "Cable Row", "Machine Row"], sets: 3, targetReps: "8-12" },
  { day: "pull", dayLabel: "Pull", pattern: "Rear Delts", exercise: "Face Pull", alternates: ["Reverse Pec Deck", "Cable Rear Delt Fly", "DB Rear Delt Raise"], sets: 3, targetReps: "12-15" },
  { day: "pull", dayLabel: "Pull", pattern: "Biceps", exercise: "Biceps Curl", alternates: ["Incline DB Curl", "Cable Curl", "Hammer Curl", "Preacher Curl"], sets: 3, targetReps: "10-12" },

  { day: "full", dayLabel: "Full Body", pattern: "Push", exercise: "DB Bench or Push-Ups", alternates: ["Machine Chest Press", "Push-Up", "Barbell Bench Press", "Cable Chest Press"], sets: 3, targetReps: "8-12" },
  { day: "full", dayLabel: "Full Body", pattern: "Row", exercise: "Cable Row", alternates: ["Chest-Supported Row", "Seated Row", "Machine Row", "One-Arm DB Row"], sets: 3, targetReps: "8-12" },
  { day: "full", dayLabel: "Full Body", pattern: "Squat", exercise: "Goblet Squat", alternates: ["Leg Press", "Hack Squat", "DB Split Squat", "Smith Squat"], sets: 3, targetReps: "10-12" },
  { day: "full", dayLabel: "Full Body", pattern: "Carry", exercise: "Farmer Carry", alternates: ["Suitcase Carry", "Trap Bar Carry", "Sled Push", "Dead Bug Hold"], sets: 2, targetReps: "30-60 sec" },
  { day: "full", dayLabel: "Full Body", pattern: "Core", exercise: "Hanging Knee Raise", alternates: ["Cable Crunch", "Dead Bug", "Reverse Crunch", "Plank"], sets: 3, targetReps: "10-15" }
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
    date: todayISO(i),
    weight: "",
    steps: "",
    calories: "",
    protein: "",
    cardioMinutes: "",
    waist: ""
  }));
}

function createWorkoutSets(count: number): WorkoutSet[] {
  return Array.from({ length: Math.max(1, count) }).map(() => ({
    id: cryptoSafeId(),
    weight: "",
    reps: "",
    rpe: ""
  }));
}

function seedWorkoutLogs(): ExerciseLog[] {
  return workoutTemplate.map((item) => ({
    id: cryptoSafeId(),
    ...item,
    workoutSets: createWorkoutSets(item.sets),
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
  const [selectedDashboardDate, setSelectedDashboardDate] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});
  const [expandedNutritionSections, setExpandedNutritionSections] = useState<Record<string, boolean>>({
    logMeal: true,
    smartSearch: false,
    totals: true,
    loggedMeals: true,
    presets: false
  });
  const [customExerciseDrafts, setCustomExerciseDrafts] = useState<Record<string, string>>({});
  const [state, setState] = useState<AppState>(initialState);
  const [mealPresetName, setMealPresetName] = useState("");
  const [mealDraft, setMealDraft] = useState<FoodItem>({
    id: "draft",
    meal: "Breakfast",
    food: "",
    grams: 100,
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0
  });
  const [mealDraftUnit, setMealDraftUnit] = useState<"g" | "ml" | "oz">("g");
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [foodSearchGrams, setFoodSearchGrams] = useState<number | "">(100);
  const [foodSearchResult, setFoodSearchResult] = useState<FoodSearchResult | null>(null);
  const [isSearchingFood, setIsSearchingFood] = useState(false);
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
          currentStepBaseline: numberOrDefault(parsed.settings?.currentStepBaseline, defaultSettings.currentStepBaseline),
          workoutsPerWeek: numberOrDefault((parsed.settings as Settings)?.workoutsPerWeek, defaultSettings.workoutsPerWeek),
          experienceLevel:
            (parsed.settings as Settings)?.experienceLevel === "beginner" ||
            (parsed.settings as Settings)?.experienceLevel === "intermediate" ||
            (parsed.settings as Settings)?.experienceLevel === "advanced"
              ? (parsed.settings as Settings).experienceLevel
              : defaultSettings.experienceLevel,
          sessionLength: numberOrDefault((parsed.settings as Settings)?.sessionLength, defaultSettings.sessionLength),
          equipmentAccess:
            (parsed.settings as Settings)?.equipmentAccess === "full_gym" ||
            (parsed.settings as Settings)?.equipmentAccess === "home" ||
            (parsed.settings as Settings)?.equipmentAccess === "dumbbells" ||
            (parsed.settings as Settings)?.equipmentAccess === "machines"
              ? (parsed.settings as Settings).equipmentAccess
              : defaultSettings.equipmentAccess,
          limitations:
            typeof (parsed.settings as Settings)?.limitations === "string"
              ? (parsed.settings as Settings).limitations
              : defaultSettings.limitations,
          trainingEmphasis:
            (parsed.settings as Settings)?.trainingEmphasis === "aesthetic" ||
            (parsed.settings as Settings)?.trainingEmphasis === "strength" ||
            (parsed.settings as Settings)?.trainingEmphasis === "mobility" ||
            (parsed.settings as Settings)?.trainingEmphasis === "fat_loss_support"
              ? (parsed.settings as Settings).trainingEmphasis
              : defaultSettings.trainingEmphasis
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
        workoutLogs: (parsed.workoutLogs?.length ? parsed.workoutLogs : seedWorkoutLogs()).map((w) => normalizeWorkoutLog(w)),
        workoutHistory: Array.isArray((parsed as AppState).workoutHistory)
          ? (parsed as AppState).workoutHistory.map((session) => ({
              ...session,
              totalVolume: numberOrDefault(session.totalVolume, 0),
              exercises: session.exercises.map((w) => normalizeWorkoutLog(w))
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

  const selectedDashboardLog = selectedDashboardDate
    ? state.dailyLogs.find((log) => log.date === selectedDashboardDate) || null
    : null;

  const displayWeight = selectedDashboardLog ? numberOrNull(selectedDashboardLog.weight) : avgWeight;
  const displaySteps = selectedDashboardLog ? numberOrNull(selectedDashboardLog.steps) : avgSteps;
  const displayCalories = selectedDashboardLog ? numberOrNull(selectedDashboardLog.calories) : avgCalories;
  const displayProtein = selectedDashboardLog ? numberOrNull(selectedDashboardLog.protein) : avgProtein;
  const displayCardio = selectedDashboardLog ? numberOrNull(selectedDashboardLog.cardioMinutes) : avgCardio;
  const displayWaist = selectedDashboardLog ? numberOrNull(selectedDashboardLog.waist) : avgWaist;
  const dashboardScopeLabel = selectedDashboardLog ? formatDisplayDate(selectedDashboardLog.date) : "Weekly average";

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
      (x) =>
        x.notes.trim() !== "" ||
        x.workoutSets?.some((set) => set.weight !== "" || set.reps !== "" || set.rpe !== "") ||
        x.weight !== "" ||
        x.repsDone !== "" ||
        x.rpe !== ""
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

  const readinessScore = getReadinessScore({
    avgProtein,
    avgSteps,
    workoutCompletion,
    settings: state.settings
  });

  const todaySignals = getTodaySignals({
    settings: state.settings,
    avgCalories,
    avgProtein,
    avgSteps,
    avgCardio,
    workoutCompletion,
    foodTotals
  });

  const baseSetup = getBaseSetup({
    settings: state.settings,
    avgCalories,
    avgProtein,
    avgSteps,
    foodTotals,
    workoutCompletion
  });

  const cardioRoutine = getCardioRoutine({
    settings: state.settings,
    avgSteps,
    avgCardio,
    workoutCompletion
  });

  const weekStatus = getWeekStatus(state.dailyLogs);
  const streakDays = getCurrentStreak(state.dailyLogs);
  const weeklyXp = getWeeklyXp({
    readinessScore,
    weekStatus,
    workoutCompletion
  });
  const badges = getBadges({
    streakDays,
    avgProtein,
    avgSteps,
    workoutCompletion,
    settings: state.settings
  });

  const xpRules = getXpRules({
    avgProtein,
    avgSteps,
    avgCalories,
    workoutCompletion,
    settings: state.settings
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

  function updateWorkoutSet(exerciseId: string, setId: string, key: keyof WorkoutSet, value: number | "") {
    setState((prev) => ({
      ...prev,
      workoutLogs: prev.workoutLogs.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;

        const updatedSets = exercise.workoutSets.map((set) =>
          set.id === setId ? { ...set, [key]: value } : set
        );

        const topSet = updatedSets[0] || { weight: "", reps: "", rpe: "" };

        return {
          ...exercise,
          workoutSets: updatedSets,
          sets: updatedSets.length,
          weight: cleanNumber(topSet.weight),
          repsDone: cleanNumber(topSet.reps),
          rpe: cleanNumber(topSet.rpe)
        };
      })
    }));
  }

  function addSetToExercise(exerciseId: string) {
    setState((prev) => ({
      ...prev,
      workoutLogs: prev.workoutLogs.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              workoutSets: [...exercise.workoutSets, { id: cryptoSafeId(), weight: "", reps: "", rpe: "" }],
              sets: exercise.workoutSets.length + 1
            }
          : exercise
      )
    }));
  }

  function deleteSetFromExercise(exerciseId: string, setId: string) {
    setState((prev) => ({
      ...prev,
      workoutLogs: prev.workoutLogs.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;

        const remainingSets = exercise.workoutSets.filter((set) => set.id !== setId);
        const safeSets = remainingSets.length ? remainingSets : createWorkoutSets(1);
        const topSet = safeSets[0];

        return {
          ...exercise,
          workoutSets: safeSets,
          sets: safeSets.length,
          weight: cleanNumber(topSet.weight),
          repsDone: cleanNumber(topSet.reps),
          rpe: cleanNumber(topSet.rpe)
        };
      })
    }));
  }

  function updateExerciseChoice(id: string, exercise: string) {
    setState((prev) => ({
      ...prev,
      workoutLogs: prev.workoutLogs.map((item) =>
        item.id === id ? { ...item, exercise } : item
      )
    }));
  }

  function toggleDay(day: string) {
    setExpandedDays((prev) => ({ ...prev, [day]: !prev[day] }));
  }

  function toggleExercise(id: string) {
    setExpandedExercises((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleNutritionSection(section: string) {
    setExpandedNutritionSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function addCustomExerciseChoice(id: string) {
    const customName = customExerciseDrafts[id]?.trim();

    if (!customName) {
      alert("Enter the exercise name first.");
      return;
    }

    setState((prev) => ({
      ...prev,
      workoutLogs: prev.workoutLogs.map((item) =>
        item.id === id
          ? {
              ...item,
              exercise: customName,
              alternates: Array.from(new Set([...item.alternates, customName]))
            }
          : item
      )
    }));

    setCustomExerciseDrafts((prev) => ({ ...prev, [id]: "" }));
  }

  function deleteExerciseFromWorkout(id: string) {
    setState((prev) => ({
      ...prev,
      workoutLogs: prev.workoutLogs.filter((item) => item.id !== id)
    }));
    setConfirmingId(null);
  }

  function addExerciseToDay(day: string) {
    const dayLabel = getDayLabel(day);

    setState((prev) => ({
      ...prev,
      workoutLogs: [
        ...prev.workoutLogs,
        {
          id: cryptoSafeId(),
          day,
          dayLabel,
          pattern: "Custom",
          exercise: "New exercise",
          alternates: ["New exercise"],
          sets: 2,
          targetReps: "8-12",
          workoutSets: createWorkoutSets(2),
          weight: "",
          repsDone: "",
          rpe: "",
          notes: ""
        }
      ]
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

  async function searchFoodMacros() {
    const query = foodSearchQuery.trim();

    if (!query) {
      alert("Enter a food name first.");
      return;
    }

    const grams = foodSearchGrams === "" ? 100 : foodSearchGrams;

    setIsSearchingFood(true);
    setFoodSearchResult(null);

    try {
      const response = await fetch("/api/food-search", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          query,
          grams
        })
      });

      if (!response.ok) {
        throw new Error("Food search failed.");
      }

      const result = (await response.json()) as FoodSearchResult;
      setFoodSearchResult(result);
    } catch {
      alert("Could not search food. Check API keys and route deployment.");
    } finally {
      setIsSearchingFood(false);
    }
  }

  function addFoodSearchResult() {
    if (!foodSearchResult) return;

    setState((prev) => ({
      ...prev,
      foods: [
        ...prev.foods,
        {
          id: cryptoSafeId(),
          meal: "Search",
          food: foodSearchResult.food,
          grams: foodSearchResult.grams,
          calories: foodSearchResult.calories,
          protein: foodSearchResult.protein,
          carbs: foodSearchResult.carbs,
          fats: foodSearchResult.fats
        }
      ]
    }));

    setFoodSearchQuery("");
    setFoodSearchGrams(100);
    setFoodSearchResult(null);
  }

  function updateMealDraft<K extends keyof FoodItem>(key: K, value: FoodItem[K]) {
    setMealDraft((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  function addMealDraft() {
    const foodName = mealDraft.food.trim();

    if (!foodName) {
      alert("Enter the food or meal name first.");
      return;
    }

    setState((prev) => ({
      ...prev,
      foods: [
        ...prev.foods,
        {
          ...mealDraft,
          id: cryptoSafeId(),
          food: foodName
        }
      ]
    }));

    setMealDraft({
      id: "draft",
      meal: mealDraft.meal,
      food: "",
      grams: 100,
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0
    });
    setMealDraftUnit("g");
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
    setState((prev) => ({
      ...prev,
      mealPresets: prev.mealPresets.filter((preset) => preset.id !== id)
    }));
  }

  function calculateExerciseVolume(exercise: ExerciseLog) {
    if (exercise.workoutSets?.length) {
      return exercise.workoutSets.reduce((sum, set) => {
        return sum + numberOrDefault(set.weight, 0) * numberOrDefault(set.reps, 0);
      }, 0);
    }

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
      (exercise) =>
        exercise.notes.trim() !== "" ||
        exercise.workoutSets?.some((set) => set.weight !== "" || set.reps !== "" || set.rpe !== "") ||
        exercise.weight !== "" ||
        exercise.repsDone !== "" ||
        exercise.rpe !== ""
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
    <main className="container game-shell">
      <div className="game-header">
        <div>
          <p className="brand-title">BetterBeFit</p>
          <p className="subtitle">Recomp, gamified without the noise.</p>
        </div>

        <div className="game-header-actions">
          <div className="streak-badge">🔥 {streakDays} day streak</div>
          <button className="btn secondary small-btn" onClick={exportBackup}>
            Export
          </button>
          <button className="btn secondary small-btn" onClick={() => fileInputRef.current?.click()}>
            Import
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
        <div className="game-dashboard">
          <section className="dashboard-scope-card">
            <div>
              <div className="small">Dashboard view</div>
              <strong>{dashboardScopeLabel}</strong>
            </div>
            {selectedDashboardDate ? (
              <button className="btn secondary" onClick={() => setSelectedDashboardDate(null)}>
                Show full week
              </button>
            ) : null}
          </section>

          <section className="level-card">
            <div className="row space-between">
              <div>
                <div className="small">Weekly XP</div>
                <h2 className="level-title">Level {weeklyXp.level} — {weeklyXp.title}</h2>
              </div>
              <div className="xp-number">{weeklyXp.xp} XP</div>
            </div>

            <div className="xp-track">
              <div className="xp-fill" style={{ width: `${weeklyXp.progress}%` }} />
            </div>

            <div className="row space-between">
              <span className="small">{weeklyXp.xp} XP earned</span>
              <span className="small">{weeklyXp.remaining} XP to Level {weeklyXp.level + 1}</span>
            </div>
          </section>

          <section>
            <h2 className="game-section-title">This week</h2>
            <div className="week-row">
              {weekStatus.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  className={`week-day ${day.isToday ? "today" : "neutral"} ${selectedDashboardDate === day.date ? "selected" : ""}`}
                  onClick={() => setSelectedDashboardDate((current) => current === day.date ? null : day.date)}
                  title={`View dashboard metrics for ${day.date}`}
                >
                  <span className="week-date">{day.dateNumber}</span>
                  <span className="week-label">{day.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="game-metrics">
            <GameMetricCard
              title="Protein"
              value={formatNumber(displayProtein, "g")}
              hint={(displayProtein ?? 0) >= state.settings.proteinTarget ? "Target hit" : `${Math.max(0, Math.round(state.settings.proteinTarget - (displayProtein ?? 0)))}g left`}
              tone={(displayProtein ?? 0) >= state.settings.proteinTarget ? "green" : "amber"}
            />
            <GameMetricCard
              title="Steps"
              value={formatNumber(displaySteps)}
              hint={(displaySteps ?? 0) >= state.settings.stepTarget ? "Target crushed" : `${Math.max(0, Math.round(state.settings.stepTarget - (displaySteps ?? 0))).toLocaleString()} left`}
              tone={(displaySteps ?? 0) >= state.settings.stepTarget ? "green" : "amber"}
            />
            <GameMetricCard
              title="Calories"
              value={formatNumber(displayCalories)}
              hint={displayCalories === null ? "Log intake" : `${Math.round(displayCalories - state.settings.targetCalories)} kcal vs target`}
              tone={displayCalories !== null && Math.abs(displayCalories - state.settings.targetCalories) <= 150 ? "green" : "amber"}
            />
            <GameMetricCard
              title="Cardio"
              value={formatNumber(displayCardio, "min")}
              hint="weekly average"
              tone={(displayCardio ?? 0) >= 20 ? "green" : "amber"}
            />
            <GameMetricCard
              title="Workouts"
              value={`${workoutCompletion}%`}
              hint={workoutCompletion >= 70 ? "locked in" : "log more"}
              tone={workoutCompletion >= 70 ? "green" : "amber"}
            />
          </section>

          <section className="readiness-panel">
            <div
              className="readiness-ring"
              style={{ background: `conic-gradient(#2dd4a3 ${readinessScore * 3.6}deg, #30343b 0deg)` }}
            >
              <div className="readiness-inner">{readinessScore}%</div>
            </div>
            <div>
              <h2>Readiness score</h2>
              <p>{getReadinessMessage(readinessScore)}</p>
            </div>
          </section>

          <section>
            <h2 className="game-section-title">Unlock next</h2>
            <div className="badge-grid">
              {badges.map((badge) => (
                <div key={badge.title} className={`achievement-card ${badge.unlocked ? "unlocked" : ""}`}>
                  <div className="achievement-icon">{badge.icon}</div>
                  <strong>{badge.title}</strong>
                  <span>{badge.detail}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="game-section-title">How XP works</h2>
            <div className="xp-rules-grid">
              {xpRules.map((rule) => (
                <div key={rule.label} className={`xp-rule ${rule.earned ? "earned" : ""}`}>
                  <strong>{rule.points}</strong>
                  <span>{rule.label}</span>
                </div>
              ))}
            </div>
            <p className="small" style={{ marginTop: 10 }}>
              Nothing removes XP. Missed items simply do not earn points.
            </p>
          </section>

          <section>
            <h2 className="game-section-title">Today’s signals</h2>
            <div className="signal-stack">
              {todaySignals.map((signal) => (
                <div key={signal.text} className={`game-signal ${signal.type}`}>
                  <span className="signal-dot" />
                  <p>{signal.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-2">
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Cardio plan</h2>
              <div className="signal-stack">
                {cardioRoutine.map((item) => (
                  <div className="mini-signal" key={item}>{item}</div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 style={{ marginTop: 0 }}>Base setup</h2>
              <div className="signal-stack">
                {baseSetup.map((item) => (
                  <div className="mini-signal" key={item}>{item}</div>
                ))}
              </div>
            </div>
          </section>

          <section className="card">
            <div className="row space-between">
              <h2 style={{ margin: 0 }}>Coach note</h2>
              <span className="badge">Auto-guided</span>
            </div>
            <p style={{ marginTop: 12, lineHeight: 1.6 }}>{recommendation}</p>
          </section>
        </div>
      )}

      {tab === "workouts" && (
        <div className="grid compact-page">
          <div className="card airy-card">
            <div className="row space-between">
              <div>
                <h2 style={{ margin: 0 }}>Training plan</h2>
                <p className="small" style={{ marginTop: 6 }}>
                  Tap a workout day, then tap an exercise to log sets.
                </p>
              </div>
              <div className="row">
                <button className="btn" onClick={logWorkout}>Log workout</button>
                <button className="btn secondary" onClick={() => setState((prev) => ({ ...prev, workoutLogs: seedWorkoutLogs() }))}>Reset</button>
              </div>
            </div>
          </div>

          {getWorkoutDayGroups(state.workoutLogs).map((group) => {
            const isDayOpen = !!expandedDays[group.day];
            const loggedExercises = group.exercises.filter((exercise) => calculateExerciseVolume(exercise) > 0).length;
            const dayVolume = calculateSessionVolume(group.exercises);

            return (
              <div className="workout-day-shell" key={group.day}>
                <button className={`collapse-pill workout-day-pill ${isDayOpen ? "open" : ""}`} onClick={() => toggleDay(group.day)}>
                  <div>
                    <strong>{group.dayLabel}</strong>
                    <span className="pill-subtext">{group.exercises.length} exercises • {loggedExercises} logged • {dayVolume} volume</span>
                  </div>
                  <span className="pill-icon">{isDayOpen ? "−" : "+"}</span>
                </button>

                {isDayOpen ? (
                  <div className="card workout-day-card compact-expanded">
                    <div className="row space-between">
                      <p className="small" style={{ margin: 0 }}>{getDayDescription(group.day)}</p>
                      {confirmingId === `add-${group.day}` ? (
                        <div className="row inline-confirm">
                          <span className="small">
                            Adding an exercise is not advisable. The current plan's volume ensures maximum recovery, addition of exercises may cause reduced recovery.
                          </span>
                          <button className="btn warn" onClick={() => addExerciseToDay(group.day)}>Yes, add</button>
                          <button className="btn secondary" onClick={() => setConfirmingId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn secondary" onClick={() => setConfirmingId(`add-${group.day}`)}>Add exercise</button>
                      )}
                    </div>

                    <div className="exercise-pill-list">
                      {group.exercises.map((item) => {
                        const previous = getPreviousExercise(item.exercise);
                        const previousVolume = previous ? calculateExerciseVolume(previous) : 0;
                        const currentVolume = calculateExerciseVolume(item);
                        const hasCurrentVolume = currentVolume > 0;
                        const hasProgress = previousVolume > 0 && currentVolume > previousVolume;
                        const choices = Array.from(new Set([item.exercise, ...item.alternates]));
                        const isExerciseOpen = !!expandedExercises[item.id];

                        return (
                          <SwipeToDelete
                            key={item.id}
                            className="exercise-swipe"
                            onDelete={() => deleteExerciseFromWorkout(item.id)}
                          >
                            <div className={`exercise-pill-card ${isExerciseOpen ? "open" : ""}`}>
                              <button className="collapse-pill exercise-collapse-pill" onClick={() => toggleExercise(item.id)}>
                              <div>
                                <span className="pattern-pill">{item.pattern}</span>
                                <strong>{item.exercise}</strong>
                                <span className="pill-subtext">
                                  {item.workoutSets.length} sets • {currentVolume > 0 ? `${currentVolume} volume` : "Tap to log"}
                                </span>
                              </div>
                              <span className="pill-icon">{isExerciseOpen ? "−" : "+"}</span>
                            </button>

                            {isExerciseOpen ? (
                              <div className="exercise-expanded">
                                <div className="row space-between">
                                  <span className="badge">{item.sets} sets • {item.targetReps}</span>

                                </div>

                                <Field label="Choose exercise">
                                  <select className="input" value={item.exercise} onChange={(e) => updateExerciseChoice(item.id, e.target.value)}>
                                    {choices.map((choice) => (
                                      <option key={choice} value={choice}>{choice}</option>
                                    ))}
                                  </select>
                                </Field>

                                <div className="custom-exercise-row">
                                  <input
                                    className="input"
                                    value={customExerciseDrafts[item.id] || ""}
                                    placeholder="Add custom exercise"
                                    onChange={(e) => setCustomExerciseDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                  />
                                  <button className="btn secondary" onClick={() => addCustomExerciseChoice(item.id)}>Add option</button>
                                </div>

                                <div className="small">
                                  {previous ? `Previous: ${numberOrDefault(previous.weight, 0)} kg x ${numberOrDefault(previous.repsDone, 0)} reps = ${previousVolume}` : "New exercise"}
                                </div>
                                <div className="small overload-text">
                                  {hasCurrentVolume
                                    ? hasProgress
                                      ? "Progressive overload achieved"
                                      : previousVolume > 0
                                        ? `Beat ${previousVolume} total volume`
                                        : `Current volume: ${currentVolume}`
                                    : "Log weight and reps to compare progress."}
                                </div>

                                <div className="set-logger">
                                  <div className="row space-between">
                                    <strong>Sets</strong>
                                    <button className="btn secondary compact-exercise-btn" onClick={() => addSetToExercise(item.id)}>Add set</button>
                                  </div>

                                  {item.workoutSets.map((set, setIndex) => (
                                    <SwipeToDelete
                                      key={set.id}
                                      className="set-swipe"
                                      disabled={item.workoutSets.length <= 1}
                                      onDelete={() => deleteSetFromExercise(item.id, set.id)}
                                    >
                                      <details className="set-detail-card" open={setIndex === 0}>
                                        <summary>
                                        <span>Set {setIndex + 1}</span>
                                        <span>{numberOrDefault(set.weight, 0)} kg × {numberOrDefault(set.reps, 0)} reps</span>
                                      </summary>
                                      <div className="set-row">
                                        <Field label="Weight">
                                          <NumericInput value={set.weight} onChange={(v) => updateWorkoutSet(item.id, set.id, "weight", v)} placeholder={previous ? String(numberOrDefault(previous.weight, 0)) : "New"} />
                                        </Field>
                                        <Field label="Reps">
                                          <NumericInput value={set.reps} onChange={(v) => updateWorkoutSet(item.id, set.id, "reps", v)} placeholder={previous ? String(numberOrDefault(previous.repsDone, 0)) : ""} />
                                        </Field>
                                        <Field label="RPE">
                                          <NumericInput value={set.rpe} onChange={(v) => updateWorkoutSet(item.id, set.id, "rpe", v)} />
                                        </Field>
                                      </div>
                                      </details>
                                    </SwipeToDelete>
                                  ))}
                                </div>

                                <Field label="Notes">
                                  <input className="input" value={item.notes} onChange={(e) => updateWorkout(item.id, "notes", e.target.value)} placeholder="Form cues, pain, tempo, etc." />
                                </Field>
                              </div>
                            ) : null}
                            </div>
                          </SwipeToDelete>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="card" style={{ background: "#0f172a" }}>
            <strong>Progression rule:</strong> stay 1-2 reps shy of failure on most sets. When you hit the top of the target rep range with solid form, increase load next week.
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Workout history</h2>
            {state.workoutHistory.length === 0 ? (
              <p className="small">No workouts logged yet. Fill today’s workout and press Log workout.</p>
            ) : (
              <div className="history-card-list">
                {state.workoutHistory.map((session) => (
                  <SwipeToDelete
                    key={session.id}
                    className="history-swipe"
                    onDelete={() => deleteWorkoutSession(session.id)}
                  >
                    <div className="history-card">
                      <div>
                        <strong>{session.date}</strong>
                        <div className="small">{session.totalVolume} total volume</div>
                        <div className="small">
                          {session.exercises
                            .filter((exercise) => calculateExerciseVolume(exercise) > 0)
                            .map((exercise) => `${exercise.exercise}: ${calculateExerciseVolume(exercise)} volume`)
                            .join(", ")}
                        </div>
                      </div>
                      <button className="btn secondary" onClick={() => loadWorkoutSession(session)}>Load</button>
                    </div>
                  </SwipeToDelete>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "nutrition" && (
        <div className="nutrition-page compact-page">
          <section className="compact-section">
            <button className={`collapse-pill section-pill ${expandedNutritionSections.logMeal ? "open" : ""}`} onClick={() => toggleNutritionSection("logMeal")}>
              <div>
                <strong>Log meal</strong>
                <span className="pill-subtext">Add food, grams, calories and macros</span>
              </div>
              <span className="pill-icon">{expandedNutritionSections.logMeal ? "−" : "+"}</span>
            </button>

            {expandedNutritionSections.logMeal ? (
              <div className="card nutrition-input-card compact-expanded">
                <div className="meal-log-grid">
                  <Field label="Meal">
                    <select className="input" value={mealDraft.meal} onChange={(e) => updateMealDraft("meal", e.target.value)}>
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Snack">Snack</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Coffee">Coffee</option>
                      <option value="Pre-workout">Pre-workout</option>
                      <option value="Post-workout">Post-workout</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </Field>

                  <Field label="Food / meal">
                    <input className="input" value={mealDraft.food} placeholder="e.g. chicken biryani" onChange={(e) => updateMealDraft("food", e.target.value)} />
                  </Field>

                  <Field label="Amount">
                    <div className="unit-row">
                      <NumericInput value={mealDraft.grams} onChange={(v) => updateMealDraft("grams", v === "" ? 0 : v)} />
                      <select className="input unit-select" value={mealDraftUnit} onChange={(e) => setMealDraftUnit(e.target.value as "g" | "ml" | "oz")}>
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="oz">oz</option>
                      </select>
                    </div>
                  </Field>

                  <Field label="Calories"><NumericInput value={mealDraft.calories} onChange={(v) => updateMealDraft("calories", v === "" ? 0 : v)} /></Field>
                  <Field label="Protein"><NumericInput value={mealDraft.protein} onChange={(v) => updateMealDraft("protein", v === "" ? 0 : v)} /></Field>
                  <Field label="Carbs"><NumericInput value={mealDraft.carbs} onChange={(v) => updateMealDraft("carbs", v === "" ? 0 : v)} /></Field>
                  <Field label="Fat"><NumericInput value={mealDraft.fats} onChange={(v) => updateMealDraft("fats", v === "" ? 0 : v)} /></Field>

                  <div className="meal-action-cell">
                    <button className="btn" onClick={addMealDraft}>Add</button>
                    <button className="btn secondary" onClick={() => setMealDraft({ id: "draft", meal: mealDraft.meal, food: "", grams: 100, calories: 0, protein: 0, carbs: 0, fats: 0 })}>Clear</button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="compact-section">
            <button className={`collapse-pill section-pill ${expandedNutritionSections.smartSearch ? "open" : ""}`} onClick={() => toggleNutritionSection("smartSearch")}>
              <div>
                <strong>Smart food search</strong>
                <span className="pill-subtext">Use USDA or AI-estimated macros</span>
              </div>
              <span className="pill-icon">{expandedNutritionSections.smartSearch ? "−" : "+"}</span>
            </button>

            {expandedNutritionSections.smartSearch ? (
              <div className="card compact-expanded" style={{ background: "#0f172a" }}>
                <p className="small">Search standard foods using USDA first. Mixed or Indian-style meals are estimated with Claude.</p>
                <div className="row">
                  <input className="input" value={foodSearchQuery} placeholder="e.g. chicken biryani, chicken breast, curd rice" onChange={(e) => setFoodSearchQuery(e.target.value)} />
                  <NumericInput value={foodSearchGrams} onChange={(v) => setFoodSearchGrams(v)} placeholder="grams" />
                  <button className="btn" onClick={searchFoodMacros} disabled={isSearchingFood}>{isSearchingFood ? "Searching..." : "Search macros"}</button>
                </div>

                {foodSearchResult ? (
                  <div className="card" style={{ marginTop: 14 }}>
                    <div className="row space-between">
                      <div>
                        <strong>{foodSearchResult.food}</strong>
                        <div className="small">{foodSearchResult.grams}g | {foodSearchResult.calories} cal | P {foodSearchResult.protein}g | C {foodSearchResult.carbs}g | F {foodSearchResult.fats}g</div>
                        <div className="small">{foodSearchResult.source === "usda" ? "Verified data" : foodSearchResult.source === "claude" ? "Estimated (AI)" : "Saved result"} | Confidence: {foodSearchResult.confidence}</div>
                        <div className="small">{foodSearchResult.note}</div>
                      </div>
                      <button className="btn" onClick={() => {
                        setMealDraft({
                          id: "draft",
                          meal: "Search",
                          food: foodSearchResult.food,
                          grams: foodSearchResult.grams,
                          calories: foodSearchResult.calories,
                          protein: foodSearchResult.protein,
                          carbs: foodSearchResult.carbs,
                          fats: foodSearchResult.fats
                        });
                        setMealDraftUnit("g");
                        setFoodSearchQuery("");
                        setFoodSearchGrams(100);
                        setFoodSearchResult(null);
                        setExpandedNutritionSections((prev) => ({ ...prev, logMeal: true }));
                      }}>Use in log form</button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="compact-section">
            <button className={`collapse-pill section-pill ${expandedNutritionSections.totals ? "open" : ""}`} onClick={() => toggleNutritionSection("totals")}>
              <div>
                <strong>Nutrition totals</strong>
                <span className="pill-subtext">{Math.round(foodTotals.calories)} cal • P {foodTotals.protein.toFixed(1)}g</span>
              </div>
              <span className="pill-icon">{expandedNutritionSections.totals ? "−" : "+"}</span>
            </button>

            {expandedNutritionSections.totals ? (
              <div className="grid grid-2 compact-expanded">
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
                </div>
              </div>
            ) : null}
          </section>

          <section className="compact-section">
            <button className={`collapse-pill section-pill ${expandedNutritionSections.loggedMeals ? "open" : ""}`} onClick={() => toggleNutritionSection("loggedMeals")}>
              <div>
                <strong>Logged meals</strong>
                <span className="pill-subtext">{state.foods.length} items logged</span>
              </div>
              <span className="pill-icon">{expandedNutritionSections.loggedMeals ? "-" : "+"}</span>
            </button>

            {expandedNutritionSections.loggedMeals ? (
              <div className="card logged-meals-card compact-expanded">
                <div className="row space-between">
                  <p className="small" style={{ margin: 0 }}>Meals are grouped so you can scan quickly and expand only what you need.</p>
                  <button className="btn secondary" onClick={addFood}>Add blank row</button>
                </div>

                {state.foods.length === 0 ? (
                  <p className="small">No meals logged yet.</p>
                ) : (
                  <div className="meal-group-list">
                    {["Breakfast", "Lunch", "Snack", "Dinner", "Coffee", "Other"].map((mealType) => {
                      const meals = state.foods.filter((food) => {
                        const mealName = food.meal.trim().toLowerCase();

                        const mealAliases: Record<string, string[]> = {
                          Breakfast: ["breakfast"],
                          Lunch: ["lunch"],
                          Snack: ["snack", "snacks"],
                          Dinner: ["dinner"],
                          Coffee: ["coffee"]
                        };

                        if (mealType === "Other") {
                          return !Object.values(mealAliases)
                            .flat()
                            .some((alias) => mealName.includes(alias));
                        }

                        return (mealAliases[mealType] || [mealType.toLowerCase()]).some((alias) =>
                          mealName.includes(alias)
                        );
                      });

                      const mealTotals = meals.reduce(
                        (acc, food) => {
                          acc.calories += food.calories;
                          acc.protein += food.protein;
                          acc.carbs += food.carbs;
                          acc.fats += food.fats;
                          return acc;
                        },
                        { calories: 0, protein: 0, carbs: 0, fats: 0 }
                      );

                      const isMealOpen = !!expandedNutritionSections[`meal-${mealType}`];

                      return (
                        <div className="meal-group" key={mealType}>
                          <button
                            className={`collapse-pill meal-group-pill ${isMealOpen ? "open" : ""}`}
                            onClick={() => toggleNutritionSection(`meal-${mealType}`)}
                          >
                            <div>
                              <strong>{mealType}</strong>
                              <span className="pill-subtext">
                                {meals.length} items - {Math.round(mealTotals.calories)} cal - P {mealTotals.protein.toFixed(1)}g
                              </span>
                            </div>
                            <span className="pill-icon">{isMealOpen ? "-" : "+"}</span>
                          </button>

                          {isMealOpen ? (
                            <div className="meal-table">
                              <div className="meal-table-header">
                                <span>Food</span>
                                <span>Grams</span>
                                <span>Calories</span>
                                <span>P/C/F</span>
                              </div>

                              {meals.length === 0 ? (
                                <div className="empty-meal-row">No items logged here yet.</div>
                              ) : (
                                meals.map((item) => (
                                  <SwipeToDelete
                                    key={item.id}
                                    className="meal-swipe"
                                    onDelete={() => deleteFood(item.id)}
                                  >
                                    <details className="meal-row">
                                      <summary>
                                      <span>{item.food}</span>
                                      <span>{item.grams}</span>
                                      <span>{item.calories}</span>
                                      <span>{item.protein}/{item.carbs}/{item.fats}</span>
                                    </summary>

                                    <div className="meal-edit-grid">
                                      <Field label="Meal">
                                        <input className="input" value={item.meal} onChange={(e) => updateFood(item.id, "meal", e.target.value)} />
                                      </Field>
                                      <Field label="Food">
                                        <input className="input" value={item.food} onChange={(e) => updateFood(item.id, "food", e.target.value)} />
                                      </Field>
                                      <Field label="Grams">
                                        <NumericInput value={item.grams} onChange={(v) => updateFood(item.id, "grams", v)} />
                                      </Field>
                                      <Field label="Calories">
                                        <NumericInput value={item.calories} onChange={(v) => updateFood(item.id, "calories", v)} />
                                      </Field>
                                      <Field label="Protein">
                                        <NumericInput value={item.protein} onChange={(v) => updateFood(item.id, "protein", v)} />
                                      </Field>
                                      <Field label="Carbs">
                                        <NumericInput value={item.carbs} onChange={(v) => updateFood(item.id, "carbs", v)} />
                                      </Field>
                                      <Field label="Fat">
                                        <NumericInput value={item.fats} onChange={(v) => updateFood(item.id, "fats", v)} />
                                      </Field>
                                    </div>
                                    </details>
                                  </SwipeToDelete>
                                ))
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </section>

          <section className="compact-section">
            <button className={`collapse-pill section-pill ${expandedNutritionSections.presets ? "open" : ""}`} onClick={() => toggleNutritionSection("presets")}>
              <div>
                <strong>Meal presets</strong>
                <span className="pill-subtext">{state.mealPresets.length} saved presets</span>
              </div>
              <span className="pill-icon">{expandedNutritionSections.presets ? "−" : "+"}</span>
            </button>

            {expandedNutritionSections.presets ? (
              <div className="grid grid-2 compact-expanded">
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>Full-day meal preset</h3>
                  <p className="small">Save the current logged meals as a reusable full-day preset.</p>
                  <div className="row">
                    <input className="input" value={mealPresetName} placeholder="Preset name, e.g. Normal training day" onChange={(e) => setMealPresetName(e.target.value)} />
                    <button className="btn" onClick={saveCurrentMealsAsPreset}>Save preset</button>
                  </div>
                </div>
                <div className="card">
                  <h2 style={{ marginTop: 0 }}>Suggested base setup</h2>
                  <div className="signal-stack">
                    {baseSetup.map((item) => <div className="mini-signal" key={item}>{item}</div>)}
                  </div>
                </div>
                <div className="card" style={{ gridColumn: "1 / -1" }}>
                  <h2 style={{ marginTop: 0 }}>Saved full-day presets</h2>
                  {state.mealPresets.length === 0 ? (
                    <p className="small">No presets yet. Build your nutrition log, name it, then save it.</p>
                  ) : (
                    <div className="grid">
                      {state.mealPresets.map((preset) => {
                        const totals = preset.foods.reduce((acc, food) => {
                          acc.calories += food.calories;
                          acc.protein += food.protein;
                          acc.carbs += food.carbs;
                          acc.fats += food.fats;
                          return acc;
                        }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

                        return (
                          <SwipeToDelete
                            key={preset.id}
                            className="preset-swipe"
                            onDelete={() => deleteMealPreset(preset.id)}
                          >
                            <div className="card" style={{ background: "#0f172a" }}>
                              <div className="row space-between">
                              <div>
                                <strong>{preset.name}</strong>
                                <div className="small">{Math.round(totals.calories)} cal | P {totals.protein.toFixed(1)}g | C {totals.carbs.toFixed(1)}g | F {totals.fats.toFixed(1)}g</div>
                              </div>
                              <div className="row">
                                <button className="btn" onClick={() => applyMealPreset(preset)}>Apply</button>
                              </div>
                            </div>
                            </div>
                          </SwipeToDelete>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}

      {tab === "checkin" && (
        <div className="grid compact-page">
          <div className="card">
            <div className="row space-between">
              <div>
                <h2 style={{ margin: 0 }}>7-day check-in</h2>
                <p className="small" style={{ marginTop: 6 }}>
                  Tap a date to expand and log weight, waist, steps, calories, protein and cardio.
                </p>
              </div>
              <button className="btn secondary" onClick={resetWeek}>
                Reset week
              </button>
            </div>

            <div className="checkin-list">
              {state.dailyLogs.map((row, index) => {
                const isOpen = !!expandedDays[`checkin-${row.date}-${index}`];

                return (
                  <div className="checkin-day" key={row.date + index}>
                    <button
                      className={`collapse-pill checkin-day-pill ${isOpen ? "open" : ""}`}
                      onClick={() =>
                        setExpandedDays((prev) => ({
                          ...prev,
                          [`checkin-${row.date}-${index}`]: !prev[`checkin-${row.date}-${index}`]
                        }))
                      }
                    >
                      <div>
                        <strong>{formatDisplayDate(row.date || todayISO())}</strong>
                        <span className="pill-subtext">
                          Weight: {row.weight || "-"} kg - Steps: {row.steps || "-"} - Protein: {row.protein || "-"}g
                        </span>
                      </div>
                      <span className="pill-icon">{isOpen ? "-" : "+"}</span>
                    </button>

                    {isOpen ? (
                      <div className="card compact-expanded checkin-expanded-card">
                        <Field label="Date">
                          <input
                            className="input"
                            type="date"
                            value={row.date || todayISO()}
                            onChange={(e) => updateDaily(index, "date", e.target.value)}
                          />
                        </Field>

                        <div className="checkin-input-grid">
                          <Field label="Weight">
                            <NumericInput value={row.weight} onChange={(v) => updateDaily(index, "weight", v)} />
                          </Field>
                          <Field label="Waist">
                            <NumericInput value={row.waist} onChange={(v) => updateDaily(index, "waist", v)} />
                          </Field>
                          <Field label="Steps">
                            <NumericInput value={row.steps} onChange={(v) => updateDaily(index, "steps", v)} />
                          </Field>
                          <Field label="Calories">
                            <NumericInput value={row.calories} onChange={(v) => updateDaily(index, "calories", v)} />
                          </Field>
                          <Field label="Protein">
                            <NumericInput value={row.protein} onChange={(v) => updateDaily(index, "protein", v)} />
                          </Field>
                          <Field label="Cardio min">
                            <NumericInput value={row.cardioMinutes} onChange={(v) => updateDaily(index, "cardioMinutes", v)} />
                          </Field>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-3">
            <MetricCard title="Avg Weight" value={formatNumber(avgWeight, "kg")} hint="Use average, not daily spikes" />
            <MetricCard title="Avg Waist" value={formatNumber(avgWaist, "cm")} hint="Best fat-loss signal" />
            <MetricCard title="Avg Steps" value={formatNumber(displaySteps)} hint="NEAT target" />
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Check-in logs</h2>
            <div className="checkin-history">
              <div className="checkin-history-header">
                <span>Date</span>
                <span>Weight</span>
                <span>Steps</span>
                <span>Calories</span>
                <span>Protein</span>
              </div>

              {state.dailyLogs.map((row, index) => (
                <div className="history-row" key={`history-${row.date}-${index}`}>
                  <span>{formatDisplayDate(row.date || todayISO())}</span>
                  <span>{row.weight || "-"}</span>
                  <span>{row.steps || "-"}</span>
                  <span>{row.calories || "-"}</span>
                  <span>{row.protein || "-"}</span>
                </div>
              ))}
            </div>
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
            <div className="card" style={{ marginTop: 14, background: "#0f172a" }}>
              <h3 style={{ marginTop: 0 }}>Workout generation inputs</h3>
              <p className="small" style={{ lineHeight: 1.6 }}>
                These inputs will power the AI workout generator next. Generated plans should be cached by these values.
              </p>
              <Field label="Workouts per week">
                <select className="input" value={state.settings.workoutsPerWeek} onChange={(e) => updateSettings("workoutsPerWeek", Number(e.target.value))}>
                  <option value={3}>3 days</option>
                  <option value={4}>4 days</option>
                </select>
              </Field>
              <Field label="Experience level">
                <select className="input" value={state.settings.experienceLevel} onChange={(e) => updateSettings("experienceLevel", e.target.value as Settings["experienceLevel"])}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </Field>
              <Field label="Session length">
                <select className="input" value={state.settings.sessionLength} onChange={(e) => updateSettings("sessionLength", Number(e.target.value))}>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={75}>75 minutes</option>
                </select>
              </Field>
              <Field label="Equipment access">
                <select className="input" value={state.settings.equipmentAccess} onChange={(e) => updateSettings("equipmentAccess", e.target.value as Settings["equipmentAccess"])}>
                  <option value="full_gym">Full gym</option>
                  <option value="machines">Machines mostly</option>
                  <option value="dumbbells">Dumbbells only</option>
                  <option value="home">Home setup</option>
                </select>
              </Field>
              <Field label="Training emphasis">
                <select className="input" value={state.settings.trainingEmphasis} onChange={(e) => updateSettings("trainingEmphasis", e.target.value as Settings["trainingEmphasis"])}>
                  <option value="aesthetic">Aesthetic</option>
                  <option value="strength">Strength</option>
                  <option value="mobility">Mobility</option>
                  <option value="fat_loss_support">Fat-loss support</option>
                </select>
              </Field>
              <Field label="Injuries / limitations">
                <input className="input" value={state.settings.limitations} onChange={(e) => updateSettings("limitations", e.target.value)} placeholder="e.g. knee pain, shoulder discomfort, none" />
              </Field>
            </div>

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

            <SwipeToDelete
              className="settings-reset-swipe"
              onDelete={() => {
                setState((prev) => ({
                  ...prev,
                  dailyLogs: seedWeekLogs(),
                  workoutLogs: seedWorkoutLogs(),
                  workoutHistory: [],
                  foods: []
                }));
              }}
            >
              <div className="card settings-reset-card">
                <strong>Reset all logs</strong>
                <p className="small">Swipe left on this card to clear check-ins, workouts, workout history and nutrition logs.</p>
              </div>
            </SwipeToDelete>
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

function GameMetricCard({
  title,
  value,
  hint,
  tone
}: {
  title: string;
  value: string;
  hint: string;
  tone: "green" | "amber";
}) {
  return (
    <div className={`game-metric ${tone}`}>
      <div className="game-metric-title">
        <span className="signal-dot" />
        {title}
      </div>
      <div className="game-metric-value">{value}</div>
      <div className="game-metric-pill">{hint}</div>
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

type CoachSignal = {
  type: "good" | "warn";
  text: string;
};

type Achievement = {
  icon: string;
  title: string;
  detail: string;
  unlocked: boolean;
};

function getReadinessScore(input: {
  avgProtein: number | null;
  avgSteps: number | null;
  workoutCompletion: number;
  settings: Settings;
}) {
  const proteinScore = Math.min(((input.avgProtein ?? 0) / Math.max(input.settings.proteinTarget, 1)) * 40, 40);
  const stepScore = Math.min(((input.avgSteps ?? 0) / Math.max(input.settings.stepTarget, 1)) * 35, 35);
  const workoutScore = Math.min((input.workoutCompletion / 100) * 25, 25);

  return Math.round(proteinScore + stepScore + workoutScore);
}

function getReadinessMessage(score: number) {
  if (score >= 85) return "Full recomp mode. Keep the streak alive and avoid unnecessary changes.";
  if (score >= 70) return "Strong momentum. Fix one weak signal and the week is yours.";
  if (score >= 50) return "You are in the game. Tighten steps, protein, or logging today.";
  return "Reset the basics today: protein, steps, and one clean log.";
}

function getBaseSetup(input: {
  settings: Settings;
  avgCalories: number | null;
  avgProtein: number | null;
  avgSteps: number | null;
  foodTotals: { calories: number; protein: number; carbs: number; fats: number };
  workoutCompletion: number;
}) {
  const items: string[] = [];
  const proteinGap = input.settings.proteinTarget - (input.avgProtein ?? input.foodTotals.protein);
  const calorieGap = input.settings.targetCalories - (input.avgCalories ?? input.foodTotals.calories);

  if (proteinGap > 20) {
    items.push(`Add ~${Math.round(proteinGap)}g protein daily. Use a simple anchor like chicken, curd, eggs, paneer, fish, or whey.`);
  } else {
    items.push("Protein is close to target. Keep it spread across 3–4 meals.");
  }

  if (calorieGap < -150) {
    items.push("Calories are above target. Reduce liquid sugar, excess oil, or large rice portions first.");
  } else if (calorieGap > 250) {
    items.push("Calories are low for your target. Add carbs around training or a controlled fat source.");
  } else {
    items.push("Calories are close to target. Hold steady and let weekly weight/waist trends guide changes.");
  }

  if ((input.avgSteps ?? 0) < input.settings.stepTarget - 1500) {
    items.push("Build steps with two 10-minute walks after meals before adding harder cardio.");
  }

  if (input.settings.goal === "recomp") {
    items.push("For recomp, aim for stable scale weight, smaller waist, and stronger workouts.");
  } else if (input.settings.goal === "lose_weight") {
    items.push("For fat loss, keep the deficit moderate so strength does not drop sharply.");
  } else if (input.settings.goal === "be_more_active") {
    items.push("Make walking a daily system before adding intense cardio.");
  } else {
    items.push("For maintenance, keep calories steady and adjust only if weekly average weight drifts.");
  }

  if (input.workoutCompletion < 50) {
    items.push("Training logs are incomplete. Log consistently before making large nutrition changes.");
  }

  return items.slice(0, 5);
}

function getCardioRoutine(input: {
  settings: Settings;
  avgSteps: number | null;
  avgCardio: number | null;
  workoutCompletion: number;
}) {
  const steps = input.avgSteps ?? 0;
  const cardio = input.avgCardio ?? 0;
  const items: string[] = [];

  if (steps < input.settings.stepTarget - 2500) {
    items.push("Start with walking: 2 x 10-minute walks daily, preferably after meals.");
    items.push("Add one 25-minute easy Zone 2 walk on a non-lifting day.");
  } else if (steps < input.settings.stepTarget) {
    items.push("Add one 15-minute walk after lunch or dinner to close the step gap.");
    items.push("Keep cardio conversational, not exhausting.");
  } else {
    items.push("Steps are on track. Maintain 2 easy Zone 2 sessions weekly for conditioning.");
  }

  if (input.settings.goal === "lose_weight") {
    items.push("For fat loss, use 2–3 Zone 2 sessions of 25–35 minutes before cutting calories further.");
  }

  if (input.settings.goal === "be_more_active") {
    items.push("Add one longer weekend walk of 40–60 minutes.");
  }

  if (input.workoutCompletion < 50) {
    items.push("Avoid intense cardio until lifting consistency improves.");
  }

  if (cardio > 30 && input.settings.goal === "recomp") {
    items.push("Keep cardio moderate so it does not interfere with strength progression.");
  }

  return items.slice(0, 5);
}

function getTodaySignals(input: {
  settings: Settings;
  avgCalories: number | null;
  avgProtein: number | null;
  avgSteps: number | null;
  avgCardio: number | null;
  workoutCompletion: number;
  foodTotals: { calories: number; protein: number; carbs: number; fats: number };
}): CoachSignal[] {
  const signals: CoachSignal[] = [];

  if ((input.avgProtein ?? input.foodTotals.protein) >= input.settings.proteinTarget) {
    signals.push({ type: "good", text: "Protein is locked in. This is the core of recomp — protect it." });
  } else {
    signals.push({ type: "warn", text: "Protein is behind target. Add one high-protein meal or snack today." });
  }

  if ((input.avgSteps ?? 0) >= input.settings.stepTarget) {
    signals.push({ type: "good", text: "Step target is on track. NEAT is compounding." });
  } else {
    signals.push({ type: "warn", text: "Steps are behind. Add a short walk after your next meal." });
  }

  const calories = input.avgCalories ?? input.foodTotals.calories;
  if (Math.abs(calories - input.settings.targetCalories) <= 150) {
    signals.push({ type: "good", text: "Calories are close to target. Keep today boring and consistent." });
  } else if (calories < input.settings.targetCalories - 250) {
    signals.push({ type: "warn", text: "Calories are running low. Under-eating blunts recovery and stalls recomp." });
  } else {
    signals.push({ type: "warn", text: "Calories are running high. Trim sugar, oil, or extra portions first." });
  }

  if (input.workoutCompletion >= 70) {
    signals.push({ type: "good", text: "Training consistency is strong. Keep progressive overload the priority." });
  } else {
    signals.push({ type: "warn", text: "Workout logging is incomplete. Log the next session fully." });
  }

  return signals.slice(0, 4);
}

function getWeekStatus(dailyLogs: DailyLog[]) {
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date(todayISO() + "T00:00:00");
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateISO = date.toISOString().slice(0, 10);
    const log = dailyLogs.find((item) => item.date === dateISO) || dailyLogs[index];

    const hasUsefulData =
      !!log &&
      (numberOrNull(log.weight) !== null ||
        numberOrNull(log.steps) !== null ||
        numberOrNull(log.calories) !== null ||
        numberOrNull(log.protein) !== null);

    const isToday = dateISO === todayISO();

    return {
      label: dayLabels[date.getDay()],
      date: dateISO,
      dateNumber: String(date.getDate()).padStart(2, "0"),
      index,
      hasUsefulData,
      isToday,
      status: isToday ? "today" : "neutral"
    };
  });
}

function getCurrentStreak(dailyLogs: DailyLog[]) {
  return dailyLogs.filter(
    (log) =>
      numberOrNull(log.weight) !== null ||
      numberOrNull(log.steps) !== null ||
      numberOrNull(log.calories) !== null ||
      numberOrNull(log.protein) !== null
  ).length;
}

function getWeeklyXp(input: {
  readinessScore: number;
  weekStatus: Array<{ label: string; index: number; status: string }>;
  workoutCompletion: number;
}) {
  const loggedDays = input.weekStatus.filter((day) => day.status === "done").length;
  const xp = Math.min(1000, Math.round(input.readinessScore * 6 + loggedDays * 45 + input.workoutCompletion * 2));
  const level = Math.max(1, Math.floor(xp / 140) + 1);
  const progress = Math.min(100, Math.round((xp / 1000) * 100));
  const remaining = Math.max(0, 1000 - xp);

  const title =
    level >= 7
      ? "Iron Athlete"
      : level >= 5
        ? "Momentum Builder"
        : level >= 3
          ? "Recomp Warrior"
          : "Foundation";

  return { xp, level, progress, remaining, title };
}

function getBadges(input: {
  streakDays: number;
  avgProtein: number | null;
  avgSteps: number | null;
  workoutCompletion: number;
  settings: Settings;
}): Achievement[] {
  return [
    {
      icon: "★",
      title: "7-Day Warrior",
      detail: input.streakDays >= 7 ? "Earned" : `${Math.max(0, 7 - input.streakDays)} days left`,
      unlocked: input.streakDays >= 7
    },
    {
      icon: "✓",
      title: "14-Day Streak",
      detail: input.streakDays >= 14 ? "Earned" : "Log today",
      unlocked: input.streakDays >= 14
    },
    {
      icon: "◍",
      title: "Protein King",
      detail: "Hit protein target",
      unlocked: (input.avgProtein ?? 0) >= input.settings.proteinTarget
    },
    {
      icon: "◎",
      title: "Consistency Pro",
      detail: "70% workout log",
      unlocked: input.workoutCompletion >= 70
    }
  ];
}


function normalizeWorkoutLog(raw: Partial<ExerciseLog>): ExerciseLog {
  const templateMatch =
    workoutTemplate.find((item) => item.exercise === raw.exercise) ||
    workoutTemplate.find((item) => item.day === raw.day) ||
    workoutTemplate[0];

  const existingSets = Array.isArray(raw.workoutSets)
    ? raw.workoutSets.map((set) => ({
        id: set.id || cryptoSafeId(),
        weight: cleanNumber(set.weight),
        reps: cleanNumber(set.reps),
        rpe: cleanNumber(set.rpe)
      }))
    : [];

  const fallbackSets =
    existingSets.length > 0
      ? existingSets
      : createWorkoutSets(numberOrDefault(raw.sets, templateMatch.sets)).map((set, index) =>
          index === 0
            ? {
                ...set,
                weight: cleanNumber(raw.weight),
                reps: cleanNumber(raw.repsDone),
                rpe: cleanNumber(raw.rpe)
              }
            : set
        );

  const topSet = fallbackSets[0] || { weight: "", reps: "", rpe: "" };

  return {
    id: raw.id || cryptoSafeId(),
    day: raw.day || templateMatch.day,
    dayLabel: raw.dayLabel || getDayLabel(raw.day || templateMatch.day),
    pattern: raw.pattern || templateMatch.pattern || "Custom",
    exercise: raw.exercise || templateMatch.exercise,
    alternates: Array.isArray(raw.alternates) && raw.alternates.length ? raw.alternates : templateMatch.alternates || [templateMatch.exercise],
    sets: fallbackSets.length,
    targetReps: raw.targetReps || templateMatch.targetReps,
    workoutSets: fallbackSets,
    weight: cleanNumber(topSet.weight),
    repsDone: cleanNumber(topSet.reps),
    rpe: cleanNumber(topSet.rpe),
    notes: raw.notes || ""
  };
}

function getDayLabel(day: string) {
  const labels: Record<string, string> = {
    push: "Push",
    lower: "Lower",
    pull: "Pull",
    full: "Full Body",
    "Day 1 - Push": "Push",
    "Day 2 - Lower": "Lower",
    "Day 3 - Pull": "Pull",
    "Day 4 - Full Body": "Full Body"
  };

  return labels[day] || day;
}

function getDayDescription(day: string) {
  const descriptions: Record<string, string> = {
    push: "Chest, shoulders, triceps, and pressing strength.",
    lower: "Quads, hamstrings, glutes, calves, and lower-body function.",
    pull: "Back width, back thickness, rear delts, and biceps.",
    full: "Balanced full-body work, carries, and core."
  };

  return descriptions[day] || "Custom training day.";
}

function getWorkoutDayGroups(workoutLogs: ExerciseLog[]) {
  const order = ["push", "lower", "pull", "full"];
  const groups = order
    .map((day) => ({
      day,
      dayLabel: getDayLabel(day),
      exercises: workoutLogs.filter((exercise) => exercise.day === day || exercise.dayLabel === getDayLabel(day))
    }))
    .filter((group) => group.exercises.length > 0);

  const customGroups = workoutLogs
    .filter((exercise) => !order.includes(exercise.day))
    .reduce<Array<{ day: string; dayLabel: string; exercises: ExerciseLog[] }>>((acc, exercise) => {
      const existing = acc.find((group) => group.day === exercise.day);
      if (existing) {
        existing.exercises.push(exercise);
      } else {
        acc.push({
          day: exercise.day,
          dayLabel: getDayLabel(exercise.day),
          exercises: [exercise]
        });
      }
      return acc;
    }, []);

  return [...groups, ...customGroups];
}

function getXpRules(input: {
  avgProtein: number | null;
  avgSteps: number | null;
  avgCalories: number | null;
  workoutCompletion: number;
  settings: Settings;
}) {
  const calories = input.avgCalories;
  const calorieHit = calories !== null && Math.abs(calories - input.settings.targetCalories) <= 150;

  return [
    { label: "Daily check-in logged", points: "+45 XP", earned: true },
    { label: "Protein target hit", points: "+25 XP", earned: (input.avgProtein ?? 0) >= input.settings.proteinTarget },
    { label: "Step target hit", points: "+25 XP", earned: (input.avgSteps ?? 0) >= input.settings.stepTarget },
    { label: "Calories within range", points: "+20 XP", earned: calorieHit },
    { label: "Workout log 70%+ complete", points: "+30 XP", earned: input.workoutCompletion >= 70 }
  ];
}

function formatDisplayDate(dateISO: string) {
  const date = new Date(dateISO + "T00:00:00");
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
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
