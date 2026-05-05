import type { GeneratedExercise, UserSettings, WorkoutPlan } from "./types";

const push: GeneratedExercise[] = [
  { day: "push", dayLabel: "Push", pattern: "Incline Press", exercise: "Incline DB Press", alternates: ["Incline Barbell Press", "Smith Machine Incline Press", "Low Incline Machine Press", "Feet-Elevated Push-Up"], sets: 3, targetReps: "6-10" },
  { day: "push", dayLabel: "Push", pattern: "Horizontal Press", exercise: "Machine Chest Press", alternates: ["Flat DB Press", "Barbell Bench Press", "Cable Chest Press", "Push-Up"], sets: 3, targetReps: "8-12" },
  { day: "push", dayLabel: "Push", pattern: "Overhead Press", exercise: "Seated DB Shoulder Press", alternates: ["Machine Shoulder Press", "Standing Barbell Press", "Arnold Press", "Landmine Press"], sets: 3, targetReps: "8-10" },
  { day: "push", dayLabel: "Push", pattern: "Side Delts", exercise: "Lateral Raise", alternates: ["Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away Lateral Raise"], sets: 3, targetReps: "12-15" },
  { day: "push", dayLabel: "Push", pattern: "Triceps", exercise: "Triceps Pushdown", alternates: ["Overhead Cable Extension", "Close-Grip Push-Up", "Machine Dip", "Skull Crusher"], sets: 3, targetReps: "10-12" }
];

const lower: GeneratedExercise[] = [
  { day: "lower", dayLabel: "Lower", pattern: "Squat Pattern", exercise: "Leg Press or Squat", alternates: ["Hack Squat", "Goblet Squat", "Smith Squat", "Split Squat"], sets: 3, targetReps: "6-10" },
  { day: "lower", dayLabel: "Lower", pattern: "Hip Hinge", exercise: "Romanian Deadlift", alternates: ["DB Romanian Deadlift", "Hip Thrust", "Good Morning", "Cable Pull-Through"], sets: 3, targetReps: "8-10" },
  { day: "lower", dayLabel: "Lower", pattern: "Single-Leg", exercise: "Walking Lunges", alternates: ["Bulgarian Split Squat", "Step-Up", "Reverse Lunge", "Single-Leg Leg Press"], sets: 3, targetReps: "10/leg" },
  { day: "lower", dayLabel: "Lower", pattern: "Hamstring Curl", exercise: "Leg Curl", alternates: ["Seated Leg Curl", "Lying Leg Curl", "Swiss Ball Curl", "Nordic Curl"], sets: 3, targetReps: "10-12" },
  { day: "lower", dayLabel: "Lower", pattern: "Calves", exercise: "Calf Raise", alternates: ["Seated Calf Raise", "Leg Press Calf Raise", "Single-Leg Calf Raise"], sets: 3, targetReps: "12-15" }
];

const pull: GeneratedExercise[] = [
  { day: "pull", dayLabel: "Pull", pattern: "Vertical Pull", exercise: "Pull-Ups / Assisted Pull-Ups", alternates: ["Lat Pulldown", "Neutral-Grip Pulldown", "Assisted Pull-Up", "Cable Pullover"], sets: 3, targetReps: "AMRAP" },
  { day: "pull", dayLabel: "Pull", pattern: "Lat Focus", exercise: "Lat Pulldown", alternates: ["Pull-Up", "Assisted Pull-Up", "Single-Arm Pulldown", "Machine High Row"], sets: 3, targetReps: "8-12" },
  { day: "pull", dayLabel: "Pull", pattern: "Horizontal Row", exercise: "Seated Row", alternates: ["Chest-Supported Row", "One-Arm DB Row", "Cable Row", "Machine Row"], sets: 3, targetReps: "8-12" },
  { day: "pull", dayLabel: "Pull", pattern: "Rear Delts", exercise: "Face Pull", alternates: ["Reverse Pec Deck", "Cable Rear Delt Fly", "DB Rear Delt Raise"], sets: 3, targetReps: "12-15" },
  { day: "pull", dayLabel: "Pull", pattern: "Biceps", exercise: "Biceps Curl", alternates: ["Incline DB Curl", "Cable Curl", "Hammer Curl", "Preacher Curl"], sets: 3, targetReps: "10-12" }
];

