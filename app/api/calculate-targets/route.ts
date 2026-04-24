import { NextResponse } from "next/server";

type RequestBody = {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: "male" | "female";
  lifestyle: "sedentary" | "light" | "moderate" | "active";
  goal: "recomp" | "maintain" | "lose_weight" | "be_more_active";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    const fallback = calculateFallbackTargets(body);

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        source: "fallback",
        ...fallback
      });
    }

    const prompt = `
You are a fitness nutrition coach.

Return ONLY valid JSON.

User:
- Weight: ${body.weightKg} kg
- Height: ${body.heightCm} cm
- Age: ${body.age}
- Sex: ${body.sex}
- Lifestyle: ${body.lifestyle}
- Goal: ${body.goal}

Create realistic daily targets for:
- calories
- protein grams
- carbs grams
- fats grams
- steps

Rules:
- For recomp: slight calorie deficit or near maintenance, high protein.
- For maintain: maintenance calories.
- For lose_weight: moderate deficit, not aggressive.
- For be_more_active: maintenance calories, higher steps.
- Protein should usually be 1.6-2.2g/kg.
- Fats should not be too low.
- Steps should be practical.

JSON shape:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fats": number,
  "steps": number,
  "reason": string
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
        model: "claude-3-5-haiku-latest",
        max_tokens: 600,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      return NextResponse.json({
        source: "fallback",
        ...fallback
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;

    if (!text) {
      return NextResponse.json({
        source: "fallback",
        ...fallback
      });
    }

    const parsed = JSON.parse(text);

    return NextResponse.json({
      source: "claude",
      calories: safeNumber(parsed.calories, fallback.calories),
      protein: safeNumber(parsed.protein, fallback.protein),
      carbs: safeNumber(parsed.carbs, fallback.carbs),
      fats: safeNumber(parsed.fats, fallback.fats),
      steps: safeNumber(parsed.steps, fallback.steps),
      reason: String(parsed.reason || fallback.reason)
    });
  } catch {
    return NextResponse.json(
      {
        error: "Could not calculate targets."
      },
      { status: 500 }
    );
  }
}

function calculateFallbackTargets(body: RequestBody) {
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
