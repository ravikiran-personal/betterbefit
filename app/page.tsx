"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generateFitnessPlan } from "../lib/fitness-engine";
import { getWeeklyNutritionAdjustment } from "../lib/fitness-engine/intelligence";
import type { GeneratedExercise } from "../lib/fitness-engine";
import type { Settings, DayType, SplitPlan, TodayWorkout, MealSuggestion } from "../lib/fitness-engine/types";
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
import { DashboardTab } from "../components/tabs/DashboardTab";
import { WorkoutsTab } from "../components/tabs/WorkoutsTab";
import { NutritionTab } from "../components/tabs/NutritionTab";
import { CheckInTab } from "../components/tabs/CheckInTab";
import { SettingsTab } from "../components/tabs/SettingsTab";


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
  foods: [],
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
  const [exerciseNameOverrides, setExerciseNameOverrides] = useState<Record<string, string>>({});
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
  
  const todaySavedWorkout = state.workoutHistory.find(
    (s) => s.date === todayStr && (s.completion === "completed" || s.completion === "partial")
  );

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
    const currentName = exerciseNameOverrides[exercise.exercise] || exercise.exercise;
    const logs = exerciseLogs[currentName] || [];
    return logs.some((set) => set.done);
  }).length;
  const hasAnyLoggedSet = Object.values(exerciseLogs).some((sets) => sets.some((set) => set.done));

  const workoutCompletion = useMemo(() => {
    if (todaysExercises.length === 0) return 0;
    const doneSets = Object.values(exerciseLogs).reduce(
      (sum, sets) => sum + sets.filter((s) => s.done).length,
      0
    );
    const totalSets = Object.values(exerciseLogs).reduce((sum, sets) => sum + sets.length, 0);
    return totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  }, [exerciseLogs, todaysExercises.length]);

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

  const currentStreak = streakDays;

  const todayDailyLog = state.dailyLogs.find(d => d.date === todayStr);
  const effectiveCalories = numberOrNull(todayDailyLog?.calories) ?? (todayFoodCalories > 0 ? todayFoodCalories : null);
  const effectiveProtein = numberOrNull(todayDailyLog?.protein) ?? (todayFoodProtein > 0 ? todayFoodProtein : null);

  const dailyTasks = [
    {
      id: "workout",
      done: todayWorkout.isRestDay || !!todaySavedWorkout || workoutCompletion >= 80,
      label: todayWorkout.isRestDay ? "Rest day" : `${todayWorkout.dayType} workout`,
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
        const currentName = exerciseNameOverrides[exercise.exercise] || exercise.exercise;
        nextLogs[currentName] =
          prev[currentName] ||
          Array.from({ length: exercise.sets }).map(() => ({
            weight: "",
            reps: "",
            done: false
          }));
      });

      return nextLogs;
    });
  }, [todaysExercises, exerciseNameOverrides]);

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

  function updateTodayMetric(key: "weight" | "steps", value: string | number | "") {
    const todayIndex = state.dailyLogs.findIndex(d => d.date === todayStr);
    if (todayIndex >= 0) {
      updateDaily(todayIndex, key, value);
    } else {
      setState((prev) => ({
        ...prev,
        dailyLogs: [...prev.dailyLogs, { date: todayStr, [key]: cleanNumber(value) } as DailyLog],
      }));
    }
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
      const currentName = exerciseNameOverrides[exercise.exercise] || exercise.exercise;
      const loggedSets: WorkoutSet[] = (exerciseLogs[currentName] || [])
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
        exercise: currentName,
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
    setExerciseNameOverrides({});
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

  function resetAllLogs() {
    setState((prev) => ({
      ...prev,
      dailyLogs: seedWeekLogs(),
      workoutLogs: seedWorkoutLogs(),
      workoutHistory: [],
      foods: []
    }));
  }

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

      <div key={tab} className="tab-anim">
      {tab === "dashboard" && (
        <DashboardTab
          greeting={greeting}
          todayDisplayDate={todayDisplayDate}
          currentStreak={currentStreak}
          dayScore={dayScore}
          dayScoreColor={dayScoreColor}
          dayScoreCircumference={dayScoreCircumference}
          dayScoreOffset={dayScoreOffset}
          completedTasks={completedTasks}
          dailyTasks={dailyTasks}
          consistencyMsg={consistencyMsg}
          effectiveProtein={effectiveProtein}
          effectiveCalories={effectiveCalories}
          displaySteps={displaySteps}
          workoutCompletion={workoutCompletion}
          proteinTarget={state.settings.proteinTarget}
          stepTarget={state.settings.stepTarget}
          targetCalories={state.settings.targetCalories}
          todayWeight={todayDailyLog?.weight ?? ""}
          todaySteps={todayDailyLog?.steps ?? ""}
          updateTodayMetric={updateTodayMetric}
          setTab={setTab}
        />
      )}


      {tab === "workouts" && (
        <WorkoutsTab
          missedWorkoutState={missedWorkoutState}
          missedWorkoutInfo={missedWorkoutInfo}
          setMissedWorkoutState={setMissedWorkoutState}
          setState={setState}
          todayWorkout={todayWorkout}
          splitPlan={splitPlan}
          todaysExercises={todaysExercises}
          exerciseNameOverrides={exerciseNameOverrides}
          setExerciseNameOverrides={setExerciseNameOverrides}
          exerciseLogs={exerciseLogs}
          setExerciseLogs={setExerciseLogs}
          expandedAlternates={expandedAlternates}
          setExpandedAlternates={setExpandedAlternates}
          loggedExerciseCount={loggedExerciseCount}
          hasAnyLoggedSet={hasAnyLoggedSet}
          workoutCompletion={workoutCompletion}
          saveWorkout={saveWorkout}
          workoutSaveMessage={workoutSaveMessage}
          workoutHistory={state.workoutHistory}
          expandedHistoryId={expandedHistoryId}
          setExpandedHistoryId={setExpandedHistoryId}
          deleteWorkoutSession={deleteWorkoutSession}
          loadWorkoutSession={loadWorkoutSession}
        />
      )}

      {tab === "nutrition" && (
        <NutritionTab
          foodTotals={foodTotals}
          targetCalories={state.settings.targetCalories}
          proteinTarget={state.settings.proteinTarget}
          carbTarget={state.settings.carbTarget}
          fatTarget={state.settings.fatTarget}
          todayFoodCalories={todayFoodCalories}
          selectedNutritionDate={selectedNutritionDate}
          submitTodayNutrition={submitTodayNutrition}
          mealSuggestions={mealSuggestions}
          addedMealSuggestions={addedMealSuggestions}
          addMealSuggestionToLog={addMealSuggestionToLog}
          expandedNutritionSections={expandedNutritionSections}
          toggleNutritionSection={toggleNutritionSection}
          mealDraft={mealDraft}
          updateMealDraft={updateMealDraft}
          searchMealDraftSuggestions={searchMealDraftSuggestions}
          isSearchingMealDraft={isSearchingMealDraft}
          mealDraftSuggestions={mealDraftSuggestions}
          applyFoodResultToMealDraft={applyFoodResultToMealDraft}
          mealDraftBasePer100g={mealDraftBasePer100g}
          setMealDraft={setMealDraft}
          setMealDraftBasePer100g={setMealDraftBasePer100g}
          mealDraftUnit={mealDraftUnit}
          setMealDraftUnit={setMealDraftUnit}
          addMealDraft={addMealDraft}
          foodsForSelectedDate={foodsForSelectedDate}
          addFood={addFood}
          deleteFood={deleteFood}
          updateFood={updateFood}
          nutritionHistory={nutritionHistory}
          deleteFoodsByDate={deleteFoodsByDate}
          mealPresets={state.mealPresets}
          mealPresetName={mealPresetName}
          setMealPresetName={setMealPresetName}
          saveCurrentMealsAsPreset={saveCurrentMealsAsPreset}
          applyMealPreset={applyMealPreset}
          deleteMealPreset={deleteMealPreset}
          baseSetup={baseSetup}
        />
      )}

      {tab === "checkin" && (
        <CheckInTab
          avgWeight={avgWeight}
          avgWaist={avgWaist}
          displaySteps={displaySteps}
          dailyLogs={state.dailyLogs}
          expandedDays={expandedDays}
          setExpandedDays={setExpandedDays}
          todayStr={todayStr}
          updateDaily={updateDaily}
          resetWeek={resetWeek}
          weeklyNutritionAdjustment={weeklyNutritionAdjustment}
          applyWeeklyNutritionAdjustment={applyWeeklyNutritionAdjustment}
          recommendation={recommendation}
        />
      )}

      {tab === "settings" && (
        <SettingsTab
          settingsStep={settingsStep}
          setSettingsStep={setSettingsStep}
          settings={state.settings}
          updateSettings={updateSettings}
          generatedPlan={generatedPlan}
          applyGeneratedFullPlan={applyGeneratedFullPlan}
          applyGeneratedNutritionPlan={applyGeneratedNutritionPlan}
          applyGeneratedWorkoutPlan={applyGeneratedWorkoutPlan}
          targetReason={targetReason}
          isCalculatingTargets={isCalculatingTargets}
          calculateTargetsWithAI={calculateTargetsWithAI}
          exportBackup={exportBackup}
          fileInputRef={fileInputRef}
          importBackup={importBackup}
          resetAllLogs={resetAllLogs}
        />
      )}
      </div>
    </main>
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

