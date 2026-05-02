import type { NutritionPlan, UserSettings } from "./types";

function roundToNearest(value: number, nearest: number) {
  return Math.round(value / nearest) * nearest;
}

function lifestyleMultiplier(lifestyle: UserSettings["lifestyle"]) {
  if (lifestyle === "sedentary") return 1.2;
  if (lifestyle === "light") return 1.375;
  if (lifestyle === "moderate") return 1.55;
  return 1.725;
}

export function generateNutritionPlan(settings: UserSettings): NutritionPlan {
  const weight = Math.max(settings.weightKg || 70, 35);
  const height = Math.max(settings.heightCm || 170, 120);
  const age = Math.max(settings.age || 30, 16);

  const sexAdjustment = settings.sex === "male" ? 5 : -161;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexAdjustment;
  const tdee = bmr * lifestyleMultiplier(settings.lifestyle);

  let calorieAdjustment = 0;
  const reasoning: string[] = [];

  if (settings.goal === "lose_weight") {
    calorieAdjustment = -0.18;
    reasoning.push("Moderate calorie deficit selected for fat loss without aggressive recovery cost.");
  } else if (settings.goal === "recomp") {
    calorieAdjustment = -0.08;
    reasoning.push("Small deficit selected for recomposition: fat loss support while preserving training output.");
  } else if (settings.goal === "be_more_active") {
    calorieAdjustment = 0;
    reasoning.push("Maintenance calories selected while activity habits are built.");
  } else {
    calorieAdjustment = 0;
    reasoning.push("Maintenance calories selected because the goal is weight stability.");
  }

  const calories = roundToNearest(tdee * (1 + calorieAdjustment), 25);

  let proteinPerKg = 1.8;
  if (settings.goal === "lose_weight") proteinPerKg = 2.0;
  if (settings.experienceLevel === "advanced") proteinPerKg += 0.1;
  const protein = Math.round(weight * proteinPerKg);

  const fats = Math.max(Math.round(weight * 0.7), Math.round((calories * 0.22) / 9));
  const proteinCalories = protein * 4;
  const fatCalories = fats * 9;
  const carbs = Math.max(80, Math.round((calories - proteinCalories - fatCalories) / 4));

  reasoning.push(`Protein target uses ${proteinPerKg.toFixed(1)}g/kg to support muscle protein synthesis and lean-mass retention.`);
  reasoning.push("Fat target protects hormones and diet adherence; carbs receive remaining calories for training performance.");

  if (settings.lifestyle === "sedentary") {
    reasoning.push("Sedentary activity level detected, so the plan avoids a harsh calorie cut and prioritizes steps.");
  }

  return {
    calories,
    protein,
    carbs,
    fats,
    confidence: weight > 0 && height > 0 && age > 0 ? "high" : "medium",
    reasoning
  };
}
