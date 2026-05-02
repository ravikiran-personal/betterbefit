type Goal = "recomp" | "maintain" | "lose_weight" | "be_more_active";

type SettingsLike = {
  goal: Goal;
  targetCalories: number;
  proteinTarget: number;
  stepTarget: number;
};

type DailyLogLike = {
  date: string;
  weight: number | "";
  steps: number | "";
  calories: number | "";
  protein: number | "";
  waist: number | "";
};

type NutritionDay = {
  date: string;
  calories: number;
  protein: number;
};

type WeeklyAdjustmentInput = {
  settings: SettingsLike;
  dailyLogs: DailyLogLike[];
  nutritionDays: NutritionDay[];
  workoutCompletion: number;
};

export type WeeklyNutritionAdjustment = {
  title: string;
  summary: string;
  calorieDelta: number;
  confidence: "high" | "medium" | "low";
  tone: "good" | "warn";
  reasons: string[];
};

function numberOrNull(value: number | "" | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function average(values: Array<number | null>): number | null {
  const clean = values.filter((value): value is number => value !== null);
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function getTrend(values: Array<number | null>): number | null {
  const clean = values.filter((value): value is number => value !== null);
  if (clean.length < 2) return null;
  return clean[clean.length - 1] - clean[0];
}

function round(value: number) {
  return Math.round(value);
}

export function getWeeklyNutritionAdjustment(input: WeeklyAdjustmentInput): WeeklyNutritionAdjustment {
  const recentLogs = [...input.dailyLogs].slice(-7);
  const recentNutrition = [...input.nutritionDays]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  const loggedNutritionDays = recentNutrition.filter((day) => day.calories > 0 || day.protein > 0).length;
  const avgLoggedCalories = average(recentNutrition.map((day) => (day.calories > 0 ? day.calories : null)));
  const avgLoggedProtein = average(recentNutrition.map((day) => (day.protein > 0 ? day.protein : null)));
  const avgSteps = average(recentLogs.map((log) => numberOrNull(log.steps)));
  const avgCheckinCalories = average(recentLogs.map((log) => numberOrNull(log.calories)));
  const avgCheckinProtein = average(recentLogs.map((log) => numberOrNull(log.protein)));
  const weightTrend = getTrend(recentLogs.map((log) => numberOrNull(log.weight)));
  const waistTrend = getTrend(recentLogs.map((log) => numberOrNull(log.waist)));

  const avgCalories = avgLoggedCalories ?? avgCheckinCalories;
  const avgProtein = avgLoggedProtein ?? avgCheckinProtein;
  const reasons: string[] = [];

  if (loggedNutritionDays < 3) {
    return {
      title: "Collect more nutrition data",
      summary: "Log meals on at least 3 days before changing calorie targets.",
      calorieDelta: 0,
      confidence: "low",
      tone: "warn",
      reasons: [
        `${loggedNutritionDays} nutrition day${loggedNutritionDays === 1 ? "" : "s"} logged this week`,
        "Calorie changes are safer after a few real intake logs",
        "Keep the current target for now"
      ]
    };
  }

  if (avgProtein !== null && avgProtein < input.settings.proteinTarget * 0.85) {
    return {
      title: "Fix protein before calories",
      summary: "Protein is too far below target, so cutting calories now may reduce recovery and muscle retention.",
      calorieDelta: 0,
      confidence: "high",
      tone: "warn",
      reasons: [
        `Average protein: ${round(avgProtein)}g vs target ${input.settings.proteinTarget}g`,
        "Improve protein consistency before reducing calories",
        "Use one simple anchor meal: eggs, chicken, fish, paneer, curd or whey"
      ]
    };
  }

  if (avgSteps !== null && avgSteps < input.settings.stepTarget * 0.85) {
    return {
      title: "Increase steps before cutting food",
      summary: "Steps are below target. Improve activity first instead of reducing calories immediately.",
      calorieDelta: 0,
      confidence: "high",
      tone: "warn",
      reasons: [
        `Average steps: ${round(avgSteps).toLocaleString()} vs target ${input.settings.stepTarget.toLocaleString()}`,
        "Low NEAT can hide progress and make calorie cuts feel harder",
        "Add short walks after meals before changing calories"
      ]
    };
  }

  if (input.workoutCompletion < 50) {
    return {
      title: "Hold calories and stabilize training",
      summary: "Workout logging is too incomplete to know whether nutrition is supporting performance.",
      calorieDelta: 0,
      confidence: "medium",
      tone: "warn",
      reasons: [
        `Workout logging: ${input.workoutCompletion}% complete`,
        "Training consistency should be stable before target changes",
        "Keep calories steady and log the next sessions fully"
      ]
    };
  }

  if (avgCalories !== null) {
    reasons.push(`Average logged intake: ${round(avgCalories)} kcal vs target ${input.settings.targetCalories} kcal`);
  }
  if (avgProtein !== null) {
    reasons.push(`Average protein: ${round(avgProtein)}g vs target ${input.settings.proteinTarget}g`);
  }
  if (avgSteps !== null) {
    reasons.push(`Average steps: ${round(avgSteps).toLocaleString()} vs target ${input.settings.stepTarget.toLocaleString()}`);
  }

  const waistDown = waistTrend !== null && waistTrend < -0.2;
  const waistUp = waistTrend !== null && waistTrend > 0.2;
  const weightDownFast = weightTrend !== null && weightTrend < -0.8;
  const weightStable = weightTrend === null || Math.abs(weightTrend) <= 0.4;
  const weightUp = weightTrend !== null && weightTrend > 0.4;
  const caloriesNearTarget = avgCalories === null || Math.abs(avgCalories - input.settings.targetCalories) <= 180;

  if (weightDownFast) {
    return {
      title: "Slightly increase calories",
      summary: "Weight is dropping quickly. Add a small amount of calories to protect training and recovery.",
      calorieDelta: 100,
      confidence: "medium",
      tone: "warn",
      reasons: [
        ...reasons,
        `Weight trend: ${weightTrend?.toFixed(1)} kg across recent logs`,
        "Fast drops can reduce performance and recovery"
      ].slice(0, 5)
    };
  }

  if (input.settings.goal === "lose_weight" && weightStable && !waistDown && caloriesNearTarget) {
    return {
      title: "Reduce calories slightly",
      summary: "Fat-loss signals look flat while intake is near target. A small reduction is reasonable.",
      calorieDelta: -100,
      confidence: "medium",
      tone: "warn",
      reasons: [
        ...reasons,
        "Weight and waist are not clearly moving down",
        "A small cut is safer than a large aggressive drop"
      ].slice(0, 5)
    };
  }

  if (input.settings.goal === "recomp" && weightStable && waistDown) {
    return {
      title: "Hold targets",
      summary: "This is a strong recomp pattern: weight is stable while waist is trending down.",
      calorieDelta: 0,
      confidence: "high",
      tone: "good",
      reasons: [
        ...reasons,
        "Stable weight plus lower waist suggests positive body composition change",
        "Do not change a working target"
      ].slice(0, 5)
    };
  }

  if (input.settings.goal === "recomp" && weightUp && waistUp) {
    return {
      title: "Reduce calories slightly",
      summary: "Weight and waist are both trending up, so a small calorie reduction is appropriate.",
      calorieDelta: -100,
      confidence: "medium",
      tone: "warn",
      reasons: [
        ...reasons,
        `Weight trend: +${weightTrend?.toFixed(1)} kg`,
        "Weight and waist rising together usually means intake is slightly high"
      ].slice(0, 5)
    };
  }

  return {
    title: "Hold targets",
    summary: "Current data does not justify changing calories yet. Keep logging and reassess after more trend data.",
    calorieDelta: 0,
    confidence: loggedNutritionDays >= 5 ? "high" : "medium",
    tone: "good",
    reasons: [
      ...reasons,
      "No clear need for a calorie change",
      "Consistency matters more than small daily fluctuations"
    ].slice(0, 5)
  };
}
