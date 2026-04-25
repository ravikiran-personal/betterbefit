import { NextResponse } from "next/server";

const CACHE_DURATION = 24 * 60 * 60 * 1000;

type FoodSearchRequest = {
  query: string;
  grams: number;
};

type MacroResult = {
  source: "usda" | "claude" | "fallback";
  food: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: "high" | "medium" | "low";
  note: string;
};

const cache = new Map<string, { timestamp: number; data: MacroResult }>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FoodSearchRequest;
    const query = String(body.query || "").trim();
    const grams = safeNumber(body.grams, 100);

    if (!query) {
      return NextResponse.json({ error: "Food search query is required." }, { status: 400 });
    }

    const cacheKey = JSON.stringify({ query: query.toLowerCase(), grams });
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ source: "cache", ...cached.data });
    }

    const usdaResult = await searchUsda(query, grams);

    if (usdaResult && shouldUseUsda(query)) {
      cache.set(cacheKey, { timestamp: Date.now(), data: usdaResult });
      return NextResponse.json(usdaResult);
    }

    const claudeResult = await estimateWithClaude(query, grams, usdaResult);

    const result =
      claudeResult ||
      usdaResult ||
      ({
        source: "fallback",
        food: query,
        grams,
        calories: Math.round(grams * 1.5),
        protein: 0,
        carbs: 0,
        fats: 0,
        confidence: "low",
        note: "Fallback estimate only. Could not find reliable nutrition data."
      } satisfies MacroResult);

    cache.set(cacheKey, { timestamp: Date.now(), data: result });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown food search error." },
      { status: 500 }
    );
  }
}

function shouldUseUsda(query: string) {
  const lower = query.toLowerCase();

  const mixedMealWords = [
    "biryani",
    "dosa",
    "idli",
    "sambar",
    "chutney",
    "parotta",
    "paratha",
    "chapati",
    "roti",
    "paneer",
    "curd rice",
    "fried rice",
    "meals",
    "thali",
    "curry",
    "gravy",
    "masala",
    "korma",
    "tikka",
    "naan",
    "pongal",
    "upma",
    "poha"
  ];

  return !mixedMealWords.some((word) => lower.includes(word));
}

async function searchUsda(query: string, grams: number): Promise<MacroResult | null> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query,
      pageSize: 5,
      dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"]
    })
  });

  if (!response.ok) return null;

  const data = await response.json();
  const food = data.foods?.[0];
  if (!food) return null;

  const nutrients = food.foodNutrients || [];

  const caloriesPer100 = getNutrient(nutrients, ["Energy"], ["208"]);
  const proteinPer100 = getNutrient(nutrients, ["Protein"], ["203"]);
  const carbsPer100 = getNutrient(nutrients, ["Carbohydrate, by difference", "Carbohydrate"], ["205"]);
  const fatsPer100 = getNutrient(nutrients, ["Total lipid (fat)", "Total fat"], ["204"]);

  const multiplier = grams / 100;

  return {
    source: "usda",
    food: food.description || query,
    grams,
    calories: Math.round(caloriesPer100 * multiplier),
    protein: round1(proteinPer100 * multiplier),
    carbs: round1(carbsPer100 * multiplier),
    fats: round1(fatsPer100 * multiplier),
    confidence: "high",
    note: "Calculated from USDA FoodData Central per-100g nutrients."
  };
}

async function estimateWithClaude(
  query: string,
  grams: number,
  usdaResult: MacroResult | null
): Promise<MacroResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const prompt = `
Return ONLY valid JSON. No markdown.

Estimate nutrition for this food:
Food: ${query}
Serving size: ${grams} grams

Context:
- User may enter Indian foods, restaurant-style dishes, or mixed meals.
- Use typical cooked food assumptions.
- If USDA data is available below, use it as a reference but adjust if the query is a mixed Indian dish.

USDA reference:
${usdaResult ? JSON.stringify(usdaResult) : "None"}

Return this exact JSON shape:
{
  "food": "clean food name",
  "grams": ${grams},
  "calories": 500,
  "protein": 25,
  "carbs": 60,
  "fats": 15,
  "confidence": "high | medium | low",
  "note": "short explanation"
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
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) return null;

  const raw = await response.json();
  const text = raw.content?.[0]?.text;
  if (!text) return null;

  const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleanedText);

  return {
    source: "claude",
    food: String(parsed.food || query),
    grams,
    calories: Math.round(safeNumber(parsed.calories, 0)),
    protein: round1(safeNumber(parsed.protein, 0)),
    carbs: round1(safeNumber(parsed.carbs, 0)),
    fats: round1(safeNumber(parsed.fats, 0)),
    confidence: normalizeConfidence(parsed.confidence),
    note: String(parsed.note || "Estimated with Claude.")
  };
}

function getNutrient(
  nutrients: Array<Record<string, unknown>>,
  names: string[],
  numbers: string[]
) {
  const match = nutrients.find((nutrient) => {
    const nutrientName = String(nutrient.nutrientName || "").toLowerCase();
    const nutrientNumber = String(nutrient.nutrientNumber || "");

    return (
      names.some((name) => nutrientName.includes(name.toLowerCase())) ||
      numbers.includes(nutrientNumber)
    );
  });

  return safeNumber(match?.value, 0);
}

function safeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeConfidence(value: unknown): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}
