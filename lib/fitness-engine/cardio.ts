import type { CardioPlan, UserSettings } from "./types";

export function generateCardioPlan(settings: UserSettings): CardioPlan {
  const sessions: string[] = [];
  const reasoning: string[] = [];
  const stepGap = Math.max(0, settings.stepTarget - settings.currentStepBaseline);

  let weeklyMinutes = 90;

  if (settings.goal === "lose_weight") {
    weeklyMinutes = 150;
    sessions.push("3 x 30-40 min Zone 2 walks or cycling sessions");
    sessions.push("Add 2 short post-meal walks on non-lifting days");
    reasoning.push("Fat-loss goal detected, so weekly Zone 2 cardio is increased before making calories overly aggressive.");
  } else if (settings.goal === "recomp") {
    weeklyMinutes = 100;
    sessions.push("2 x 25-35 min easy Zone 2 sessions");
    sessions.push("Keep cardio conversational so it does not interfere with lifting progression");
    reasoning.push("Recomp goal detected, so cardio is kept moderate to support health and calorie expenditure without compromising strength.");
  } else if (settings.goal === "be_more_active") {
    weeklyMinutes = 120;
    sessions.push("Daily 10-20 min walk after one meal");
    sessions.push("1 longer 40-60 min weekend walk");
    reasoning.push("Activity-building goal detected, so walking consistency is prioritized over intense cardio.");
  } else {
    weeklyMinutes = 90;
    sessions.push("2 x 25-30 min Zone 2 sessions weekly");
    sessions.push("Use easy walking on rest days for recovery");
    reasoning.push("Maintenance goal detected, so cardio supports health and recovery rather than aggressive calorie burn.");
  }

  if (settings.experienceLevel === "beginner") {
    sessions.unshift("Start with walking first; avoid hard intervals for the first 4 weeks");
    reasoning.push("Beginner status detected, so low-impact cardio is preferred while joints and recovery adapt.");
  }

  if (stepGap > 3000) {
    sessions.unshift("Increase daily steps by 1000-1500 per week until target feels normal");
    reasoning.push("Large step gap detected, so NEAT progression is prioritized before adding intense cardio.");
  }

  if (settings.workoutsPerWeek >= 4 && settings.trainingEmphasis === "strength") {
    weeklyMinutes = Math.min(weeklyMinutes, 110);
    reasoning.push("Strength emphasis with 4 training days detected, so cardio volume is capped to protect performance.");
  }

  return {
    weeklyMinutes,
    sessions: sessions.slice(0, 5),
    confidence: "high",
    reasoning
  };
}