const full: GeneratedExercise[] = [
  { day: "full", dayLabel: "Full Body", pattern: "Push", exercise: "DB Bench or Push-Ups", alternates: ["Machine Chest Press", "Push-Up", "Barbell Bench Press", "Cable Chest Press"], sets: 3, targetReps: "8-12" },
  { day: "full", dayLabel: "Full Body", pattern: "Row", exercise: "Cable Row", alternates: ["Chest-Supported Row", "Seated Row", "Machine Row", "One-Arm DB Row"], sets: 3, targetReps: "8-12" },
  { day: "full", dayLabel: "Full Body", pattern: "Squat", exercise: "Goblet Squat", alternates: ["Leg Press", "Hack Squat", "DB Split Squat", "Smith Squat"], sets: 3, targetReps: "10-12" },
  { day: "full", dayLabel: "Full Body", pattern: "Carry", exercise: "Farmer Carry", alternates: ["Suitcase Carry", "Trap Bar Carry", "Sled Push", "Dead Bug Hold"], sets: 2, targetReps: "30-60 sec" },
  { day: "full", dayLabel: "Full Body", pattern: "Core", exercise: "Hanging Knee Raise", alternates: ["Cable Crunch", "Dead Bug", "Reverse Crunch", "Plank"], sets: 3, targetReps: "10-15" }
];

export const upper = [
  {
    day: "upper",
    dayLabel: "Upper Body",
    pattern: "Horizontal Press",
    exercise: "Barbell Bench Press",
    alternates: ["DB Bench Press", "Machine Chest Press", "Push-Up", "Cable Chest Press"],
    sets: 3,
    targetReps: "6-10"
  },
  {
    day: "upper",
    dayLabel: "Upper Body",
    pattern: "Vertical Pull",
    exercise: "Pull-Ups / Lat Pulldown",
    alternates: ["Assisted Pull-Up", "Cable Pulldown", "Neutral-Grip Pulldown"],
    sets: 3,
    targetReps: "8-12"
  },
  {
    day: "upper",
    dayLabel: "Upper Body",
    pattern: "Overhead Press",
    exercise: "Seated DB Shoulder Press",
    alternates: ["Machine Press", "Standing Barbell Press", "Arnold Press"],
    sets: 3,
    targetReps: "8-10"
  },
  {
    day: "upper",
    dayLabel: "Upper Body",
    pattern: "Horizontal Row",
    exercise: "Barbell Row",
    alternates: ["Seated Cable Row", "One-Arm DB Row", "Chest-Supported Row"],
    sets: 3,
    targetReps: "8-12"
  },
  {
    day: "upper",
    dayLabel: "Upper Body",
    pattern: "Triceps",
    exercise: "Triceps Pushdown",
    alternates: ["Skull Crusher", "Close-Grip Bench", "Overhead Extension"],
    sets: 3,
    targetReps: "10-12"
  },
  {
    day: "upper",
    dayLabel: "Upper Body",
    pattern: "Biceps",
    exercise: "Barbell Curl",
    alternates: ["DB Curl", "Cable Curl", "Hammer Curl", "Preacher Curl"],
    sets: 3,
    targetReps: "10-12"
  }
];

