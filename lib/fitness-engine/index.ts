import type { FitnessPlan, UserSettings } from "./types";
import { generateCardioPlan } from "./cardio";
import { generateNutritionPlan } from "./nutrition";
import { generateWorkoutPlan } from "./workouts";

export function generateFitnessPlan(settings: UserSettings): FitnessPlan {
  return {
    nutrition: generateNutritionPlan(settings),
    workout: generateWorkoutPlan(settings),
    cardio: generateCardioPlan(settings)
  };
}

export type { FitnessPlan, GeneratedExercise, UserSettings } from "./types";
