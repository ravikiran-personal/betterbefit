import { getWeeklyNutritionAdjustment } from "../lib/fitness-engine/intelligence";

function makeLog(overrides: { weight?: number; steps?: number; calories?: number; protein?: number; waist?: number } = {}) {
  return {
    date: "2025-01-01",
    weight: overrides.weight ?? "",
    steps: overrides.steps ?? "",
    calories: overrides.calories ?? "",
    protein: overrides.protein ?? "",
    waist: overrides.waist ?? ""
  };
}

function makeNutritionDay(calories: number, protein: number, date = "2025-01-01") {
  return { date, calories, protein };
}

const baseSettings = {
  goal: "recomp" as const,
  targetCalories: 2000,
  proteinTarget: 150,
  stepTarget: 10000
};

describe("getWeeklyNutritionAdjustment", () => {
  test("returns low-confidence hold when fewer than 3 nutrition days logged", () => {
    const result = getWeeklyNutritionAdjustment({
      settings: baseSettings,
      dailyLogs: [makeLog({ weight: 75, steps: 10000 })],
      nutritionDays: [makeNutritionDay(2000, 150)],
      workoutCompletion: 80
    });
    expect(result.calorieDelta).toBe(0);
    expect(result.confidence).toBe("low");
  });

  test("warns about protein before calories when protein is < 85% of target", () => {
    const nutritionDays = [1, 2, 3, 4].map((d) =>
      makeNutritionDay(2000, 100, `2025-01-0${d}`)
    );
    const result = getWeeklyNutritionAdjustment({
      settings: baseSettings,
      dailyLogs: [makeLog({ steps: 10000, weight: 75 })],
      nutritionDays,
      workoutCompletion: 80
    });
    expect(result.calorieDelta).toBe(0);
    expect(result.tone).toBe("warn");
    expect(result.title).toMatch(/protein/i);
  });

  test("warns about steps when steps are < 85% of target", () => {
    const nutritionDays = [1, 2, 3, 4].map((d) =>
      makeNutritionDay(2000, 160, `2025-01-0${d}`)
    );
    const logs = [1, 2, 3, 4].map((d) => ({
      ...makeLog({ weight: 75, steps: 5000, protein: 160, calories: 2000 }),
      date: `2025-01-0${d}`
    }));
    const result = getWeeklyNutritionAdjustment({
      settings: baseSettings,
      dailyLogs: logs,
      nutritionDays,
      workoutCompletion: 80
    });
    expect(result.calorieDelta).toBe(0);
    expect(result.title).toMatch(/steps/i);
  });

  test("holds calories when workout completion is below 50%", () => {
    const nutritionDays = [1, 2, 3, 4].map((d) =>
      makeNutritionDay(2000, 160, `2025-01-0${d}`)
    );
    const result = getWeeklyNutritionAdjustment({
      settings: baseSettings,
      dailyLogs: [makeLog({ steps: 12000, weight: 75 })],
      nutritionDays,
      workoutCompletion: 30
    });
    expect(result.calorieDelta).toBe(0);
    expect(result.tone).toBe("warn");
  });

  test("suggests +100 cal when weight drops faster than 0.8kg", () => {
    const nutritionDays = [1, 2, 3, 4].map((d) =>
      makeNutritionDay(2000, 160, `2025-01-0${d}`)
    );
    const logs = [
      { ...makeLog({ weight: 76, steps: 10000, protein: 160, calories: 2000 }), date: "2025-01-01" },
      { ...makeLog({ weight: 75, steps: 10000, protein: 160, calories: 2000 }), date: "2025-01-02" },
      { ...makeLog({ weight: 74.5, steps: 10000, protein: 160, calories: 2000 }), date: "2025-01-03" },
      { ...makeLog({ weight: 74.9, steps: 10000, protein: 160, calories: 2000 }), date: "2025-01-04" }
    ];
    const result = getWeeklyNutritionAdjustment({
      settings: baseSettings,
      dailyLogs: logs,
      nutritionDays,
      workoutCompletion: 70
    });
    expect(result.calorieDelta).toBe(100);
  });

  test("recomp: holds with good pattern (stable weight, waist down)", () => {
    const nutritionDays = [1, 2, 3, 4].map((d) =>
      makeNutritionDay(2000, 160, `2025-01-0${d}`)
    );
    const logs = [
      { ...makeLog({ weight: 75, steps: 10000, protein: 160, calories: 2000, waist: 82 }), date: "2025-01-01" },
      { ...makeLog({ weight: 75, steps: 10000, protein: 160, calories: 2000, waist: 81.5 }), date: "2025-01-02" },
      { ...makeLog({ weight: 75.2, steps: 10000, protein: 160, calories: 2000, waist: 81 }), date: "2025-01-03" },
      { ...makeLog({ weight: 74.9, steps: 10000, protein: 160, calories: 2000, waist: 80.5 }), date: "2025-01-04" }
    ];
    const result = getWeeklyNutritionAdjustment({
      settings: baseSettings,
      dailyLogs: logs,
      nutritionDays,
      workoutCompletion: 70
    });
    expect(result.calorieDelta).toBe(0);
    expect(result.tone).toBe("good");
  });

  test("lose_weight: suggests -100 when weight is stable and waist is flat", () => {
    const settings = { ...baseSettings, goal: "lose_weight" as const };
    const nutritionDays = [1, 2, 3, 4].map((d) =>
      makeNutritionDay(2000, 160, `2025-01-0${d}`)
    );
    const logs = [
      { ...makeLog({ weight: 80, steps: 10000, protein: 160, calories: 2000, waist: 90 }), date: "2025-01-01" },
      { ...makeLog({ weight: 80.1, steps: 10000, protein: 160, calories: 2000, waist: 90.1 }), date: "2025-01-02" },
      { ...makeLog({ weight: 79.9, steps: 10000, protein: 160, calories: 2000, waist: 89.9 }), date: "2025-01-03" },
      { ...makeLog({ weight: 80, steps: 10000, protein: 160, calories: 2000, waist: 90 }), date: "2025-01-04" }
    ];
    const result = getWeeklyNutritionAdjustment({
      settings,
      dailyLogs: logs,
      nutritionDays,
      workoutCompletion: 70
    });
    expect(result.calorieDelta).toBe(-100);
  });

  test("always returns a string title and summary", () => {
    const result = getWeeklyNutritionAdjustment({
      settings: baseSettings,
      dailyLogs: [],
      nutritionDays: [],
      workoutCompletion: 80
    });
    expect(typeof result.title).toBe("string");
    expect(typeof result.summary).toBe("string");
    expect(result.title.length).toBeGreaterThan(0);
  });
});