export const legs = [
  {
    day: "legs",
    dayLabel: "Legs",
    pattern: "Squat Pattern",
    exercise: "Barbell Squat",
    alternates: ["Hack Squat", "Leg Press", "Goblet Squat", "Smith Squat"],
    sets: 3,
    targetReps: "6-10"
  },
  {
    day: "legs",
    dayLabel: "Legs",
    pattern: "Hip Hinge",
    exercise: "Romanian Deadlift",
    alternates: ["DB RDL", "Hip Thrust", "Good Morning"],
    sets: 3,
    targetReps: "8-10"
  },
  {
    day: "legs",
    dayLabel: "Legs",
    pattern: "Single Leg",
    exercise: "Bulgarian Split Squat",
    alternates: ["Walking Lunge", "Step-Up", "Reverse Lunge", "Single-Leg Press"],
    sets: 3,
    targetReps: "10/leg"
  },
  {
    day: "legs",
    dayLabel: "Legs",
    pattern: "Hamstring Curl",
    exercise: "Lying Leg Curl",
    alternates: ["Seated Leg Curl", "Swiss Ball Curl", "Nordic Curl"],
    sets: 3,
    targetReps: "10-12"
  },
  {
    day: "legs",
    dayLabel: "Legs",
    pattern: "Quad Extension",
    exercise: "Leg Extension",
    alternates: ["Spanish Squat", "Wall Sit", "Terminal Knee Extension"],
    sets: 3,
    targetReps: "12-15"
  },
  {
    day: "legs",
    dayLabel: "Legs",
    pattern: "Calves",
    exercise: "Standing Calf Raise",
    alternates: ["Seated Calf Raise", "Leg Press Calf Raise", "Single-Leg Calf Raise"],
    sets: 3,
    targetReps: "15-20"
  }
];
function tuneVolume(exercises: GeneratedExercise[], settings: UserSettings): GeneratedExercise[] {
  const setAdjustment = settings.experienceLevel === "beginner" ? -1 : settings.experienceLevel === "advanced" ? 1 : 0;
  const sessionAdjustment = settings.sessionLength <= 45 ? -1 : settings.sessionLength >= 75 ? 1 : 0;
  const totalAdjustment = setAdjustment + sessionAdjustment;

  return exercises.map((exercise) => ({
    ...exercise,
    sets: Math.max(2, Math.min(4, exercise.sets + totalAdjustment))
  }));
}

function adaptEquipment(exercises: GeneratedExercise[], settings: UserSettings): GeneratedExercise[] {
  if (settings.equipmentAccess === "full_gym" || settings.equipmentAccess === "machines") return exercises;

  return exercises.map((exercise) => {
    const homeMap: Record<string, string> = {
      "Machine Chest Press": "Push-Up",
      "Leg Press or Squat": "Goblet Squat",
      "Leg Curl": "Swiss Ball Curl",
      "Lat Pulldown": "Band Pulldown",
      "Seated Row": "One-Arm DB Row",
      "Triceps Pushdown": "Close-Grip Push-Up"
    };

    const replacement = homeMap[exercise.exercise];
    if (!replacement) return exercise;

    return {
      ...exercise,
      exercise: replacement,
      alternates: Array.from(new Set([replacement, ...exercise.alternates]))
    };
  });
}

export function generateWorkoutPlan(settings: UserSettings): WorkoutPlan {
  let exercises: GeneratedExercise[];
  let split: string;
  const reasoning: string[] = [];

  if (settings.workoutsPerWeek <= 3 || settings.experienceLevel === "beginner") {
    exercises = [...full];
    split = "3-day full-body foundation";
    reasoning.push("Full-body structure selected because it gives each muscle frequent practice with manageable recovery cost.");
  } else {
    exercises = [...push, ...lower, ...pull, ...full];
    split = "4-day push/lower/pull/full-body hybrid";
    reasoning.push("4-day hybrid selected to balance hypertrophy volume, strength practice and recovery.");
  }

  if (settings.trainingEmphasis === "strength") {
    reasoning.push("Strength emphasis detected: compounds stay first and target reps stay mostly in moderate-to-heavy ranges.");
  } else if (settings.trainingEmphasis === "mobility") {
    reasoning.push("Mobility emphasis detected: full-body balance, carries and controlled ranges are preserved.");
  } else if (settings.trainingEmphasis === "fat_loss_support") {
    reasoning.push("Fat-loss support detected: recoverable volume is prioritized over excessive exercise count.");
  } else {
    reasoning.push("Aesthetic emphasis detected: plan includes pressing, pulling, lower body, delts, arms and core coverage.");
  }

  exercises = adaptEquipment(tuneVolume(exercises, settings), settings);

  if (settings.limitations.trim()) {
    reasoning.push("Limitations noted. Exercise alternates should be used when a movement aggravates discomfort.");
  }

  return {
    split,
    exercises,
    confidence: "high",
    reasoning
  };
}

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

