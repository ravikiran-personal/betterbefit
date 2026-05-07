import { generateWorkoutPlan, getSplitPlan } from "../lib/fitness-engine/workouts";
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

describe("generateWorkoutPlan", () => {
  test("returns exercises for standard 4-day intermediate", () => {
    const plan = generateWorkoutPlan(base);
    expect(plan.exercises.length).toBeGreaterThan(0);
    expect(typeof plan.split).toBe("string");
  });

  test("beginner gets full-body split regardless of workoutsPerWeek", () => {
    const plan = generateWorkoutPlan({ ...base, experienceLevel: "beginner", workoutsPerWeek: 5 });
    expect(plan.exercises.every((e) => e.day === "full")).toBe(true);
  });

  test("3-day plan uses full-body only", () => {
    const plan = generateWorkoutPlan({ ...base, workoutsPerWeek: 3 });
    expect(plan.exercises.every((e) => e.day === "full")).toBe(true);
  });

  test("4-day plan includes push, lower, pull, and full days", () => {
    const plan = generateWorkoutPlan({ ...base, workoutsPerWeek: 4 });
    const days = new Set(plan.exercises.map((e) => e.day));
    expect(days.has("push")).toBe(true);
    expect(days.has("lower")).toBe(true);
    expect(days.has("pull")).toBe(true);
    expect(days.has("full")).toBe(true);
  });

  test("sets are clamped between 2 and 4", () => {
    const plan = generateWorkoutPlan(base);
    for (const exercise of plan.exercises) {
      expect(exercise.sets).toBeGreaterThanOrEqual(2);
      expect(exercise.sets).toBeLessThanOrEqual(4);
    }
  });

  test("beginner gets -1 set adjustment (clamped at min 2)", () => {
    const plan = generateWorkoutPlan({ ...base, experienceLevel: "beginner", sessionLength: 60 });
    const baseIntermediate = generateWorkoutPlan({ ...base, experienceLevel: "intermediate", sessionLength: 60 });
    const avgBeginner = plan.exercises.reduce((s, e) => s + e.sets, 0) / plan.exercises.length;
    const avgIntermediate = baseIntermediate.exercises.reduce((s, e) => s + e.sets, 0) / baseIntermediate.exercises.length;
    expect(avgBeginner).toBeLessThanOrEqual(avgIntermediate);
  });

  test("home equipment remaps Machine Chest Press to Push-Up", () => {
    const plan = generateWorkoutPlan({ ...base, equipmentAccess: "home" });
    const chest = plan.exercises.find((e) => e.pattern === "Horizontal Press");
    if (chest) {
      expect(chest.exercise).toBe("Push-Up");
    }
  });

  test("full_gym keeps Machine Chest Press", () => {
    const plan = generateWorkoutPlan({ ...base, workoutsPerWeek: 4, equipmentAccess: "full_gym" });
    const chest = plan.exercises.find((e) => e.pattern === "Horizontal Press" && e.day === "push");
    if (chest) {
      expect(chest.exercise).toBe("Machine Chest Press");
    }
  });

  test("returns high confidence", () => {
    const plan = generateWorkoutPlan(base);
    expect(plan.confidence).toBe("high");
  });

  test("reasoning array is non-empty", () => {
    const plan = generateWorkoutPlan(base);
    expect(plan.reasoning.length).toBeGreaterThan(0);
  });
});

describe("getSplitPlan", () => {
  test("beginner 3x/week gets Full Body x3", () => {
    const plan = getSplitPlan({ ...base, experienceLevel: "beginner", workoutsPerWeek: 3 });
    expect(plan.splitName).toContain("Full Body x3");
    expect(plan.weeklySchedule.filter((d) => d === "full").length).toBe(3);
  });

  test("advanced 5x/week gets PPL split", () => {
    const plan = getSplitPlan({ ...base, experienceLevel: "advanced", workoutsPerWeek: 5 });
    expect(plan.splitName).toContain("Push / Pull / Legs");
  });

  test("6x/week gets PPL x2", () => {
    const plan = getSplitPlan({ ...base, workoutsPerWeek: 6 });
    expect(plan.splitName).toContain("x2");
  });

  test("weeklySchedule has exactly 7 days", () => {
    const plan = getSplitPlan(base);
    expect(plan.weeklySchedule.length).toBe(7);
  });

  test("rest days are included in schedules for < 7 workouts/week", () => {
    const plan = getSplitPlan({ ...base, workoutsPerWeek: 4 });
    expect(plan.weeklySchedule.includes("rest")).toBe(true);
  });

  test("strength 4x/week gives Upper/Lower split", () => {
    const plan = getSplitPlan({ ...base, workoutsPerWeek: 4, trainingEmphasis: "strength" });
    expect(plan.splitName).toMatch(/Upper.*Lower/i);
  });

  test("returns a non-empty reasoning string", () => {
    const plan = getSplitPlan(base);
    expect(plan.reasoning.length).toBeGreaterThan(0);
  });
});
