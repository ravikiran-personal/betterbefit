"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generateFitnessPlan } from "../lib/fitness-engine";
import { getWeeklyNutritionAdjustment } from "../lib/fitness-engine/intelligence";
import type { GeneratedExercise } from "../lib/fitness-engine";
import type { Settings, Sex, Lifestyle, Goal, DayType, SplitPlan, TodayWorkout, MealSuggestion } from "../lib/fitness-engine/types";
import type { Tab, DailyLog, WorkoutSet, ExerciseLog, FoodItem, MealPreset, FoodSearchResult, WorkoutSession, AppState } from "../lib/app-types";
import { INDIAN_FOODS } from "../lib/indianFoods";
import {
  cryptoSafeId,
  todayISO,
  getLocalDateISO,
  formatDisplayDate,
  cleanNumber,
  numberOrDefault,
  numberOrNull,
  average,
  formatNumber,
  isSex,
  isLifestyle,
  isGoal
} from "../lib/utils";
import {
  getLocalSplitPlan,
  detectMissedWorkout,
  getTodaysWorkoutType,
  getBaseSetup,
  getCardioRoutine,
  getLocalFoodCache,
  getCurrentStreak,
  getDayLabel,
  getNutritionHistoryGroups,
  getRecommendation
} from "../lib/page-helpers";
import { NumericInput } from "../components/numeric-input";
import { SwipeToDelete } from "../components/swipe-to-delete";


const STORAGE_KEY = "recomp-tracker-v2";

const defaultSettings: Settings = {
  weightKg: 70,
  heightCm: 170,
  age: 25,
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
  { id: cryptoSafeId(), date: getLocalDateISO(), meal: "Breakfast", food: "Curd", grams: 150, calories: 92, protein: 5, carbs: 7, fats: 5 },
  { id: cryptoSafeId(), date: getLocalDateISO(), meal: "Coffee 1", food: "Filter coffee + 1 tbsp sugar", grams: 150, calories: 48, protein: 0, carbs: 12, fats: 0 },
  { id: cryptoSafeId(), date: getLocalDateISO(), meal: "Lunch", food: "Raw basmati rice", grams: 60, calories: 216, protein: 4.3, carbs: 47, fats: 0.4 },
  { id: cryptoSafeId(), date: getLocalDateISO(), meal: "Lunch", food: "Chicken breast", grams: 200, calories: 330, protein: 62, carbs: 0, fats: 7 },
  { id: cryptoSafeId(), date: getLocalDateISO(), meal: "Snack", food: "Banana", grams: 120, calories: 105, protein: 1.3, carbs: 27, fats: 0.4 },
  { id: cryptoSafeId(), date: getLocalDateISO(), meal: "Coffee 2", food: "Filter coffee + 1 tbsp sugar", grams: 150, calories: 48, protein: 0, carbs: 12, fats: 0 },
  { id: cryptoSafeId(), date: getLocalDateISO(), meal: "Dinner", food: "Raw basmati rice", grams: 80, calories: 288, protein: 5.8, carbs: 62, fats: 0.5 },
  { id: cryptoSafeId(), date: getLocalDateISO(), meal: "Dinner", food: "Chicken breast", grams: 200, calories: 330, protein: 62, carbs: 0, fats: 7 },
  { id: cryptoSafeId(), date: getLocalDateISO(), meal: "Dinner", food: "Cucumber", grams: 200, calories: 30, protein: 1.3, carbs: 7, fats: 0.2 },
  { id: cryptoSafeId(), date: getLocalDateISO(), meal: "Dinner", food: "Olive oil / cooking fats", grams: 10, calories: 90, protein: 0, carbs: 0, fats: 10 },
  { id: cryptoSafeId(), date: getLocalDateISO(), meal: "Any", food: "Apple", grams: 180, calories: 95, protein: 0.5, carbs: 25, fats: 0.3 },
  { id: cryptoSafeId(), date: getLocalDateISO(), meal: "Coffee 3", food: "Filter coffee no sugar", grams: 150, calories: 5, protein: 0, carbs: 0, fats: 0 },
  { id: cryptoSafeId(), date: getLocalDateISO(), meal: "Coffee 4", food: "Filter coffee no sugar", grams: 150, calories: 5, protein: 0, carbs: 0, fats: 0 }
];

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

function createExerciseLogFromGenerated(item: GeneratedExercise): ExerciseLog {
  return {
    id: cryptoSafeId(),
    ...item,
    workoutSets: createWorkoutSets(item.sets),
    weight: "",
    repsDone: "",
    rpe: "",
    notes: ""
  };
}

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
    nutritionHistory: true,
    presets: false
  });
  const [customExerciseDrafts, setCustomExerciseDrafts] = useState<Record<string, string>>({});
  const [state, setState] = useState<AppState>(initialState);
  const [mealPresetName, setMealPresetName] = useState("");
 const [mealDraft, setMealDraft] = useState<FoodItem>({
  id: "draft",
  date: getLocalDateISO(),
  meal: "Breakfast",
  food: "",
  grams: 100,
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0
});
  const [mealDraftUnit, setMealDraftUnit] = useState<"g" | "ml" | "oz">("g");
  const [mealDraftSuggestions, setMealDraftSuggestions] = useState<FoodSearchResult[]>([]);
  const [isSearchingMealDraft, setIsSearchingMealDraft] = useState(false);
  const [mealDraftBasePer100g, setMealDraftBasePer100g] = useState<{ calories: number; protein: number; carbs: number; fats: number } | null>(null);
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
const [foodSearchGrams, setFoodSearchGrams] = useState<number | "">(100);

const [foodSearchResult, setFoodSearchResult] = useState<{
  source: string;
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  grams: number;
  confidence: "high" | "medium" | "low";
  note: string;
  results?: FoodSearchResult[];
} | null>(null);

const [foodBaseMacros, setFoodBaseMacros] = useState<{
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
} | null>(null);

const foodGramsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null); 
  const [isSearchingFood, setIsSearchingFood] = useState(false);
  const [targetReason, setTargetReason] = useState("");
  const [isCalculatingTargets, setIsCalculatingTargets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mealSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef("");
  const [missedWorkoutState, setMissedWorkoutState] = useState<
    "idle" | "asking" | "log_missed" | "skip_missed" | "show_today"
  >("idle");
  const [missedWorkoutInfo, setMissedWorkoutInfo] = useState<{
    missedDate: string;
    missedDayType: DayType;
  } | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<
    Record<string, Array<{ weight: string; reps: string; done: boolean }>>
  >({});
  const [workoutSaveMessage, setWorkoutSaveMessage] = useState("");
  const [expandedAlternates, setExpandedAlternates] = useState<Record<string, boolean>>({});
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [settingsStep, setSettingsStep] = useState<"profile" | "plan">("profile");
  const [mealSuggestions, setMealSuggestions] = useState<MealSuggestion[]>([]);
  const [suggestionsGenerated, setSuggestionsGenerated] = useState(false);
  const [addedMealSuggestions, setAddedMealSuggestions] = useState<Record<string, boolean>>({});
  const [suggestionDate, setSuggestionDate] = useState(getLocalDateISO());

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
  date: typeof (f as FoodItem).date === "string" ? (f as FoodItem).date : getLocalDateISO(),
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
                date: typeof (f as FoodItem).date === "string" ? (f as FoodItem).date : getLocalDateISO(),
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
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, 500);
    return () => clearTimeout(timer);
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

