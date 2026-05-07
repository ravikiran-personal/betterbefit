import type { Settings, DayType, SplitPlan, TodayWorkout } from "./fitness-engine/types";
import type { DailyLog, ExerciseLog, FoodItem, WorkoutSession, Achievement } from "./app-types";
import { numberOrNull, getLocalDateISO } from "./utils";

export function getLocalSplitPlan(settings: Settings): SplitPlan {
  const workoutsPerWeek = Number(settings.workoutsPerWeek) || 3;
  const experienceLevel = settings.experienceLevel;
  const trainingEmphasis = settings.trainingEmphasis;
  const equipmentAccess = settings.equipmentAccess;

  let splitName = "Full Body x3";
  let reasoning = "Default full-body training balances frequency and recovery.";
  let weeklySchedule: DayType[] = ["full", "rest", "full", "rest", "full", "rest", "rest"];

  if (experienceLevel === "beginner") {
    if (workoutsPerWeek <= 2) {
      splitName = "Beginner Full Body x2";
      weeklySchedule = ["full", "rest", "full", "rest", "rest", "rest", "rest"];
    } else if (workoutsPerWeek === 3) {
      splitName = "Beginner Full Body x3";
      weeklySchedule = ["full", "rest", "full", "rest", "full", "rest", "rest"];
    } else {
      splitName = "Beginner Full Body x4";
      weeklySchedule = ["full", "rest", "full", "rest", "full", "rest", "full"];
    }
    reasoning = "Beginner lifters progress best with frequent full-body practice and moderate volume.";
  } else if (workoutsPerWeek <= 2) {
    splitName = "Full Body x2";
    weeklySchedule = ["full", "rest", "rest", "full", "rest", "rest", "rest"];
    reasoning = "Two days are best used as full-body sessions.";
  } else if (workoutsPerWeek === 3 && trainingEmphasis === "strength") {
    splitName = "Upper / Lower / Upper";
    weeklySchedule = ["upper", "rest", "lower", "rest", "upper", "rest", "rest"];
    reasoning = "Strength-focused 3-day training benefits from repeated upper exposure and one lower day.";
  } else if (workoutsPerWeek === 3) {
    splitName = "Full Body x3";
    weeklySchedule = ["full", "rest", "full", "rest", "full", "rest", "rest"];
    reasoning = "Three full-body sessions provide strong frequency and recovery.";
  } else if (workoutsPerWeek === 4 && trainingEmphasis === "strength") {
    splitName = "Upper / Lower x2";
    weeklySchedule = ["upper", "lower", "rest", "upper", "lower", "rest", "rest"];
    reasoning = "Upper/lower training supports strength progression and recovery.";
  } else if (workoutsPerWeek === 4 && (trainingEmphasis === "aesthetic" || trainingEmphasis === "fat_loss_support")) {
    splitName = "Push / Pull / Lower / Full";
    weeklySchedule = ["push", "pull", "lower", "rest", "full", "rest", "rest"];
    reasoning = "This split balances hypertrophy volume, variety, and recovery.";
  } else if (workoutsPerWeek === 4 && trainingEmphasis === "mobility") {
    splitName = "Full Body x4";
    weeklySchedule = ["full", "rest", "full", "rest", "full", "rest", "full"];
    reasoning = "Mobility-focused training benefits from frequent lower-fatigue full-body sessions.";
  } else if (workoutsPerWeek === 5 && experienceLevel === "advanced") {
    splitName = "Advanced Push / Pull / Legs";
    weeklySchedule = ["push", "pull", "legs", "rest", "push", "pull", "rest"];
    reasoning = "Advanced lifters can handle higher weekly volume.";
  } else if (workoutsPerWeek === 5) {
    splitName = "Intermediate Upper / Lower / Push / Pull";
    weeklySchedule = ["upper", "lower", "rest", "push", "pull", "rest", "rest"];
    reasoning = "Intermediate lifters get balanced frequency without overloading recovery.";
  } else if (workoutsPerWeek >= 6) {
    splitName = "Push / Pull / Legs x2";
    weeklySchedule = ["push", "pull", "legs", "push", "pull", "legs", "rest"];
    reasoning = "Six days allow a twice-weekly push/pull/legs structure.";
  }

  if (equipmentAccess === "home" || equipmentAccess === "dumbbells") {
    weeklySchedule = weeklySchedule.map((day) => (day === "legs" ? "lower" : day));
    reasoning += " Legs days are mapped to lower-body templates for home or dumbbell setups.";
  }

  return { splitName, weeklySchedule, reasoning };
}

