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

/* ---------------- LOCAL DB ---------------- */

const LOCAL_FOODS = [
  {
    food: "Basmati rice, cooked",
    aliases: ["basmati rice", "boiled basmati rice", "cooked basmati rice"],
    calories: 130,
    protein: 2.7,
    carbs: 28,
    fats: 0.3
  },
  {
    food: "Egg white omelette",
    aliases: ["egg white omelette", "egg white omelet", "egg white"],
    calories: 52,
    protein: 10.9,
    carbs: 0.7,
    fats: 0.2
  }
];

/* ---------------- MAIN API ---------------- */

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FoodSearchRequest;
    const query = String(body.query || "").toLowerCase().trim();
    const grams = Number(body.grams) || 100;

    if (!query) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    /* -------- STEP 1: LOCAL MATCH (STRONG PRIORITY) -------- */

    let localMatches: MacroResult[] = [];

    for (const food of LOCAL_FOODS) {
      for (const alias of food.aliases) {
        if (query.includes(alias) || alias.includes(query)) {
          const factor = grams / 100;

          localMatches.push({
            source: "local",
            food: food.food,
            grams,
            calories: Math.round(food.calories * factor),
            protein: +(food.protein * factor).toFixed(1),
            carbs: +(food.carbs * factor).toFixed(1),
            fats: +(food.fats * factor).toFixed(1),
            confidence: "high",
            note: "Local database"
          });
        }
      }
    }

    if (localMatches.length > 0) {
      return NextResponse.json({
        ...localMatches[0],
        results: localMatches
      });
    }

    /* -------- STEP 2: USDA FALLBACK -------- */

    let usdaResults: MacroResult[] = [];

    if (process.env.USDA_API_KEY) {
      const res = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${process.env.USDA_API_KEY}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query, pageSize: 5 })
        }
      );

      if (res.ok) {
        const data = await res.json();

        usdaResults =
          data.foods?.map((f: any) => {
            const nutrients = f.foodNutrients || [];

            const get = (name: string) =>
              nutrients.find((n: any) =>
                n.nutrientName?.toLowerCase().includes(name)
              )?.value || 0;

            const factor = grams / 100;

            return {
              source: "usda",
              food: f.description,
              grams,
              calories: Math.round(get("energy") * factor),
              protein: +(get("protein") * factor).toFixed(1),
              carbs: +(get("carbohydrate") * factor).toFixed(1),
              fats: +(get("fat") * factor).toFixed(1),
              confidence: "high",
              note: "USDA"
            };
          }) || [];
      }
    }

    if (usdaResults.length > 0) {
      return NextResponse.json({
        ...usdaResults[0],
        results: usdaResults
      });
    }

    /* -------- STEP 3: FAILSAFE -------- */

    return NextResponse.json({
      source: "fallback",
      food: query,
      grams,
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      confidence: "low",
      note: "No match found",
      results: []
    });

  } catch (err) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
