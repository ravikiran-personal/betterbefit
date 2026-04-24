import { NextResponse } from "next/server";

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const cache = new Map<
  string,
  {
    timestamp: number;
    data: TargetResult;
  }
>();

type RequestBody = {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: "male" | "female";
  lifestyle: "sedentary" | "light" | "moderate" | "active";
  goal: "recomp" | "maintain" | "lose_weight" | "be_more_active";
};

type TargetResult = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  steps: number;
  reason: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody;
  const cacheKey = JSON.stringify(body);

  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      source: "cache",
      ...cached.data
    });
  }

  const fallback = calculateFallbackTargets(body);

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        source: "fallback",
        error: "ANTHROPIC_API_KEY is missing in Vercel environment variables.",
        ...fallback
      });
    }

    const prompt = `
Return ONLY valid JSON. No markdown.

Calculate realistic daily fitness targets for this user:

Weight: ${body.weightKg} kg
Height: ${body.heightCm} cm
Age: ${body.age}
Sex: ${body.sex}
Lifestyle: ${body.lifestyle}
Goal: ${body.goal}

Rules:
- For recomp: near maintenance or slight deficit, high protein.
- For maintain: maintenance calories.
- For lose_weight: moderate deficit.
- For be_more_active: maintenance calories, higher steps.
- Protein should usually be 1.6-2.2g/kg.
- Fats should not be too low.
- Steps should be practical.

Return this exact JSON shape:
{
  "calories": 2200,
  "protein": 170,
  "carbs": 220,
  "fats": 65,
  "steps": 10000,
  "reason": "short explanation"
}
`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const rawText = await response.text();

    if (!response.ok) {
      return NextResponse.json({
        source: "fallback",
        error: `Claude API failed with status ${response.status}`,
        claudeResponse: rawText,
        ...fallback
      });
    }

    const data = JSON.parse(rawText);
    const text = data.content?.[0]?.text;

    if (!text) {
      return NextResponse.json({
        source: "fallback",
        error: "Claude response did not contain text.",
        claudeResponse: data,
        ...fallback
      });
    }

    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanedText);

    const result: TargetResult = {
      calories: safeNumber(parsed.calories, fallback.calories),
      protein: safeNumber(parsed.protein, fallback.protein),
      carbs: safeNumber(parsed.carbs, fallback.carbs),
      fats: safeNumber(parsed.fats, fallback.fats),
      steps: safeNumber(parsed.steps, fallback.steps),
      reason: String(parsed.reason || "Targets calculated with Claude.")
    };

    cache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    return NextResponse.json({
      source: "claude",
      ...result
    });
  } catch (error) {
    return NextResponse.json({
      source: "fallback",
      error: error instanceof Error ? error.message : "Unknown API route error.",
      ...fallback
    });
  }
}

function calculateFallbackTargets(body: RequestBody): TargetResult {
  const bmr =
    body.sex === "male"
      ? 10 * body.weightKg + 6.25 * body.heightCm - 5 * body.age + 5
      : 10 * body.weightKg + 6.25 * body.heightCm - 5 * body.age - 161;

  const multiplier = {
    sedentary: 1.25,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
  }[body.lifestyle];

  const maintenance = bmr * multiplier;

  let calories = maintenance;
  let steps = 8000;

  if (body.goal === "recomp") {
    calories = maintenance - 150;
    steps = 10000;
  }

  if (body.goal === "maintain") {
    calories = maintenance;
    steps = 8000;
  }

  if (body.goal === "lose_weight") {
    calories = maintenance - 400;
    steps = 10000;
  }

  if (body.goal === "be_more_active") {
    calories = maintenance;
    steps = 12000;
  }

  const protein = body.weightKg * 1.9;
  const fats = body.weightKg * 0.7;
  const carbs = (calories - protein * 4 - fats * 9) / 4;

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fats: Math.round(fats),
    steps,
    reason: "Calculated using fallback fitness formula."
  };
}

function safeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value)
    : fallback;
}