export function getSplitPlan(settings: UserSettings): SplitPlan {
  const workoutsPerWeek = Number(settings.workoutsPerWeek) || 3;
  const experienceLevel = settings.experienceLevel;
  const trainingEmphasis = settings.trainingEmphasis;
  const equipmentAccess = settings.equipmentAccess;

  let splitName = "";
  let reasoning = "";
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

    reasoning =
      "Beginner lifters progress best with frequent full-body practice, moderate volume, and repeated exposure to core movement patterns.";
  } else if (workoutsPerWeek <= 2) {
    splitName = "Full Body x2";
    weeklySchedule = ["full", "rest", "rest", "full", "rest", "rest", "rest"];
    reasoning =
      "Two training days are best used as full-body sessions to maximize weekly muscle frequency.";
  } else if (workoutsPerWeek === 3 && trainingEmphasis === "strength") {
    splitName = "Upper / Lower / Upper";
    weeklySchedule = ["upper", "rest", "lower", "rest", "upper", "rest", "rest"];
    reasoning =
      "Strength-focused 3-day training benefits from repeated upper-body exposure with one dedicated lower-body session.";
  } else if (workoutsPerWeek === 3) {
    splitName = "Full Body x3";
    weeklySchedule = ["full", "rest", "full", "rest", "full", "rest", "rest"];
    reasoning =
      "Three full-body sessions provide strong frequency, recovery, and efficient progression for most goals.";
  } else if (workoutsPerWeek === 4 && trainingEmphasis === "strength") {
    splitName = "Upper / Lower x2";
    weeklySchedule = ["upper", "lower", "rest", "upper", "lower", "rest", "rest"];
    reasoning =
      "Upper/lower training supports strength progression with balanced weekly volume and recovery.";
  } else if (
    workoutsPerWeek === 4 &&
    (trainingEmphasis === "aesthetic" || trainingEmphasis === "fat_loss_support")
  ) {
    splitName = "Push / Pull / Lower / Full";
    weeklySchedule = ["push", "pull", "lower", "rest", "full", "rest", "rest"];
    reasoning =
      "This split balances hypertrophy volume, movement variety, recovery, and one full-body reinforcement day.";
  } else if (workoutsPerWeek === 4 && trainingEmphasis === "mobility") {
    splitName = "Full Body x4";
    weeklySchedule = ["full", "rest", "full", "rest", "full", "rest", "full"];
    reasoning =
      "Mobility-focused training benefits from frequent lower-fatigue full-body sessions instead of heavy isolated splits.";
  } else if (workoutsPerWeek === 5 && experienceLevel === "advanced") {
    splitName = "Advanced Push / Pull / Legs";
    weeklySchedule = ["push", "pull", "legs", "rest", "push", "pull", "rest"];
    reasoning =
      "Advanced lifters can handle higher weekly volume with repeated push and pull exposure plus a dedicated legs day.";
  } else if (workoutsPerWeek === 5) {
    splitName = "Intermediate Upper / Lower / Push / Pull";
    weeklySchedule = ["upper", "lower", "rest", "push", "pull", "rest", "rest"];
    reasoning =
      "Intermediate lifters get balanced frequency without overloading recovery across five available training days.";
  } else if (workoutsPerWeek >= 6) {
    splitName = "Push / Pull / Legs x2";
    weeklySchedule = ["push", "pull", "legs", "push", "pull", "legs", "rest"];
    reasoning =
      "Six training days allow a classic twice-weekly push/pull/legs structure with one full rest day.";
  }

  if (equipmentAccess === "home" || equipmentAccess === "dumbbells") {
    weeklySchedule = weeklySchedule.map((day) => (day === "legs" ? "lower" : day));
    reasoning += " Legs days are mapped to lower-body templates because home or dumbbell setups may not support isolation-machine work.";
  }

  return {
    splitName,
    weeklySchedule,
    reasoning
  };
}

export function getTodaysWorkoutType({
  splitPlan,
  workoutHistory,
  todayDate
}: {
  splitPlan: SplitPlan;
  workoutHistory: Array<{ date: string; dayType: string }>;
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