const displayWeight = selectedDashboardDate ? numberOrNull(selectedDashboardLog?.weight) : avgWeight;
const displaySteps = selectedDashboardDate ? numberOrNull(selectedDashboardLog?.steps) : avgSteps;
const displayCalories = selectedDashboardDate ? numberOrNull(selectedDashboardLog?.calories) : avgCalories;
const displayProtein = selectedDashboardDate ? numberOrNull(selectedDashboardLog?.protein) : avgProtein;
const displayCardio = selectedDashboardDate ? numberOrNull(selectedDashboardLog?.cardioMinutes) : avgCardio;
const displayWaist = selectedDashboardDate ? numberOrNull(selectedDashboardLog?.waist) : avgWaist;

const dashboardScopeLabel = selectedDashboardDate
  ? formatDisplayDate(selectedDashboardDate)
  : "Weekly average";
  const selectedNutritionDate = selectedDashboardDate || getLocalDateISO();

const foodsForSelectedDate = state.foods.filter((food) => {
  return (food.date || getLocalDateISO()) === selectedNutritionDate;
});

 const foodTotals = useMemo(() => {
  return foodsForSelectedDate.reduce(
      (acc, item) => {
        acc.calories += item.calories;
        acc.protein += item.protein;
        acc.carbs += item.carbs;
        acc.fats += item.fats;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
}, [foodsForSelectedDate]);

  const todayStr = getLocalDateISO();
  const todayFoodCalories = useMemo(() =>
    state.foods.filter(f => (f.date || todayStr) === todayStr)
      .reduce((acc, f) => acc + f.calories, 0),
    [state.foods, todayStr]);
  const todayFoodProtein = useMemo(() =>
    state.foods.filter(f => (f.date || todayStr) === todayStr)
      .reduce((acc, f) => acc + f.protein, 0),
    [state.foods, todayStr]);

  const nutritionHistory = useMemo(() => {
    return getNutritionHistoryGroups(state.foods);
  }, [state.foods]);

  const nutritionDaysForAdjustment = useMemo(() => {
    return nutritionHistory.map((group) => ({
      date: group.date,
      calories: group.totals.calories,
      protein: group.totals.protein
    }));
  }, [nutritionHistory]);
  
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

  const streakDays = getCurrentStreak(state.dailyLogs);

  const generatedPlan = useMemo(() => generateFitnessPlan(state.settings), [state.settings]);
  const splitPlan = useMemo(() => getLocalSplitPlan(state.settings), [state.settings]);
  const todayWorkout = useMemo(
    () =>
      getTodaysWorkoutType({
        splitPlan,
        workoutHistory: state.workoutHistory,
        todayDate: getLocalDateISO()
      }),
    [splitPlan, state.workoutHistory]
  );
  const fullPlan = generatedPlan.workout;
  const todaysExercises = useMemo(
    () => fullPlan.exercises.filter((exercise) => exercise.day === todayWorkout.dayType),
    [fullPlan.exercises, todayWorkout.dayType]
  );
  const loggedExerciseCount = todaysExercises.filter((exercise) => {
    const logs = exerciseLogs[exercise.exercise] || [];
    return logs.some((set) => set.done);
  }).length;
  const hasAnyLoggedSet = Object.values(exerciseLogs).some((sets) => sets.some((set) => set.done));

  const currentStreak = streakDays;

  const todayDailyLog = state.dailyLogs.find(d => d.date === todayStr);
  const effectiveCalories = numberOrNull(todayDailyLog?.calories) ?? (todayFoodCalories > 0 ? todayFoodCalories : null);
  const effectiveProtein = numberOrNull(todayDailyLog?.protein) ?? (todayFoodProtein > 0 ? todayFoodProtein : null);

  const dailyTasks = [
    {
      id: "workout",
      done: todayWorkout.isRestDay || workoutCompletion >= 80,
      label: todayWorkout.isRestDay ? "Rest Day ✓" : `${todayWorkout.dayType} workout`,
      tab: "workouts" as const
    },
    {
      id: "protein",
      done: (effectiveProtein ?? 0) >= state.settings.proteinTarget * 0.9,
      label: `Protein: ${effectiveProtein ?? 0}g / ${state.settings.proteinTarget}g`,
      tab: "nutrition" as const
    },
    {
      id: "calories",
      done: Math.abs((effectiveCalories ?? 0) - state.settings.targetCalories) < 150,
      label: `Calories: ${effectiveCalories ?? 0} / ${state.settings.targetCalories}`,
      tab: "nutrition" as const
    },
    {
      id: "steps",
      done: (displaySteps ?? 0) >= state.settings.stepTarget * 0.9,
      label: `Steps: ${(displaySteps ?? 0).toLocaleString()} / ${state.settings.stepTarget.toLocaleString()}`,
      tab: "checkin" as const
    }
  ];

  const completedTasks = dailyTasks.filter((task) => task.done).length;
  const dayScore = Math.round((completedTasks / dailyTasks.length) * 100);

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning 👋"
      : currentHour < 17
      ? "Good afternoon 👋"
      : "Good evening 👋";

  const todayDisplayDate = new Date(getLocalDateISO() + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short"
  });

  const dayScoreColor = dayScore >= 75 ? "#059669" : dayScore >= 50 ? "#D97706" : "#ef4444";
  const dayScoreCircumference = 339;
  const dayScoreOffset = dayScoreCircumference - (dayScore / 100) * dayScoreCircumference;

  useEffect(() => {
    setExerciseLogs((prev) => {
      const nextLogs: Record<string, Array<{ weight: string; reps: string; done: boolean }>> = {};

      todaysExercises.forEach((exercise) => {
        nextLogs[exercise.exercise] =
          prev[exercise.exercise] ||
          Array.from({ length: exercise.sets }).map(() => ({
            weight: "",
            reps: "",
            done: false
          }));
      });

      return nextLogs;
    });
  }, [todaysExercises]);

  useEffect(() => {
    if (missedWorkoutState !== "idle") return;
    if (todayWorkout.isRestDay) return;

    const missed = detectMissedWorkout(state.workoutHistory, splitPlan);

    if (!missed) return;

    setMissedWorkoutInfo({
      missedDate: missed.missedDate,
      missedDayType: missed.missedDayType
    });
    setMissedWorkoutState("asking");
  }, [state.workoutHistory, splitPlan, missedWorkoutState, todayWorkout.isRestDay]);

  useEffect(() => {
    const today = getLocalDateISO();

    if (suggestionDate !== today) {
      setSuggestionDate(today);
      setSuggestionsGenerated(false);
      setMealSuggestions([]);
      setAddedMealSuggestions({});
      return;
    }

    if (tab !== "nutrition") return;
    if (suggestionsGenerated) return;

    setMealSuggestions(generateMealSuggestions());
    setSuggestionsGenerated(true);
  }, [
    tab,
    suggestionDate,
    suggestionsGenerated,
    state.settings.targetCalories,
    state.settings.proteinTarget,
    displayCalories,
    displayProtein
  ]);

  const weeklyNutritionAdjustment = useMemo(() => {
    return getWeeklyNutritionAdjustment({
      settings: state.settings,
      dailyLogs: state.dailyLogs,
      nutritionDays: nutritionDaysForAdjustment,
      workoutCompletion
    });
  }, [state.settings, state.dailyLogs, nutritionDaysForAdjustment, workoutCompletion]);

  function applyWeeklyNutritionAdjustment() {
    if (weeklyNutritionAdjustment.calorieDelta === 0) {
      setTargetReason(weeklyNutritionAdjustment.summary);
      return;
    }

    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        targetCalories: Math.max(1200, prev.settings.targetCalories + weeklyNutritionAdjustment.calorieDelta)
      }
    }));

    const sign = weeklyNutritionAdjustment.calorieDelta > 0 ? "+" : "";
    setTargetReason(`Weekly adjustment applied: ${sign}${weeklyNutritionAdjustment.calorieDelta} kcal. ${weeklyNutritionAdjustment.summary}`);
  }

  function applyGeneratedNutritionPlan() {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        targetCalories: generatedPlan.nutrition.calories,
        proteinTarget: generatedPlan.nutrition.protein,
        carbTarget: generatedPlan.nutrition.carbs,
        fatTarget: generatedPlan.nutrition.fats
      }
    }));

    setTargetReason("Research-backed nutrition targets applied from your current settings.");
  }

  function applyGeneratedWorkoutPlan() {
    setState((prev) => ({
      ...prev,
      workoutLogs: generatedPlan.workout.exercises.map((exercise) => createExerciseLogFromGenerated(exercise))
    }));
  }

  function applyGeneratedFullPlan() {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        targetCalories: generatedPlan.nutrition.calories,
        proteinTarget: generatedPlan.nutrition.protein,
        carbTarget: generatedPlan.nutrition.carbs,
        fatTarget: generatedPlan.nutrition.fats
      },
      workoutLogs: generatedPlan.workout.exercises.map((exercise) => createExerciseLogFromGenerated(exercise))
    }));

    setTargetReason("Research-backed nutrition and workout plan applied from your current settings.");
  }

  async function calculateTargetsWithAI() {
setIsCalculatingTargets(true);
setTargetReason("");

const payload = {
weightKg: state.settings.weightKg,
heightCm: state.settings.heightCm,
age: state.settings.age,
sex: state.settings.sex,
lifestyle: state.settings.lifestyle,
goal: state.settings.goal
};

const cacheKey = "targets_" + JSON.stringify(payload);
const TTL = 24 * 60 * 60 * 1000;

try {
// Try localStorage first
try {
const cachedRaw = localStorage.getItem(cacheKey);
if (cachedRaw) {
const cached = JSON.parse(cachedRaw);
if (cached?.timestamp && Date.now() - cached.timestamp < TTL) {
const result = cached.data;

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

      setTargetReason(String(result.reason || "Targets loaded from cache."));
      return;
    }
  }
} catch {
  // ignore localStorage errors
}

// Fallback to API
const response = await fetch("/api/calculate-targets", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload)
});

