import { NextResponse } from "next/server";

const CACHE_DURATION = 24 * 60 * 60 * 1000;

type FoodSearchRequest = {
  query: string;
  grams: number;
};

type MacroResult = {
  source: "usda" | "cache" | "fallback" | "claude";
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

const validatedCache = new Map<string, MacroResult>();
export async function POST(request: Request) {

if (validatedCache.has(normalizedQuery)) {
  const result = validatedCache.get(normalizedQuery)!;

  return NextResponse.json({
    ...result,
    source: "cache",
    results: [result]
  });
}
  
  try {
    const body = (await request.json()) as FoodSearchRequest;
    const query = String(body.query || "").trim();
    const grams = safeNumber(body.grams, 100);

    if (!query) {
      return NextResponse.json({ error: "Food search query is required." }, { status: 400 });
    }

    const normalizedQuery = normalizeIndianFood(query);
    const normalizedQuery = normalizeText(query);


    const cacheKey = JSON.stringify({
      query: normalizeText(normalizedQuery),
      grams
    });

    const usdaResults = await searchUsdaResults(normalizedQuery, grams);

    const relevantResults = usdaResults.filter((item) =>
      isRelevantFood(query, item.food)
    );

    const looseResults = usdaResults.filter((item) =>
      isLooseFoodMatch(query, item.food)
    );

    const suggestions = dedupeResults([
      ...relevantResults,
      ...looseResults
    ]).slice(0, 6);

    let best: MacroResult | undefined = suggestions[0];  // fallback to ANY USDA result before AI 
    if (!best && usdaResults.length > 0) {   best = usdaResults[0]; }

    // ✅ AI fallback ONLY if nothing found
    if (!best) {
      best = await fallbackEstimate(query, grams);
    }

    if (!best) {
  best = await fallbackEstimate(query, grams);
}

    const finalSuggestions = suggestions.length ? suggestions : [best];

    const response: FoodSearchResponse = {
      ...best,
      results: finalSuggestions
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

/* =========================
   AI FALLBACK (SAFE)
========================= */
async function fallbackEstimate(query: string, grams: number): Promise<MacroResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      source: "fallback",
      food: query,
      grams,
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      confidence: "low",
      note: "No data found."
    };
  }

  try {
    const prompt = `
Return ONLY JSON.

Food: ${query}
Serving: ${grams}g

Rules:
- Do NOT change food name
- Do NOT substitute food
- If Indian food, estimate correctly

Output:
{
  "food": "...",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fats": number
}
`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!res.ok) throw new Error();

    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";

    let parsed: any;

    try {
      parsed = JSON.parse(text.replace(/```json|```/g, ""));
    } catch {
      throw new Error();
    }

    return {
      source: "claude",
      food: parsed.food || query,
      grams,
      calories: Number(parsed.calories) || 0,
      protein: Number(parsed.protein) || 0,
      carbs: Number(parsed.carbs) || 0,
      fats: Number(parsed.fats) || 0,
      confidence: "medium",
      note: "AI estimated"
    };
  } catch {
    return {
      source: "fallback",
      food: query,
      grams,
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      confidence: "low",
      note: "Fallback used"
    };
  }
}

/* =========================
   USDA SEARCH
========================= */
async function searchUsdaResults(query: string, grams: number): Promise<MacroResult[]> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query,
        pageSize: 15,
        dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"]
      })
    }
  );

  if (!response.ok) return [];

  const data = await response.json();
  const foods = Array.isArray(data.foods) ? data.foods : [];

  return foods
    .map((food: Record<string, unknown>) =>
      convertUsdaFood(food, query, grams)
    )
    .filter((item: MacroResult | null): item is MacroResult => item !== null)
    .sort(
      (a: MacroResult, b: MacroResult) =>
        relevanceScore(query, b.food) - relevanceScore(query, a.food)
    );
}

/* =========================
   HELPERS
========================= */

function normalizeIndianFood(query: string) {
  const q = query.toLowerCase().trim();

  // remove brand names only
  return q
    .replace("amul", "")
    .replace("mother dairy", "")
    .replace("aavin", "")
    .trim();
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getImportantWords(value: string) {
  const stopWords = new Set(["and", "with", "the", "a", "an", "of"]);
  return normalizeText(value)
    .split(" ")
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function isRelevantFood(query: string, name: string) {
  const qWords = getImportantWords(query);
  const n = normalizeText(name);

  if (!qWords.length) return n.includes(normalizeText(query));

  const matches = qWords.filter((word) => n.includes(word)).length;

  // require strong match but not perfect
  return matches >= qWords.length - 1;
}

function isLooseFoodMatch(query: string, name: string) {
  const qWords = getImportantWords(query);
  const n = normalizeText(name);

  if (!qWords.length) return false;

  const matches = qWords.filter((word) => n.includes(word)).length;

  // relaxed fallback (was too strict earlier)
  return matches >= 1;
}

function relevanceScore(query: string, name: string) {
  const qWords = getImportantWords(query);
  const n = normalizeText(name);

  let score = 0;

  for (const word of qWords) {
    if (n.includes(word)) score += 20;
    else score -= 20;
  }

  // exact match boost
  if (n === normalizeText(query)) score += 100;

  // strong penalty for extra noise words
  const nameWords = n.split(" ");
  if (nameWords.length > qWords.length + 3) score -= 15;

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

function convertUsdaFood(
  food: Record<string, unknown>,
  query: string,
  grams: number
): MacroResult | null {
  const description = String(food.description || "").trim();
  if (!description) return null;

  const nutrients = Array.isArray(food.foodNutrients)
    ? (food.foodNutrients as Array<Record<string, unknown>>)
    : [];

  const calories = getNutrient(nutrients, "Energy");
  const protein = getNutrient(nutrients, "Protein");
  const carbs = getNutrient(nutrients, "Carbohydrate");
  const fats = getNutrient(nutrients, "Fat");

  const factor = grams / 100;

  return {
    source: "usda",
    food: description,
    grams,
    calories: Math.round(calories * factor),
    protein: round1(protein * factor),
    carbs: round1(carbs * factor),
    fats: round1(fats * factor),
    confidence: "high",
    note: "USDA data"
  };
}

function getNutrient(nutrients: any[], name: string) {
  const found = nutrients.find((n) =>
    String(n.nutrientName || "").toLowerCase().includes(name.toLowerCase())
  );
  return Number(found?.value) || 0;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function safeNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}
