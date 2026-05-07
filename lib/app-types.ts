import type { Settings, DayType, SplitPlan, TodayWorkout, MealSuggestion } from "./fitness-engine/types";

export type { Settings, DayType, SplitPlan, TodayWorkout, MealSuggestion };

export type DailyLog = {
  date: string;
  weight: number | "";
  steps: number | "";
  calories: number | "";
  protein: number | "";
  cardioMinutes: number | "";
  waist: number | "";
};

export type WorkoutSet = {
  id: string;
  weight: number | "";
  reps: number | "";
  rpe: number | "";
};

export type ExerciseLog = {
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

export type FoodItem = {
  id: string;
  date: string;
  meal: string;
  food: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export type MealPreset = {
  id: string;
  name: string;
  createdAt: string;
  foods: FoodItem[];
};

export type FoodSearchResult = {
  source: string;
  food: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: "high" | "medium" | "low";
  note: string;
  results?: FoodSearchResult[];
};

export type WorkoutSession = {
  id: string;
  date: string;
  dayType?: DayType;
  completion?: "completed" | "partial" | "skipped";
  totalVolume: number;
  exercises: ExerciseLog[];
};

export type AppState = {
  settings: Settings;
  dailyLogs: DailyLog[];
  workoutLogs: ExerciseLog[];
  workoutHistory: WorkoutSession[];
  foods: FoodItem[];
  mealPresets: MealPreset[];
};

export type Achievement = {
  icon: string;
  title: string;
  detail: string;
  unlocked: boolean;
};

export type Tab = "dashboard" | "workouts" | "nutrition" | "checkin" | "settings";