if (!response.ok) throw new Error("Target calculation failed.");

const result = await response.json();

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

// Save to localStorage
try {
  localStorage.setItem(
    cacheKey,
    JSON.stringify({
      timestamp: Date.now(),
      data: result
    })
  );
} catch {
  // ignore localStorage errors
}

} catch {
alert("Could not calculate targets.");
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
  date: getLocalDateISO(),
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

  function deleteFoodsByDate(date: string) {
    setState((prev) => ({
      ...prev,
      foods: prev.foods.filter((food) => (food.date || getLocalDateISO()) !== date)
    }));
  }

  function submitTodayNutrition() {
    const tStr = getLocalDateISO();
    const totals = state.foods
      .filter(f => (f.date || tStr) === tStr)
      .reduce((acc, f) => {
        acc.calories += f.calories;
        acc.protein += f.protein;
        acc.carbs += f.carbs;
        acc.fats += f.fats;
        return acc;
      }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

    setState(prev => {
      const existing = prev.dailyLogs.find(d => d.date === tStr);
      if (existing) {
        return {
          ...prev,
          dailyLogs: prev.dailyLogs.map(d => d.date === tStr
            ? { ...d, calories: totals.calories, protein: totals.protein }
            : d
          )
        };
      }
      return {
        ...prev,
        dailyLogs: [
          ...prev.dailyLogs,
          {
            date: tStr,
            weight: "",
            steps: "",
            calories: totals.calories,
            protein: totals.protein,
            cardioMinutes: "",
            waist: ""
          }
        ]
      };
    });
  }

  function applyFoodResultToMealDraft(result: FoodSearchResult) {
    setMealDraft((prev) => ({
      ...prev,
      food: result.food,
      grams: result.grams,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fats: result.fats
    }));
    const g = result.grams || 100;
    setMealDraftBasePer100g({
      calories: (result.calories / g) * 100,
      protein: (result.protein / g) * 100,
      carbs: (result.carbs / g) * 100,
      fats: (result.fats / g) * 100
    });
    setMealDraftUnit("g");
    setMealDraftSuggestions([]);
  }

  async function searchMealDraftSuggestions(queryValue: string, gramsValue: number) {
    setMealDraft((prev) => ({
      ...prev,
      food: queryValue
    }));

    if (mealSearchTimeoutRef.current) {
      clearTimeout(mealSearchTimeoutRef.current);
    }

    const query = queryValue.trim();
    latestQueryRef.current = query;

    if (query.length < 3) {
      setMealDraftSuggestions([]);
      setIsSearchingMealDraft(false);
      setMealDraftBasePer100g(null);
      return;
    }

    mealSearchTimeoutRef.current = setTimeout(async () => {
      const grams = gramsValue || 100;
      setIsSearchingMealDraft(true);

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

        if (!response.ok) throw new Error("Food search failed.");

        const result = (await response.json()) as FoodSearchResult;

        if (latestQueryRef.current !== query) return;

        const apiSuggestions = result.results?.length
          ? result.results
          : result.food
          ? [result]
          : [];

        const suggestions = apiSuggestions
          .filter((item) => item.confidence !== "low")
          .slice(0, 8);

        setMealDraftSuggestions(suggestions);
      } catch {
        if (latestQueryRef.current !== query) return;
        setMealDraftSuggestions([]);
      } finally {
        if (latestQueryRef.current === query) {
          setIsSearchingMealDraft(false);
        }
      }
    }, 450);
  }

  async function searchFood(queryValue: string) {
  const query = queryValue.trim().toLowerCase();

  if (!query) {
    setFoodSearchResult(null);
    setFoodBaseMacros(null);
    return;
  }

  setIsSearchingFood(true);

  try {
    const indianMatch = Object.entries(INDIAN_FOODS).find(([key]) => {
      const normalizedKey = key.toLowerCase().trim();
      return normalizedKey.includes(query) || query.includes(normalizedKey);
    });

    const grams = foodSearchGrams === "" ? 100 : foodSearchGrams;

    if (indianMatch) {
      const [foodName, base] = indianMatch;
      const multiplier = grams / 100;

      setFoodBaseMacros({
        calories: base.calories,
        protein: base.protein,
        carbs: base.carbs,
        fats: base.fats
      });

      setFoodSearchResult({
        source: "local",
        food: foodName,
        grams,
        calories: Math.round(base.calories * multiplier),
        protein: Math.round(base.protein * multiplier * 10) / 10,
        carbs: Math.round(base.carbs * multiplier * 10) / 10,
        fats: Math.round(base.fats * multiplier * 10) / 10,
        confidence: "high",
        note: "Matched from Indian food database."
      });

      return;
    }

    const response = await fetch(`/api/food-search?q=${encodeURIComponent(queryValue)}`);
    if (!response.ok) throw new Error("Food search failed.");

    const data = await response.json();

    setFoodBaseMacros({
      calories: Number(data.calories) || 0,
      protein: Number(data.protein) || 0,
      carbs: Number(data.carbs) || 0,
      fats: Number(data.fats) || 0
    });

    setFoodSearchResult({
      source: data.source || "api",
      food: data.food || queryValue,
      grams: Number(data.grams) || grams,
      calories: Number(data.calories) || 0,
      protein: Number(data.protein) || 0,
      carbs: Number(data.carbs) || 0,
      fats: Number(data.fats) || 0,
      confidence: data.confidence || "medium",
      note: data.note || "Matched from external food database.",
      results: data.results
    });
  } catch {
    setFoodSearchResult(null);
    setFoodBaseMacros(null);
  } finally {
    setIsSearchingFood(false);
  }
}

  function recalculateMacros(gramsValue: number) {
  setFoodSearchGrams(gramsValue);

  if (!foodSearchResult || !foodBaseMacros) return;

  const grams = Number.isFinite(gramsValue) && gramsValue > 0 ? gramsValue : 100;
  const multiplier = grams / 100;

  setFoodSearchResult({
    ...foodSearchResult,
    grams,
    calories: Math.round(foodBaseMacros.calories * multiplier),
    protein: Math.round(foodBaseMacros.protein * multiplier * 10) / 10,
    carbs: Math.round(foodBaseMacros.carbs * multiplier * 10) / 10,
    fats: Math.round(foodBaseMacros.fats * multiplier * 10) / 10
  });
}

  function addFoodSearchResult() {
    if (!foodSearchResult) return;

    setState((prev) => ({
      ...prev,
      foods: [
        ...prev.foods,
        {
          id: cryptoSafeId(),
            date: getLocalDateISO(),
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

async function addMealDraft() {
  const draftToSave = {
    ...mealDraft,
    food: mealDraft.food.trim()
  };

  if (!draftToSave.food) {
    alert("Enter the food or meal name first.");
    return;
  }

  setState((prev) => ({
    ...prev,
    foods: [
      ...prev.foods,
      {
        ...draftToSave,
        id: cryptoSafeId(),
        date: getLocalDateISO()
      }
    ]
  }));

  try {
    const key = draftToSave.food.toLowerCase().trim();
    const existingCache = getLocalFoodCache();

    existingCache[key] = {
      food: draftToSave.food,
      calories: draftToSave.calories,
      protein: draftToSave.protein,
      carbs: draftToSave.carbs,
      fats: draftToSave.fats,
      grams: draftToSave.grams
    };

    localStorage.setItem("food-cache", JSON.stringify(existingCache));
  } catch {
    // silently ignore
  }

  setMealDraft({
    id: "draft",
    date: getLocalDateISO(),
    meal: draftToSave.meal,
    food: "",
    grams: 100,
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0
  });

  setMealDraftUnit("g");
  setMealDraftSuggestions([]);
  setFoodSearchQuery("");
  setFoodSearchResult(null);
  setFoodSearchGrams(100);
}

  function scaleIndianFood(food: string, grams: number, meal: MealSuggestion["meal"]): MealSuggestion {
    const base = INDIAN_FOODS[food];
    const multiplier = grams / 100;

    return {
      meal,
      food,
      grams,
      calories: Math.round(base.calories * multiplier),
      protein: Math.round(base.protein * multiplier * 10) / 10,
      carbs: Math.round(base.carbs * multiplier * 10) / 10,
      fats: Math.round(base.fats * multiplier * 10) / 10
    };
  }

  function combineIndianFoods(
    meal: MealSuggestion["meal"],
    foods: Array<{ food: string; grams: number }>
  ): MealSuggestion {
    const totals = foods.reduce(
      (acc, item) => {
        const base = INDIAN_FOODS[item.food];
        if (!base) return acc;

        const multiplier = item.grams / 100;
        acc.calories += base.calories * multiplier;
        acc.protein += base.protein * multiplier;
        acc.carbs += base.carbs * multiplier;
        acc.fats += base.fats * multiplier;
        acc.grams += item.grams;

        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0, grams: 0 }
    );

    return {
      meal,
      food: foods.map((item) => `${item.grams}g ${item.food}`).join(" + "),
      grams: totals.grams,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fats: Math.round(totals.fats * 10) / 10
    };
  }

  function generateMealSuggestions(): MealSuggestion[] {
    const remainingCalories = Math.max(
      0,
      state.settings.targetCalories - (displayCalories ?? 0)
    );

    const remainingProtein = Math.max(
      0,
      state.settings.proteinTarget - (displayProtein ?? 0)
    );

    const breakfastOptions = [
      "egg bhurji",
      "besan chilla",
      "omelette",
      "idli",
      "poha",
      "upma"
    ];

    const breakfastFood =
      breakfastOptions.find((food) => {
        const item = INDIAN_FOODS[food];
        if (!item) return false;

        const caloriesFor200g = item.calories * 2;
        const proteinFor200g = item.protein * 2;

        return caloriesFor200g >= 200 && caloriesFor200g <= 450 && proteinFor200g > 8;
      }) || "besan chilla";

    const lunchCalories = remainingCalories > 0 ? remainingCalories * 0.35 : 600;
    const dinnerCalories = remainingCalories > 0 ? remainingCalories * 0.3 : 500;

    const lunch =
      remainingProtein > 40
        ? combineIndianFoods("Lunch", [
            { food: "boiled basmati rice", grams: lunchCalories > 700 ? 250 : 200 },
            { food: "chicken curry", grams: 200 },
            { food: "curd", grams: 100 }
          ])
        : combineIndianFoods("Lunch", [
            { food: "roti", grams: 100 },
            { food: "dal tadka", grams: 200 },
            { food: "mixed veg curry", grams: 150 }
          ]);

    const dinner =
      remainingCalories < 600
        ? combineIndianFoods("Dinner", [
            { food: "roti", grams: 80 },
            { food: "moong dal", grams: 200 },
            { food: "curd", grams: 100 }
          ])
        : dinnerCalories > 650
        ? combineIndianFoods("Dinner", [
            { food: "boiled basmati rice", grams: 200 },
            { food: "paneer tikka masala", grams: 150 },
            { food: "mixed veg curry", grams: 100 }
          ])
        : combineIndianFoods("Dinner", [
            { food: "roti", grams: 80 },
            { food: "chicken curry", grams: 180 },
            { food: "cabbage sabzi", grams: 150 }
          ]);

    return [scaleIndianFood(breakfastFood, 200, "Breakfast"), lunch, dinner];
  }

  function addMealSuggestionToLog(suggestion: MealSuggestion) {
    setState((prev) => ({
      ...prev,
      foods: [
        ...prev.foods,
        {
          id: cryptoSafeId(),
          date: getLocalDateISO(),
          meal: suggestion.meal,
          food: suggestion.food,
          grams: suggestion.grams,
          calories: suggestion.calories,
          protein: suggestion.protein,
          carbs: suggestion.carbs,
          fats: suggestion.fats
        }
      ]
    }));

    setAddedMealSuggestions((prev) => ({
      ...prev,
      [`${suggestion.meal}-${suggestion.food}`]: true
    }));
  }

  function saveCurrentMealsAsPreset() {
    const name = mealPresetName.trim();

    if (!name) {
      alert("Name the preset first, for example: Normal training day.");
      return;
    }

    if (foodsForSelectedDate.length === 0) {
      alert("Add at least one food item before saving a preset.");
      return;
    }

    const preset: MealPreset = {
      id: cryptoSafeId(),
      name,
      createdAt: todayISO(),
      foods: foodsForSelectedDate.map((food) => ({
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
      foods: [
        ...prev.foods,
        ...preset.foods.map((food) => ({
          ...food,
          id: cryptoSafeId(),
          date: getLocalDateISO()
        }))
      ]
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

  function saveWorkout() {
    const loggedExercises = todaysExercises.reduce<ExerciseLog[]>((acc, exercise) => {
      const loggedSets: WorkoutSet[] = (exerciseLogs[exercise.exercise] || [])
        .filter((set) => set.done)
        .map((set) => ({
          id: cryptoSafeId(),
          weight: numberOrDefault(Number(set.weight), 0),
          reps: numberOrDefault(Number(set.reps), 0),
          rpe: ""
        }));

      if (loggedSets.length === 0) return acc;

      const firstSet = loggedSets[0];

      acc.push({
        id: cryptoSafeId(),
        day: exercise.day,
        dayLabel: exercise.dayLabel,
        pattern: exercise.pattern,
        exercise: exercise.exercise,
        alternates: exercise.alternates,
        sets: loggedSets.length,
        targetReps: exercise.targetReps,
        workoutSets: loggedSets,
        weight: firstSet.weight,
        repsDone: firstSet.reps,
        rpe: "",
        notes: ""
      });

      return acc;
    }, []);

    if (loggedExercises.length === 0) return;

    const totalVolume = calculateSessionVolume(loggedExercises);

    setState((prev) => ({
      ...prev,
      workoutHistory: [
        {
          id: cryptoSafeId(),
          date: getLocalDateISO(),
          dayType: todayWorkout.dayType,
          completion: "completed",
          totalVolume,
          exercises: loggedExercises
        },
        ...prev.workoutHistory
      ]
    }));

    setWorkoutSaveMessage("Session saved. 🔥");

    setExerciseLogs(
      Object.fromEntries(
        todaysExercises.map((exercise) => [
          exercise.exercise,
          Array.from({ length: exercise.sets }).map(() => ({
            weight: "",
            reps: "",
            done: false
          }))
        ])
      )
    );
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
        const parsed = JSON.parse(String(reader.result)) as Partial<AppState>;

        const isObject =
          parsed !== null &&
          typeof parsed === "object" &&
          !Array.isArray(parsed);

        const hasValidSettings =
          isObject &&
          parsed.settings !== undefined &&
          parsed.settings !== null &&
          typeof parsed.settings === "object" &&
          typeof (parsed.settings as Partial<Settings>).weightKg === "number" &&
          typeof (parsed.settings as Partial<Settings>).heightCm === "number" &&
          typeof (parsed.settings as Partial<Settings>).targetCalories === "number";

        const hasValidArrays =
          isObject &&
          Array.isArray(parsed.dailyLogs) &&
          Array.isArray(parsed.workoutLogs) &&
          Array.isArray(parsed.foods);

        if (!isObject || !hasValidSettings || !hasValidArrays) {
          alert("This backup file appears corrupted or from an incompatible version. No changes were made.");
          return;
        }

        setState({
          ...initialState,
          ...parsed,
          settings: {
            ...initialState.settings,
            ...parsed.settings
          },
          dailyLogs: parsed.dailyLogs ?? initialState.dailyLogs,
          workoutLogs: parsed.workoutLogs ?? initialState.workoutLogs,
          workoutHistory: Array.isArray(parsed.workoutHistory)
            ? parsed.workoutHistory
            : initialState.workoutHistory,
          foods: parsed.foods ?? initialState.foods,
          mealPresets: Array.isArray(parsed.mealPresets)
            ? parsed.mealPresets
            : initialState.mealPresets
        });
      } catch {
        alert("This backup file appears corrupted or from an incompatible version. No changes were made.");
      }
    };

    reader.readAsText(file);
  }

  
  function getDailyTrend(index: number, key: keyof Pick<DailyLog, "weight" | "steps" | "calories" | "protein">) {
    const current = numberOrNull(state.dailyLogs[index]?.[key]);
    const previous = numberOrNull(state.dailyLogs[index - 1]?.[key]);

    if (current === null || previous === null) return "neutral";
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "flat";
  }

  function getTrendArrow(trend: string) {
    if (trend === "up") return "↑";
    if (trend === "down") return "↓";
    if (trend === "flat") return "→";
    return "";
  }

  function getTrendTone(metric: "weight" | "steps" | "calories" | "protein", trend: string) {
    if (trend === "neutral" || trend === "flat") return trend;
    if (metric === "steps" || metric === "protein") return trend === "up" ? "good" : "warn";
    if (metric === "calories") return trend === "up" ? "warn" : "good";
    return trend;
  }

  function getConsistencyMessage(streak: number, done: number, total: number): { text: string; color: string } {
    if (done === total) {
      return { text: "You crushed it today — rest up and show up again tomorrow.", color: "#059669" };
    }
    if (streak === 0) {
      return { text: "Small misses don't define you. Get back on track — consistency over time is what counts.", color: "#D97706" };
    }
    if (done >= Math.ceil(total * 0.75)) {
      return { text: "Almost there! Close out your remaining tasks and end the day strong.", color: "#059669" };
    }
    if (done >= Math.ceil(total * 0.5)) {
      return { text: "Good progress. Every step forward compounds — keep pushing today.", color: "#D97706" };
    }
    return { text: "Your goals are waiting. Small actions today build the version of you you're aiming for.", color: "#6B7280" };
  }

  const consistencyMsg = getConsistencyMessage(currentStreak, completedTasks, dailyTasks.length);

  return (
    <main className="container game-shell">
      <div className="game-header">
        <p className="brand-title">BetterBeFit</p>
      </div>

      <div className="bottom-nav">
  <button
    className={`bottom-tab ${tab === "dashboard" ? "active" : ""}`}
    onClick={() => setTab("dashboard")}
  >
    <span className="icon">◎</span>
    <span className="label">Dashboard</span>
  </button>

  <button
    className={`bottom-tab ${tab === "workouts" ? "active" : ""}`}
    onClick={() => setTab("workouts")}
  >
    <span className="icon">↑</span>
    <span className="label">Workouts</span>
  </button>

  <button
    className={`bottom-tab ${tab === "nutrition" ? "active" : ""}`}
    onClick={() => setTab("nutrition")}
  >
    <span className="icon">●</span>
    <span className="label">Nutrition</span>
  </button>

  <button
    className={`bottom-tab ${tab === "checkin" ? "active" : ""}`}
    onClick={() => setTab("checkin")}
  >
    <span className="icon">✓</span>
    <span className="label">Check-In</span>
  </button>

  <button
    className={`bottom-tab ${tab === "settings" ? "active" : ""}`}
    onClick={() => setTab("settings")}
  >
    <span className="icon">⚙</span>
    <span className="label">Settings</span>
  </button>
</div>

      {tab === "dashboard" && (
        <div className="today-dashboard">
          <section className="today-header">
            <div>
              <h1>{greeting}</h1>
              <p>{todayDisplayDate}</p>
            </div>

            <div className="today-streak-pill" style={{ color: currentStreak > 0 ? "#059669" : "#9CA3AF" }}>
              {currentStreak > 0 ? `${currentStreak} day streak` : "Start your streak"}
            </div>
          </section>

          <section className="day-score-card">
            <div className="day-score-ring">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="10"
                />
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
                className={`today-task-card ${task.done ? "done" : ""}`}
                onClick={() => setTab(task.tab)}
              >
                <span className="today-task-check">{task.done ? "✓" : ""}</span>
                <span className="today-task-label">{task.label}</span>
                <span className="today-task-arrow">›</span>
              </button>
            ))}
          </section>

          <section className="consistency-card" style={{ borderLeftColor: consistencyMsg.color }}>
            <p className="consistency-text" style={{ color: consistencyMsg.color }}>{consistencyMsg.text}</p>
          </section>

          <section
            className="priority-card"
            style={{
              borderLeftColor:
                (effectiveProtein ?? 0) < state.settings.proteinTarget - 20 ||
                (displaySteps ?? 0) < state.settings.stepTarget - 2000 ||
                workoutCompletion < 50 ||
                (effectiveCalories !== null && effectiveCalories > state.settings.targetCalories + 150)
                  ? "#D97706"
                  : "#059669"
            }}
          >
            {(() => {
              const proteinGap = Math.round(state.settings.proteinTarget - (effectiveProtein ?? 0));
              const stepGap = Math.round(state.settings.stepTarget - (displaySteps ?? 0)).toLocaleString();

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

              if (state.settings.stepTarget - (displaySteps ?? 0) > 2000) {
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

              if (effectiveCalories !== null && effectiveCalories > state.settings.targetCalories + 150) {
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

            <div className="priority-footer">Tap check-in to log today&apos;s data</div>
          </section>
        </div>
      )}

      {tab === "workouts" && (
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
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                padding: 24,
                textAlign: "center"
              }}
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
                    .toLocaleDateString("en-IN", {
                      weekday: "long",
                      day: "2-digit",
                      month: "short"
                    })
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
                const sets = exerciseLogs[exercise.exercise] || [];
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

                    <h3
                      style={{
                        marginTop: 6,
                        marginBottom: 8,
                        color: "#111827",
                        fontSize: 16,
                        fontWeight: 600
                      }}
                    >
                      {exercise.exercise}
                    </h3>

                    <div style={{ color: "#059669", fontWeight: 700, fontSize: 13 }}>
                      Target: {exercise.sets} sets × {exercise.targetReps} reps
                    </div>

                    <button
                      type="button"
                      className="btn secondary"
                      style={{ marginTop: 8, padding: '4px 10px', fontSize: 12, minHeight: 'auto', width: 'auto' }}
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
                        {exercise.alternates.map((alternate) => (
                          <button
                            key={alternate}
                            type="button"
                            onClick={() => {
                              setState(prev => ({
                                ...prev,
                                workoutLogs: prev.workoutLogs.map(log =>
                                  log.exercise === exercise.exercise
                                    ? { ...log, exercise: alternate }
                                    : log
                                )
                              }));
                              setExerciseLogs(prev => {
                                const old = prev[exercise.exercise] || [];
                                const next = { ...prev };
                                delete next[exercise.exercise];
                                next[alternate] = old;
                                return next;
                              });
                              setExpandedAlternates(prev => ({ ...prev, [exercise.exercise]: false }));
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
                          key={`${exercise.exercise}-${setIndex}`}
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
                                [exercise.exercise]: (prev[exercise.exercise] || []).map((row, index) =>
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
                                [exercise.exercise]: (prev[exercise.exercise] || []).map((row, index) =>
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
                                [exercise.exercise]: (prev[exercise.exercise] || []).map((row, index) =>
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
            {state.workoutHistory.length === 0 ? (
              <p className="small">No workouts logged yet. Complete today&apos;s workout to save your first session.</p>
            ) : (
              <div className="history-card-list">
                {state.workoutHistory.map((session) => {
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
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="btn secondary"
                              style={{ padding: "4px 10px", fontSize: 12, minHeight: "auto" }}
                              onClick={() => setExpandedHistoryId(isExpanded ? null : session.id)}
                            >
                              {isExpanded ? "Hide" : "View"}
                            </button>
                            {!todayWorkout.isRestDay && session.exercises.length > 0 ? (
                              <button
                                className="btn secondary"
                                style={{ padding: "4px 10px", fontSize: 12, minHeight: "auto" }}
                                onClick={() => loadWorkoutSession(session)}
                              >
                                Load
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {isExpanded ? (
                          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                            {session.exercises.map((ex) => {
                              const doneSets = ex.sets.filter((s) => s.done);
                              if (doneSets.length === 0) return null;
                              return (
                                <div key={ex.exercise} style={{ background: "#F9FAFB", borderRadius: 10, padding: "10px 12px" }}>
                                  <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 6 }}>{ex.exercise}</div>
                                  <div style={{ display: "grid", gap: 4 }}>
                                    {doneSets.map((s, i) => (
                                      <div key={i} className="small" style={{ color: "#6B7280" }}>
                                        Set {i + 1}: {s.weight ? `${s.weight} kg` : "—"} × {s.reps ? `${s.reps} reps` : "—"}
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
      )}

      {tab === "nutrition" && (
        <div className="nutrition-page compact-page">
          {/* Macro summary pills */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 4 }}>
            {([
              { label: "Calories", value: Math.round(foodTotals.calories), target: state.settings.targetCalories, unit: "kcal" },
              { label: "Protein", value: Math.round(foodTotals.protein), target: state.settings.proteinTarget, unit: "g" },
              { label: "Carbs", value: Math.round(foodTotals.carbs), target: state.settings.carbTarget, unit: "g" },
              { label: "Fat", value: Math.round(foodTotals.fats), target: state.settings.fatTarget, unit: "g" }
            ] as const).map(({ label, value, target, unit }) => {
              const pct = Math.min(100, target > 0 ? Math.round((value / target) * 100) : 0);
              const over = value > target && target > 0;
              return (
                <div key={label} style={{ background: "#FFFFFF", borderRadius: 12, padding: "10px 10px 8px", border: `1px solid ${over ? "#FDE68A" : "#E5E7EB"}`, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: over ? "#D97706" : "#111827", margin: "3px 0 1px" }}>{value}</div>
                  <div style={{ fontSize: 10, color: "#9CA3AF" }}>/ {target} {unit}</div>
                  <div style={{ height: 3, background: "#E5E7EB", borderRadius: 999, marginTop: 6 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: over ? "#D97706" : "#059669", borderRadius: 999, transition: "width 300ms ease" }} />
                  </div>
                </div>
              );
            })}
          </section>

          {/* Submit Food Log */}
          {todayFoodCalories > 0 && selectedNutritionDate === getLocalDateISO() ? (
            <button
              className="btn"
              style={{ width: "100%", background: "#059669", color: "#FFFFFF", fontWeight: 700, borderRadius: 12, padding: "12px 16px", marginBottom: 4 }}
              onClick={submitTodayNutrition}
            >
              Submit Food Log
            </button>
          ) : null}

          <MealSuggestionsSection
            mealSuggestions={mealSuggestions}
            addedMealSuggestions={addedMealSuggestions}
            onAddSuggestion={addMealSuggestionToLog}
          />

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
                    <div className="food-autofill">
                      <input
                        className="input"
                        value={mealDraft.food}
                        placeholder="Type food, e.g. boiled basmati rice"
                        onChange={(e) => searchMealDraftSuggestions(e.target.value, mealDraft.grams)}
                        onFocus={() => {
                          if (mealDraftSuggestions.length === 0 && mealDraft.food.trim().length >= 3) {
                            searchMealDraftSuggestions(mealDraft.food, mealDraft.grams);
                          }
                        }}
                      />
                      {isSearchingMealDraft ? (
                        <div className="food-autofill-status">Searching macros...</div>
                      ) : null}
                      {mealDraftSuggestions.length > 0 ? (
                        <div className="food-suggestion-list">
                          {mealDraftSuggestions.map((suggestion, suggestionIndex) => (
                            <button
                              type="button"
                              className="food-suggestion"
                              key={`${suggestion.food}-${suggestionIndex}`}
                              onClick={() => applyFoodResultToMealDraft(suggestion)}
                            >
                              <span>
                                <strong>{suggestion.food}</strong>
                                <small>{suggestion.source === "usda" ? "Verified data" : suggestion.source === "local" ? "Verified app data" : suggestion.source === "claude" ? "Estimated (AI)" : suggestion.source === "cache" ? "Cached result" : "Manual fallback"}</small>
                              </span>
                              <span className="food-suggestion-macros">
                                {suggestion.calories} cal | P {suggestion.protein} | C {suggestion.carbs} | F {suggestion.fats}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </Field>

                  <Field label="Amount">
                    <div className="unit-row">
                      <NumericInput value={mealDraft.grams} onChange={(v) => {
                        const newGrams = v === "" ? 0 : v;
                        if (mealDraftBasePer100g && newGrams > 0) {
                          const f = newGrams / 100;
                          setMealDraft(prev => ({
                            ...prev,
                            grams: newGrams,
                            calories: Math.round(mealDraftBasePer100g.calories * f),
                            protein: Math.round(mealDraftBasePer100g.protein * f * 10) / 10,
                            carbs: Math.round(mealDraftBasePer100g.carbs * f * 10) / 10,
                            fats: Math.round(mealDraftBasePer100g.fats * f * 10) / 10
                          }));
                        } else {
                          updateMealDraft("grams", newGrams);
                        }
                      }} />
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
                    <button className="btn secondary" onClick={() => { setMealDraft({ id: "draft", date: getLocalDateISO(), meal: mealDraft.meal, food: "", grams: 100, calories: 0, protein: 0, carbs: 0, fats: 0 }); setMealDraftBasePer100g(null); }}>Clear</button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="compact-section">
            <button className={`collapse-pill section-pill ${expandedNutritionSections.loggedMeals ? "open" : ""}`} onClick={() => toggleNutritionSection("loggedMeals")}>
              <div>
                <strong>Logged meals</strong>
                <span className="pill-subtext">{foodsForSelectedDate.length} items logged for {formatDisplayDate(selectedNutritionDate)}</span>
              </div>
              <span className="pill-icon">{expandedNutritionSections.loggedMeals ? "-" : "+"}</span>
            </button>

            {expandedNutritionSections.loggedMeals ? (
              <div className="card logged-meals-card compact-expanded">
                <div className="row space-between">
                  <p className="small" style={{ margin: 0 }}>Meals are grouped so you can scan quickly and expand only what you need.</p>
                  <button className="btn secondary" onClick={addFood}>Add blank row</button>
                </div>

{foodsForSelectedDate.length === 0 ? (
  <p className="small">No meals logged yet.</p>
                ) : (
                  <div className="meal-group-list">
                    {["Breakfast", "Lunch", "Snack", "Dinner", "Coffee", "Other"].map((mealType) => {
                      const meals = foodsForSelectedDate.filter((food) => {
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
            <button
              className={`collapse-pill section-pill ${expandedNutritionSections.nutritionHistory ? "open" : ""}`}
              onClick={() => toggleNutritionSection("nutritionHistory")}
            >
              <div>
                <strong>Nutrition history</strong>
                <span className="pill-subtext">{nutritionHistory.length} days logged</span>
              </div>
              <span className="pill-icon">{expandedNutritionSections.nutritionHistory ? "−" : "+"}</span>
            </button>

            {expandedNutritionSections.nutritionHistory ? (
              <div className="card compact-expanded">
                {nutritionHistory.length === 0 ? (
                  <p className="small">No nutrition history yet.</p>
                ) : (
                  <div className="history-card-list">
                    {nutritionHistory.map((group) => (
                      <SwipeToDelete
                        key={group.date}
                        className="nutrition-history-swipe"
                        onDelete={() => deleteFoodsByDate(group.date)}
                      >
                        <div className="history-card">
                          <div>
                            <strong>{formatDisplayDate(group.date)}</strong>
                            <div className="small">
                              {group.items.length} items • {Math.round(group.totals.calories)} cal | P {group.totals.protein.toFixed(1)}g | C {group.totals.carbs.toFixed(1)}g | F {group.totals.fats.toFixed(1)}g
                            </div>
                            <div className="small" style={{ marginTop: 6, lineHeight: 1.6 }}>
                              {group.items.map((item) => `${item.meal}: ${item.food}`).join(", ")}
                            </div>
                          </div>
                        </div>
                      </SwipeToDelete>
                    ))}
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
                            <div className="card" style={{ background: "#F9FAFB" }}>
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
              {state.dailyLogs.map((row, index) => {
                const isOpen = !!expandedDays[`checkin-${row.date}-${index}`];
                const hasWeight = numberOrNull(row.weight) !== null;
                const hasSteps = numberOrNull(row.steps) !== null;
                const hasCalories = numberOrNull(row.calories) !== null;
                const hasProtein = numberOrNull(row.protein) !== null;
                const hasAnyMetric = hasWeight || hasSteps || hasCalories || hasProtein;
                const isComplete = hasWeight && (hasSteps || hasCalories || hasProtein);
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
                                hasSteps ? `${row.steps} steps` : null,
                                hasProtein ? `${row.protein}g protein` : null
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
                          <Field label="Calories">
                            <NumericInput value={row.calories} onChange={(v) => updateDaily(index, "calories", v)} />
                          </Field>
                          <Field label="Protein (g)">
                            <NumericInput value={row.protein} onChange={(v) => updateDaily(index, "protein", v)} />
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
      )}

      {tab === "settings" && (
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
                    <NumericInput value={state.settings.weightKg} onChange={(v) => updateSettings("weightKg", v === "" ? 0 : v)} />
                  </Field>
                  <Field label="Height (cm)">
                    <NumericInput value={state.settings.heightCm} onChange={(v) => updateSettings("heightCm", v === "" ? 0 : v)} />
                  </Field>
                  <Field label="Age">
                    <NumericInput value={state.settings.age} onChange={(v) => updateSettings("age", v === "" ? 0 : v)} />
                  </Field>
                  <Field label="Sex">
                    <select className="input" value={state.settings.sex} onChange={(e) => updateSettings("sex", e.target.value as Sex)}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </Field>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Field label="Daily activity level">
                    <select className="input" value={state.settings.lifestyle} onChange={(e) => updateSettings("lifestyle", e.target.value as Lifestyle)}>
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
                  <select className="input" value={state.settings.goal} onChange={(e) => updateSettings("goal", e.target.value as Goal)}>
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
                    <select className="input" value={state.settings.workoutsPerWeek} onChange={(e) => updateSettings("workoutsPerWeek", Number(e.target.value))}>
                      <option value={2}>2 days</option>
                      <option value={3}>3 days</option>
                      <option value={4}>4 days</option>
                      <option value={5}>5 days</option>
                    </select>
                  </Field>
                  <Field label="Experience">
                    <select className="input" value={state.settings.experienceLevel} onChange={(e) => updateSettings("experienceLevel", e.target.value as Settings["experienceLevel"])}>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </Field>
                  <Field label="Session length">
                    <select className="input" value={state.settings.sessionLength} onChange={(e) => updateSettings("sessionLength", Number(e.target.value))}>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                      <option value={75}>75 min</option>
                    </select>
                  </Field>
                  <Field label="Equipment">
                    <select className="input" value={state.settings.equipmentAccess} onChange={(e) => updateSettings("equipmentAccess", e.target.value as Settings["equipmentAccess"])}>
                      <option value="full_gym">Full gym</option>
                      <option value="machines">Machines only</option>
                      <option value="dumbbells">Dumbbells</option>
                      <option value="home">Home setup</option>
                    </select>
                  </Field>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Field label="Training focus">
                    <select className="input" value={state.settings.trainingEmphasis} onChange={(e) => updateSettings("trainingEmphasis", e.target.value as Settings["trainingEmphasis"])}>
                      <option value="aesthetic">Aesthetic — look better</option>
                      <option value="strength">Strength — lift more</option>
                      <option value="mobility">Mobility — move better</option>
                      <option value="fat_loss_support">Fat-loss support</option>
                    </select>
                  </Field>
                  <Field label="Injuries / limitations">
                    <input className="input" value={state.settings.limitations} onChange={(e) => updateSettings("limitations", e.target.value)} placeholder="e.g. knee pain, none" />
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
                    <NumericInput value={state.settings.targetCalories} onChange={(v) => updateSettings("targetCalories", v === "" ? 0 : v)} />
                  </Field>
                  <Field label="Protein (g)">
                    <NumericInput value={state.settings.proteinTarget} onChange={(v) => updateSettings("proteinTarget", v === "" ? 0 : v)} />
                  </Field>
                  <Field label="Carbs (g)">
                    <NumericInput value={state.settings.carbTarget} onChange={(v) => updateSettings("carbTarget", v === "" ? 0 : v)} />
                  </Field>
                  <Field label="Fat (g)">
                    <NumericInput value={state.settings.fatTarget} onChange={(v) => updateSettings("fatTarget", v === "" ? 0 : v)} />
                  </Field>
                  <Field label="Step target">
                    <NumericInput value={state.settings.stepTarget} onChange={(v) => updateSettings("stepTarget", v === "" ? 0 : v)} />
                  </Field>
                  <Field label="Step baseline">
                    <NumericInput value={state.settings.currentStepBaseline} onChange={(v) => updateSettings("currentStepBaseline", v === "" ? 0 : v)} />
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
                <p className="small">Swipe left to clear check-ins, workouts and nutrition logs.</p>
              </div>
            </SwipeToDelete>
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

function MissedWorkoutCard({
  missedWorkoutState,
  missedWorkoutInfo,
  setMissedWorkoutState,
  setState
}: {
  missedWorkoutState: "idle" | "asking" | "log_missed" | "skip_missed" | "show_today";
  missedWorkoutInfo: { missedDate: string; missedDayType: DayType } | null;
  setMissedWorkoutState: React.Dispatch<
    React.SetStateAction<"idle" | "asking" | "log_missed" | "skip_missed" | "show_today">
  >;
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

function MealSuggestionsSection({
  mealSuggestions,
  addedMealSuggestions,
  onAddSuggestion
}: {
  mealSuggestions: MealSuggestion[];
  addedMealSuggestions: Record<string, boolean>;
  onAddSuggestion: (suggestion: MealSuggestion) => void;
}) {
  if (mealSuggestions.length === 0) return null;

  return (
    <section className="compact-section">
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: "#111827", fontSize: 16, fontWeight: 600 }}>
          Today&apos;s Meal Ideas
        </h2>
        <p className="small" style={{ marginTop: 4 }}>
          Based on your remaining macros
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 8
        }}
      >
        {mealSuggestions.map((suggestion) => {
          const key = `${suggestion.meal}-${suggestion.food}`;
          const added = !!addedMealSuggestions[key];

          return (
            <div
              key={key}
              style={{
                width: 200,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                background: "#FFFFFF",
                borderRadius: 16,
                padding: 16,
                border: added ? "1px solid #059669" : "1px solid #E5E7EB"
              }}
            >
              <div
                style={{
                  color: "#9CA3AF",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: 700
                }}
              >
                {suggestion.meal}
              </div>

              <div
                style={{
                  color: "#111827",
                  fontSize: 14,
                  fontWeight: 600,
                  margin: "4px 0",
                  lineHeight: 1.4
                }}
              >
                {suggestion.food}
              </div>

              <div style={{ color: "#6B7280", fontSize: 12 }}>
                {suggestion.grams}g
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginTop: 10,
                  marginBottom: 12
                }}
              >
                <span
                  style={{
                    background: "#F3F4F6",
                    color: "#111827",
                    borderRadius: 999,
                    padding: "5px 8px",
                    fontSize: 11
                  }}
                >
                  {suggestion.calories} kcal
                </span>

                <span
                  style={{
                    background: "#F3F4F6",
                    color: "#111827",
                    borderRadius: 999,
                    padding: "5px 8px",
                    fontSize: 11
                  }}
                >
                  {suggestion.protein}g protein
                </span>
              </div>

              <button
                className="btn"
                disabled={added}
                onClick={() => onAddSuggestion(suggestion)}
                style={{
                  background: added ? "#F3F4F6" : "#059669",
                  color: added ? "#9CA3AF" : "#FFFFFF",
                  borderRadius: 8,
                  padding: 8,
                  width: "100%",
                  fontSize: 13,
                  fontWeight: 600,
                  minHeight: 38,
                  marginTop: "auto"
                }}
              >
                {added ? "✓ Added" : "Add to log"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
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
  tone,
  progressPercent
}: {
  title: string;
  value: string;
  hint: string;
  tone: "green" | "amber";
  progressPercent: number;
}) {
  return (
    <div className="metric-card">
      <div className="metric-title">{title}</div>

      <div className="metric-value">{value}</div>

      <div className="metric-bar">
        <div
          className={`metric-bar-fill ${tone}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="metric-hint">{hint}</div>
    </div>
  );
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

