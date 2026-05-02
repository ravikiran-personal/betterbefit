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
