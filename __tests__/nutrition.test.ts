import { generateNutritionPlan } from "../lib/fitness-engine/nutrition";
import type { UserSettings } from "../lib/fitness-engine/types";

const base: UserSettings = {
  weightKg: 75,
  heightCm: 175,
  age: 30,
  sex: "male",
  lifestyle: "moderate",
  goal: "recomp",
  targetCalories: 2000,
  proteinTarget: 150,
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

describe("generateNutritionPlan", () => {
  test("returns positive macros for standard male input", () => {
    const plan = generateNutritionPlan(base);
    expect(plan.calories).toBeGreaterThan(0);
    expect(plan.protein).toBeGreaterThan(0);
    expect(plan.carbs).toBeGreaterThan(0);
    expect(plan.fats).toBeGreaterThan(0);
  });

  test("lose_weight goal produces a deficit relative to maintain", () => {
    const maintain = generateNutritionPlan({ ...base, goal: "maintain" });
    const lose = generateNutritionPlan({ ...base, goal: "lose_weight" });
    expect(lose.calories).toBeLessThan(maintain.calories);
  });

  test("recomp goal has a smaller deficit than lose_weight", () => {
    const recomp = generateNutritionPlan({ ...base, goal: "recomp" });
    const lose = generateNutritionPlan({ ...base, goal: "lose_weight" });
    expect(recomp.calories).toBeGreaterThan(lose.calories);
  });

  test("be_more_active matches maintain calories", () => {
    const active = generateNutritionPlan({ ...base, goal: "be_more_active" });
    const maintain = generateNutritionPlan({ ...base, goal: "maintain" });
    expect(active.calories).toBe(maintain.calories);
  });

  test("female has lower calories than male with same profile", () => {
    const male = generateNutritionPlan({ ...base, sex: "male" });
    const female = generateNutritionPlan({ ...base, sex: "female" });
    expect(female.calories).toBeLessThan(male.calories);
  });

  test("active lifestyle produces more calories than sedentary", () => {
    const sedentary = generateNutritionPlan({ ...base, lifestyle: "sedentary" });
    const active = generateNutritionPlan({ ...base, lifestyle: "active" });
    expect(active.calories).toBeGreaterThan(sedentary.calories);
  });

  test("lose_weight goal raises protein per kg to 2.0", () => {
    const plan = generateNutritionPlan({ ...base, goal: "lose_weight" });
    expect(plan.protein).toBeGreaterThanOrEqual(Math.round(base.weightKg * 2.0));
  });

  test("advanced experience level adds 0.1g/kg protein", () => {
    const intermediate = generateNutritionPlan({ ...base, experienceLevel: "intermediate" });
    const advanced = generateNutritionPlan({ ...base, experienceLevel: "advanced" });
    expect(advanced.protein).toBe(intermediate.protein + Math.round(base.weightKg * 0.1));
  });

  test("macro calories roughly sum to total (within rounding margin)", () => {
    const plan = generateNutritionPlan(base);
    const macroCalories = plan.protein * 4 + plan.carbs * 4 + plan.fats * 9;
    expect(Math.abs(macroCalories - plan.calories)).toBeLessThan(80);
  });

  test("carbs have a floor of 80g", () => {
    const veryHighProtein = generateNutritionPlan({ ...base, weightKg: 130, goal: "lose_weight" });
    expect(veryHighProtein.carbs).toBeGreaterThanOrEqual(80);
  });

  test("handles extreme low weight gracefully (floor at 35kg)", () => {
    const plan = generateNutritionPlan({ ...base, weightKg: 10 });
    expect(plan.calories).toBeGreaterThan(0);
    expect(plan.protein).toBeGreaterThan(0);
  });

  test("returns high confidence when weight/height/age are valid", () => {
    const plan = generateNutritionPlan(base);
    expect(plan.confidence).toBe("high");
  });

  test("reasoning array is non-empty", () => {
    const plan = generateNutritionPlan(base);
    expect(plan.reasoning.length).toBeGreaterThan(0);
  });
});
