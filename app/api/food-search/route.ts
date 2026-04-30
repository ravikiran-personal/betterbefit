import { NextResponse } from "next/server";

type FoodSearchRequest = {
  query: string;
  grams: number;
};

type MacroResult = {
  source: "usda" | "local" | "fallback" | "claude";
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

type LocalFood = {
  food: string;
  aliases: string[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

type AnthropicContentBlock = {
  text?: string;
};

type AnthropicResponse = {
  content?: AnthropicContentBlock[];
};

const STOP_WORDS = new Set([
  "boiled",
  "cooked",
  "raw",
  "fresh",
  "plain",
  "homemade",
  "home",
  "style",
  "with",
  "and",
  "the",
  "a",
  "an",
  "of",
  "for",
  "in",
  "to"
]);

const BRAND_WORDS = new Set([
  "amul",
  "mother",
  "dairy",
  "aavin",
  "nandini",
  "heritage",
  "milky",
  "mist"
]);

const LOCAL_FOODS: LocalFood[] = [
  { food: "Basmati rice, cooked", aliases: ["basmati rice", "boiled basmati rice", "cooked basmati rice", "steamed basmati rice"], calories: 130, protein: 2.7, carbs: 28.2, fats: 0.3 },
  { food: "Basmati rice, raw", aliases: ["raw basmati rice", "uncooked basmati rice"], calories: 360, protein: 7.1, carbs: 78, fats: 0.7 },
  { food: "White rice, cooked", aliases: ["rice", "boiled rice", "cooked rice", "steamed rice", "white rice"], calories: 130, protein: 2.4, carbs: 28.6, fats: 0.2 },
  { food: "Egg white omelette", aliases: ["egg white omelette", "egg whites omelette", "egg white omlet", "egg white omelet", "egg white scramble"], calories: 52, protein: 10.9, carbs: 0.7, fats: 0.2 },
  { food: "Egg white", aliases: ["egg white", "egg whites", "boiled egg white"], calories: 52, protein: 10.9, carbs: 0.7, fats: 0.2 },
  { food: "Whole egg", aliases: ["egg", "whole egg", "boiled egg", "omelette", "omelet"], calories: 143, protein: 12.6, carbs: 0.7, fats: 9.5 },
  { food: "Chicken breast, cooked", aliases: ["chicken breast", "grilled chicken breast", "boiled chicken breast", "cooked chicken breast"], calories: 165, protein: 31, carbs: 0, fats: 3.6 },
  { food: "Paneer", aliases: ["paneer", "cottage cheese indian", "malai paneer"], calories: 265, protein: 18.3, carbs: 1.2, fats: 20.8 },
  { food: "Curd", aliases: ["curd", "dahi", "yogurt", "plain curd"], calories: 61, protein: 3.5, carbs: 4.7, fats: 3.3 },
  { food: "Milk, toned", aliases: ["milk", "amul milk", "toned milk", "mother dairy milk", "aavin milk"], calories: 58, protein: 3.1, carbs: 4.8, fats: 3.0 },
  { food: "Idli", aliases: ["idli", "idly"], calories: 156, protein: 5, carbs: 30, fats: 1.2 },
  { food: "Dosa", aliases: ["dosa", "plain dosa"], calories: 168, protein: 3.9, carbs: 29.4, fats: 3.7 },
  { food: "Chapati", aliases: ["chapati", "roti", "phulka"], calories: 264, protein: 8.7, carbs: 55.8, fats: 1.2 },
  { food: "Dal, cooked", aliases: ["dal", "daal", "lentils", "cooked dal", "toor dal", "moong dal"], calories: 116, protein: 9, carbs: 20, fats: 0.4 },
  { food: "Sambar", aliases: ["sambar", "sambhar"], calories: 70, protein: 3.5, carbs: 10, fats: 2 },
  { food: "Banana", aliases: ["banana", "elaichi banana"], calories: 89, protein: 1.1, carbs: 22.8, fats: 0.3 },
  { food: "Apple", aliases: ["apple"], calories: 52, protein: 0.3, carbs: 13.8, fats: 0.2 },
  { food: "Filter coffee with sugar", aliases: ["filter coffee sugar", "coffee sugar", "filter coffee with sugar"], calories: 32, protein: 0.2, carbs: 7.8, fats: 0.1 },
  { food: "Filter coffee without sugar", aliases: ["filter coffee", "black coffee", "coffee no sugar", "filter coffee no sugar"], calories: 3, protein: 0, carbs: 0, fats: 0 }
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FoodSearchRequest;
    const query = String(body.query || "").trim();
    const grams = safeNumber(body.grams, 100);

    if (!query) {
      return NextResponse.json({ error: "Food search query is required." }, { status: 400 });
    }

    const normalizedQuery = normalizeText(query);
    const localResults = searchLocalFoods(query, grams);

    let usdaResults: MacroResult[] = [];
    if (process.env.USDA_API_KEY) {
      const usdaQueries = buildUsdaQueries(query);
      const batches = await Promise.all(usdaQueries.map((q) => searchUsdaResults(q, grams, normalizedQuery)));
      usdaResults = batches.flat();
    }

    const rankedUsda = usdaResults
      .map((item) => ({ item, score: relevanceScore(normalizedQuery, item.food) }))
      .filter(({ score }) => score >= 25)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);

    let suggestions = dedupeResults([...localResults, ...rankedUsda]).slice(0, 8);

    if (suggestions.length === 0) {
      const aiResult = await fallbackEstimate(query, grams);
      suggestions = [aiResult];
    }

    const best = suggestions[0];

    const response: FoodSearchResponse = {
      ...best,
      results: suggestions
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown food search error." },
      { status: 500 }
    );
  }
}

function searchLocalFoods(query: string, grams: number): MacroResult[] {
  const normalizedQuery = normalizeText(query);
  const queryTokens = getMeaningfulTokens(normalizedQuery);

  return LOCAL_FOODS
    .map((food) => {
      const bestScore = Math.max(
        ...[food.food, ...food.aliases].map((alias) => localFoodScore(queryTokens, normalizedQuery, alias))
      );
      return { food, score: bestScore };
    })
    .filter(({ score }) => score >= 60)
    .sort((a, b) => b.score - a.score)
    .map(({ food }) => scaleLocalFood(food, grams));
}

function localFoodScore(queryTokens: string[], normalizedQuery: string, alias: string): number {
  const normalizedAlias = normalizeText(alias);
  const aliasTokens = getMeaningfulTokens(normalizedAlias);

  if (!queryTokens.length || !aliasTokens.length) return 0;
  if (normalizedAlias === normalizedQuery) return 140;
  if (normalizedAlias.includes(normalizedQuery) || normalizedQuery.includes(normalizedAlias)) return 115;

  const matchedQueryTokens = queryTokens.filter((token) => aliasTokens.includes(token));
  const mustHaveTokens = getMustHaveTokens(queryTokens);
  const hasAllMustHave = mustHaveTokens.every((token) => aliasTokens.includes(token));

  if (!hasAllMustHave) return 0;

  const coverage = matchedQueryTokens.length / queryTokens.length;
  let score = Math.round(coverage * 100);

  if (matchedQueryTokens.length === queryTokens.length) score += 20;
  if (aliasTokens.length > queryTokens.length + 4) score -= 10;

  return score;
}

function scaleLocalFood(food: LocalFood, grams: number): MacroResult {
  const factor = grams / 100;
  return {
    source: "local",
    food: food.food,
    grams,
    calories: Math.round(food.calories * factor),
    protein: round1(food.protein * factor),
    carbs: round1(food.carbs * factor),
    fats: round1(food.fats * factor),
    confidence: "high",
    note: "Verified app food database"
  };
}

async function fallbackEstimate(query: string, grams: number): Promise<MacroResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const fallback: MacroResult = {
    source: "fallback",
    food: query,
    grams,
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    confidence: "low",
    note: "No reliable match found. Please enter macros manually."
  };

  if (!apiKey) return fallback;

  try {
    const prompt = `Return ONLY valid JSON for nutrition per the requested serving.

Food: ${query}
Serving: ${grams}g

Rules:
- Do not substitute the food with a different food.
- If this is Indian food or a branded Indian food, estimate the original food.
- Use realistic cooked/raw interpretation from the user's wording.
- Return numbers only for calories, protein, carbs and fats.

Output JSON shape:
{"food":"string","calories":number,"protein":number,"carbs":number,"fats":number}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 220,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!res.ok) return fallback;

    const data = (await res.json()) as AnthropicResponse;
    const text = data.content?.[0]?.text || "{}";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim()) as Partial<MacroResult>;

    return {
      source: "claude",
      food: typeof parsed.food === "string" && parsed.food.trim() ? parsed.food : query,
      grams,
      calories: safeNumber(parsed.calories, 0),
      protein: safeNumber(parsed.protein, 0),
      carbs: safeNumber(parsed.carbs, 0),
      fats: safeNumber(parsed.fats, 0),
      confidence: "medium",
      note: "AI estimated"
    };
  } catch {
    return fallback;
  }
}

async function searchUsdaResults(query: string, grams: number, originalQuery: string): Promise<MacroResult[]> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query,
      pageSize: 25,
      dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"]
    })
  });

  if (!response.ok) return [];

  const data = (await response.json()) as { foods?: Record<string, unknown>[] };
  const foods = Array.isArray(data.foods) ? data.foods : [];

  return foods
    .map((food) => convertUsdaFood(food, grams))
    .filter((item: MacroResult | null): item is MacroResult => item !== null)
    .filter((item) => isAcceptableUsdaMatch(originalQuery, item.food))
    .sort((a, b) => relevanceScore(originalQuery, b.food) - relevanceScore(originalQuery, a.food));
}

function buildUsdaQueries(query: string): string[] {
  const normalized = normalizeText(query);
  const tokens = getMeaningfulTokens(normalized);
  const queries = new Set<string>();

  queries.add(tokens.join(" "));

  if (tokens.includes("basmati") && tokens.includes("rice")) {
    queries.add("basmati rice cooked");
    queries.add("rice white cooked");
  }

  if (tokens.includes("egg") && tokens.includes("white")) {
    queries.add(tokens.includes("omelette") || tokens.includes("omelet") ? "egg white omelet" : "egg white");
  }

  if (tokens.includes("milk")) queries.add("milk whole");
  if (tokens.includes("curd") || tokens.includes("dahi") || tokens.includes("yogurt")) queries.add("yogurt plain whole milk");
  if (tokens.includes("paneer")) queries.add("paneer cheese");

  return Array.from(queries).filter(Boolean).slice(0, 4);
}

function isAcceptableUsdaMatch(originalQuery: string, name: string): boolean {
  const queryTokens = getMeaningfulTokens(originalQuery);
  const nameTokens = getMeaningfulTokens(name);
  const mustHave = getMustHaveTokens(queryTokens);

  if (!queryTokens.length || !nameTokens.length) return false;
  if (!mustHave.every((token) => nameTokens.includes(token))) return false;

  const matched = queryTokens.filter((token) => nameTokens.includes(token)).length;
  return matched >= Math.max(1, Math.ceil(queryTokens.length * 0.6));
}

function relevanceScore(query: string, name: string): number {
  const normalizedQuery = normalizeText(query);
  const normalizedName = normalizeText(name);
  const queryTokens = getMeaningfulTokens(normalizedQuery);
  const nameTokens = getMeaningfulTokens(normalizedName);

  if (!queryTokens.length || !nameTokens.length) return 0;
  if (normalizedName === normalizedQuery) return 200;
  if (normalizedName.includes(normalizedQuery)) return 170;

  const mustHave = getMustHaveTokens(queryTokens);
  if (!mustHave.every((token) => nameTokens.includes(token))) return 0;

  let score = 0;
  for (const token of queryTokens) {
    score += nameTokens.includes(token) ? 30 : -18;
  }

  if (queryTokens.includes("basmati") && nameTokens.includes("rice")) score += 35;
  if (queryTokens.includes("egg") && queryTokens.includes("white") && nameTokens.includes("egg") && nameTokens.includes("white")) score += 45;
  if ((queryTokens.includes("omelette") || queryTokens.includes("omelet")) && (nameTokens.includes("omelette") || nameTokens.includes("omelet"))) score += 25;

  const noisyPreparedFoods = ["dirty", "fried", "spanish", "casserole", "pilaf", "mix", "restaurant", "babyfood"];
  for (const noisy of noisyPreparedFoods) {
    if (normalizedName.includes(noisy) && !normalizedQuery.includes(noisy)) score -= 45;
  }

  if (nameTokens.length > queryTokens.length + 5) score -= 20;

  return score;
}

function getMustHaveTokens(tokens: string[]): string[] {
  const important = ["basmati", "rice", "egg", "white", "omelette", "omelet", "chicken", "breast", "paneer", "curd", "milk", "idli", "dosa", "dal", "sambar"];
  const mustHave = tokens.filter((token) => important.includes(token));
  return mustHave.length ? mustHave : tokens.slice(0, Math.min(tokens.length, 2));
}

function getMeaningfulTokens(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((token) => normalizeToken(token))
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token) && !BRAND_WORDS.has(token));
}

function normalizeToken(token: string): string {
  if (token === "omelet" || token === "omlet") return "omelette";
  if (token === "eggs") return "egg";
  if (token === "whites") return "white";
  if (token === "dahi") return "curd";
  if (token === "yoghurt") return "yogurt";
  if (token === "daal") return "dal";
  return token;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeResults(results: MacroResult[]): MacroResult[] {
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = normalizeText(item.food);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function convertUsdaFood(food: Record<string, unknown>, grams: number): MacroResult | null {
  const description = String(food.description || "").trim();
  if (!description) return null;

  const nutrients = Array.isArray(food.foodNutrients)
    ? (food.foodNutrients as Array<Record<string, unknown>>)
    : [];

  const calories = getNutrient(nutrients, ["Energy"]);
  const protein = getNutrient(nutrients, ["Protein"]);
  const carbs = getNutrient(nutrients, ["Carbohydrate"]);
  const fats = getNutrient(nutrients, ["Total lipid", "Fat"]);
  const factor = grams / 100;

  return {
    source: "usda",
    food: toTitleCase(description),
    grams,
    calories: Math.round(calories * factor),
    protein: round1(protein * factor),
    carbs: round1(carbs * factor),
    fats: round1(fats * factor),
    confidence: "high",
    note: "USDA data"
  };
}

function getNutrient(nutrients: Array<Record<string, unknown>>, names: string[]): number {
  const found = nutrients.find((nutrient) => {
    const nutrientName = String(nutrient.nutrientName || "").toLowerCase();
    return names.some((name) => nutrientName.includes(name.toLowerCase()));
  });

  return safeNumber(found?.value, 0);
}

function safeNumber(value: unknown, fallback: number): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}