export function detectMissedWorkout(
  workoutHistory: WorkoutSession[],
  splitPlan: SplitPlan
): { hasMissed: boolean; missedDate: string; missedDayType: DayType } | null {
  const today = new Date(getLocalDateISO() + "T00:00:00");
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const missedDate = yesterday.toISOString().slice(0, 10);
  const jsDay = yesterday.getDay();
  const weekIndex = jsDay === 0 ? 6 : jsDay - 1;
  const missedDayType = splitPlan.weeklySchedule[weekIndex];

  if (!missedDayType || missedDayType === "rest") return null;

  const alreadyLogged = workoutHistory.some((session) => session.date === missedDate);
  if (alreadyLogged) return null;

  return { hasMissed: true, missedDate, missedDayType };
}

export function getTodaysWorkoutType({
  splitPlan,
  todayDate
}: {
  splitPlan: SplitPlan;
  workoutHistory: Array<{ date: string; dayType?: string }>;
  todayDate: string;
}): TodayWorkout {
  const date = new Date(todayDate + "T00:00:00");
  const jsDay = date.getDay();
  const weekIndex = jsDay === 0 ? 6 : jsDay - 1;
  const dayType = splitPlan.weeklySchedule[weekIndex] || "rest";

  return {
    dayType,
    isRestDay: dayType === "rest",
    weekIndex,
    splitName: splitPlan.splitName
  };
}

export function getReadinessScore(input: {
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

export function getBaseSetup(input: {
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

export function getCardioRoutine(input: {
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

export function getLocalFoodCache(): Record<string, object> {
  try {
    const raw = localStorage.getItem("food-cache");
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, object>;
    }

    return {};
  } catch {
    return {};
  }
}

export function getWeekStatus(dailyLogs: DailyLog[]) {
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date(getLocalDateISO() + "T00:00:00");
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    const dateISO = localDate.toISOString().slice(0, 10);
    const log = dailyLogs.find((item) => item.date === dateISO) || dailyLogs[index];

    const hasUsefulData =
      !!log &&
      (numberOrNull(log.weight) !== null ||
        numberOrNull(log.steps) !== null ||
        numberOrNull(log.calories) !== null ||
        numberOrNull(log.protein) !== null);

    const isToday = dateISO === getLocalDateISO();
    return {
      label: dayLabels[date.getDay()],
      date: dateISO,
      dateNumber: String(date.getDate()).padStart(2, "0"),
      index,
      hasUsefulData,
      isToday,
      status: hasUsefulData ? "done" : isToday ? "today" : "neutral"
    };
  });
}

export function getCurrentStreak(dailyLogs: DailyLog[]) {
  const hasData = (log: DailyLog | undefined) =>
    !!log &&
    (numberOrNull(log.weight) !== null ||
      numberOrNull(log.steps) !== null ||
      numberOrNull(log.calories) !== null ||
      numberOrNull(log.protein) !== null);

  const logMap = new Map<string, DailyLog>();
  for (const log of dailyLogs) {
    logMap.set(log.date, log);
  }

  const todayStr = getLocalDateISO();
  let currentDate = new Date(todayStr + "T00:00:00");

  if (!hasData(logMap.get(todayStr))) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  let streak = 0;

  while (true) {
    const dateISO = currentDate.toISOString().slice(0, 10);
    const log = logMap.get(dateISO);

    if (!hasData(log)) break;

    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

export function getWeeklyXp(input: {
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

export function getBadges(input: {
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

export function getDayLabel(day: string) {
  const labels: Record<string, string> = {
    push: "Push",
    lower: "Lower",
    pull: "Pull",
    full: "Full Body",
    upper: "Upper Body",
    legs: "Legs",
    rest: "Rest",
    "Day 1 - Push": "Push",
    "Day 2 - Lower": "Lower",
    "Day 3 - Pull": "Pull",
    "Day 4 - Full Body": "Full Body"
  };

  return labels[day] || day;
}

export function getDayDescription(day: string) {
  const descriptions: Record<string, string> = {
    push: "Chest, shoulders, triceps, and pressing strength.",
    lower: "Quads, hamstrings, glutes, calves, and lower-body function.",
    pull: "Back width, back thickness, rear delts, and biceps.",
    full: "Balanced full-body work, carries, and core.",
    upper: "Upper-body strength and hypertrophy work.",
    legs: "Dedicated lower-body strength and hypertrophy work.",
    rest: "Recovery day."
  };

  return descriptions[day] || "Custom training day.";
}

export function getWorkoutDayGroups(workoutLogs: ExerciseLog[]) {
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

export function getXpRules(input: {
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

export function getStepPlan(start: number, target: number) {
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

export function getNutritionHistoryGroups(foods: FoodItem[]) {
  const groups = foods.reduce<Record<string, FoodItem[]>>((acc, food) => {
    const date = food.date || getLocalDateISO();

    if (!acc[date]) {
      acc[date] = [];
    }

    acc[date].push(food);
    return acc;
  }, {});

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => {
      const totals = items.reduce(
        (acc, food) => {
          acc.calories += food.calories;
          acc.protein += food.protein;
          acc.carbs += food.carbs;
          acc.fats += food.fats;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );

      return { date, items, totals };
    });
}

export function getRecommendation(input: {
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
