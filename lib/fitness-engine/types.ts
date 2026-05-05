export type UserSettings = {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: "male" | "female";
  lifestyle: "sedentary" | "light" | "moderate" | "active";
  goal: "recomp" | "maintain" | "lose_weight" | "be_more_active";
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

export type Confidence = "high" | "medium" | "low";

export type NutritionPlan = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: Confidence;
  reasoning: string[];
};

export type CardioPlan = {
  weeklyMinutes: number;
  sessions: string[];
  confidence: Confidence;
  reasoning: string[];
};

export type GeneratedExercise = {
  day: string;
  dayLabel: string;
  pattern: string;
  exercise: string;
  alternates: string[];
  sets: number;
  targetReps: string;
};

export type WorkoutPlan = {
  split: string;
  exercises: GeneratedExercise[];
  confidence: Confidence;
  reasoning: string[];
};

export type FitnessPlan = {
  nutrition: NutritionPlan;
  workout: WorkoutPlan;
  cardio: CardioPlan;
};

export type DayType = "push" | "pull" | "lower" | "upper" | "legs" | "full" | "rest";

export type SplitPlan = {
  splitName: string;
  weeklySchedule: DayType[];
  reasoning: string;
};

export type TodayWorkout = {
  dayType: DayType;
  isRestDay: boolean;
  weekIndex: number;
  splitName: string;
};

type MealSuggestion = {
  meal: "Breakfast" | "Lunch" | "Dinner";
  food: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};
