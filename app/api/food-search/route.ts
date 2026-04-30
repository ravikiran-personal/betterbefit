import { NextResponse } from "next/server";

const CACHE_DURATION = 24 * 60 * 60 * 1000;

type FoodSearchRequest = {
  query: string;
  grams: number;
};

type MacroResult = {
  source: "usda" | "cache" | "fallback";
  food: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidence: "high" | "medium" | "low";
  note: string;
};

type FoodSearchResponse = MacroResult & {
  results: MacroResult[];
};

const cache = new Map<string, { timestamp: number; data: FoodSearchResponse }>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FoodSearchRequest;
    const query = String(body.query || "").trim();
    const grams = safeNumber(body.grams, 100);

    if (!query) {
      return NextResponse.json({ error: "Food search query is required." }, { status: 400 });
    }

    const cacheKey = JSON.stringify({ query: normalizeText(query), grams });
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        ...cached.data,
        source: "cache",
        results: cached.data.results.map((item) => ({ ...item, source: "cache" }))
      });
    }

    const usdaResults = await searchUsdaResults(query, grams);
    const relevantResults = usdaResults.filter((item) => isRelevantFood(query, item.food));
    const looseResults = usdaResults.filter((item) => isLooseFoodMatch(query, item.food));

    const suggestions = dedupeResults([...relevantResults, ...looseResults]).slice(0, 6);

    const best =
      suggestions[0] ||
      ({
        source: "fallback",
        food: query,
        grams,
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        confidence: "low",
        note: "No reliable match found. Please enter macros manually."
      } satisfies MacroResult);

    const response: FoodSearchResponse = {
      ...best,
      results: suggestions
    };

    cache.set(cacheKey, { timestamp: Date.now(), data: response });
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown food search error." },
      { status: 500 }
    );
  }
}

async function searchUsdaResults(query: string, grams: number): Promise<MacroResult[]> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query,
      pageSize: 15,
      dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"]
    })
  });

  if (!response.ok) return [];

  const data = await response.json();
  const foods = Array.isArray(data.foods) ? data.foods : [];

  return foods
    .map((food: Record<string, unknown>) => convertUsdaFood(food, query, grams))
    .filter((item: MacroResult | null): item is MacroResult => item !== null)
    .sort((a: MacroResult, b: MacroResult) =>    relevanceScore(query, b.food) - relevanceScore(query, a.food) );
}

function convertUsdaFood(food: Record<string, unknown>, query: string, grams: number): MacroResult | null {
  const description = String(food.description || "").trim();
  if (!description) return null;

  const nutrients = Array.isArray(food.foodNutrients) ? (food.foodNutrients as Array<Record<string, unknown>>) : [];

  const caloriesPer100 = getNutrient(nutrients, ["Energy"], ["208"]);
  const proteinPer100 = getNutrient(nutrients, ["Protein"], ["203"]);
  const carbsPer100 = getNutrient(nutrients, ["Carbohydrate, by difference", "Carbohydrate"], ["205"]);
  const fatsPer100 = getNutrient(nutrients, ["Total lipid (fat)", "Total fat"], ["204"]);

  const multiplier = grams / 100;

  return {
    source: "usda",
    food: description || query,
    grams,
    calories: Math.round(caloriesPer100 * multiplier),
    protein: round1(proteinPer100 * multiplier),
    carbs: round1(carbsPer100 * multiplier),
    fats: round1(fatsPer100 * multiplier),
    confidence: isRelevantFood(query, description) ? "high" : "medium",
    note: "Calculated from USDA FoodData Central and cached for 24 hours."
  };
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getImportantWords(value: string) {
  const stopWords = new Set([
    "and",
    "with",
    "the",
    "a",
    "an",
    "of",
    "style",
    "fresh",
    "plain",
    "cooked",
    "boiled",
    "steamed",
    "raw",
    "white"
  ]);

  return normalizeText(value)
    .split(" ")
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function isRelevantFood(query: string, name: string) {
  const q = normalizeText(query);
  const n = normalizeText(name);
  const importantWords = getImportantWords(query);

  if (!importantWords.length) return n.includes(q);

  const riceQuery = importantWords.includes("rice") || q.includes("basmati");
  const riceName = n.includes("rice") || n.includes("basmati");

  if (riceQuery && !riceName) return false;

  return importantWords.every((word) => n.includes(word));
}

function isLooseFoodMatch(query: string, name: string) {
  const q = normalizeText(query);
  const n = normalizeText(name);
  const importantWords = getImportantWords(query);

  if (!importantWords.length) return n.includes(q) || q.includes(n);

  const riceQuery = importantWords.includes("rice") || q.includes("basmati");
  const riceName = n.includes("rice") || n.includes("basmati");

  if (riceQuery && !riceName) return false;

  return importantWords.some((word) => n.includes(word));
}

function relevanceScore(query: string, name: string) {
  const q = normalizeText(query);
  const n = normalizeText(name);
  const importantWords = getImportantWords(query);

  let score = 0;

  if (n === q) score += 100;
  if (n.includes(q)) score += 50;

  for (const word of importantWords) {
    if (n.includes(word)) score += 10;
  }

  if (q.includes("boiled") || q.includes("cooked") || q.includes("steamed")) {
    if (n.includes("cooked") || n.includes("boiled") || n.includes("steamed")) score += 15;
  }

  if (q.includes("basmati") && n.includes("basmati")) score += 20;
  if (q.includes("rice") && !n.includes("rice")) score -= 100;

  return score;
}

function dedupeResults(results: MacroResult[]) {
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = normalizeText(item.food);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
