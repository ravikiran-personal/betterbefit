import React from "react";
import type { FoodItem, FoodSearchResult, MealSuggestion, MealPreset } from "../../lib/app-types";
import { getLocalDateISO, formatDisplayDate } from "../../lib/utils";
import { NumericInput } from "../numeric-input";
import { SwipeToDelete } from "../swipe-to-delete";
import { Field } from "../field";

interface NutritionTabProps {
  foodTotals: { calories: number; protein: number; carbs: number; fats: number };
  targetCalories: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  todayFoodCalories: number;
  selectedNutritionDate: string;
  submitTodayNutrition: () => void;
  mealSuggestions: MealSuggestion[];
  addedMealSuggestions: Record<string, boolean>;
  addMealSuggestionToLog: (suggestion: MealSuggestion) => void;
  expandedNutritionSections: Record<string, boolean>;
  toggleNutritionSection: (section: string) => void;
  mealDraft: FoodItem;
  updateMealDraft: <K extends keyof FoodItem>(key: K, value: FoodItem[K]) => void;
  searchMealDraftSuggestions: (query: string, grams: number) => void;
  isSearchingMealDraft: boolean;
  mealDraftSuggestions: FoodSearchResult[];
  applyFoodResultToMealDraft: (result: FoodSearchResult) => void;
  mealDraftBasePer100g: { calories: number; protein: number; carbs: number; fats: number } | null;
  setMealDraft: React.Dispatch<React.SetStateAction<FoodItem>>;
  setMealDraftBasePer100g: React.Dispatch<React.SetStateAction<{ calories: number; protein: number; carbs: number; fats: number } | null>>;
  mealDraftUnit: "g" | "ml" | "oz";
  setMealDraftUnit: React.Dispatch<React.SetStateAction<"g" | "ml" | "oz">>;
  addMealDraft: () => void;
  foodsForSelectedDate: FoodItem[];
  addFood: () => void;
  deleteFood: (id: string) => void;
  updateFood: (id: string, key: keyof FoodItem, value: string | number | "") => void;
  nutritionHistory: Array<{ date: string; items: FoodItem[]; totals: { calories: number; protein: number; carbs: number; fats: number } }>;
  deleteFoodsByDate: (date: string) => void;
  mealPresets: MealPreset[];
  mealPresetName: string;
  setMealPresetName: React.Dispatch<React.SetStateAction<string>>;
  saveCurrentMealsAsPreset: () => void;
  applyMealPreset: (preset: MealPreset) => void;
  deleteMealPreset: (id: string) => void;
  baseSetup: string[];
}

function MealSuggestionsSection({
  mealSuggestions,
  addedMealSuggestions,
  onAddSuggestion
}: {
  mealSuggestions: MealSuggestion[];
  addedMealSuggestions: Record<string, boolean>;
  onAddSuggestion: (suggestion: MealSuggestion) => void;
}) {
  if (mealSuggestions.length === 0) return null;

  return (
    <section className="compact-section">
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: "#111827", fontSize: 16, fontWeight: 600 }}>
          Today&apos;s Meal Ideas
        </h2>
        <p className="small" style={{ marginTop: 4 }}>
          Based on your remaining macros
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {mealSuggestions.map((suggestion) => {
          const key = `${suggestion.meal}-${suggestion.food}`;
          const added = !!addedMealSuggestions[key];

          return (
            <div
              key={key}
              style={{
                width: 200,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                background: "#FFFFFF",
                borderRadius: 16,
                padding: 16,
                border: added ? "1px solid #059669" : "1px solid #E5E7EB"
              }}
            >
              <div style={{ color: "#9CA3AF", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                {suggestion.meal}
              </div>

              <div style={{ color: "#111827", fontSize: 14, fontWeight: 600, margin: "4px 0", lineHeight: 1.4 }}>
                {suggestion.food}
              </div>

              <div style={{ color: "#6B7280", fontSize: 12 }}>{suggestion.grams}g</div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, marginBottom: 12 }}>
                <span style={{ background: "#F3F4F6", color: "#111827", borderRadius: 999, padding: "5px 8px", fontSize: 11 }}>
                  {suggestion.calories} kcal
                </span>
                <span style={{ background: "#F3F4F6", color: "#111827", borderRadius: 999, padding: "5px 8px", fontSize: 11 }}>
                  {suggestion.protein}g protein
                </span>
              </div>

              <button
                className="btn"
                disabled={added}
                onClick={() => onAddSuggestion(suggestion)}
                style={{
                  background: added ? "#F3F4F6" : "#059669",
                  color: added ? "#9CA3AF" : "#FFFFFF",
                  borderRadius: 8,
                  padding: 8,
                  width: "100%",
                  fontSize: 13,
                  fontWeight: 600,
                  minHeight: 38,
                  marginTop: "auto"
                }}
              >
                {added ? "✓ Added" : "Add to log"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function NutritionTab({
  foodTotals,
  targetCalories,
  proteinTarget,
  carbTarget,
  fatTarget,
  todayFoodCalories,
  selectedNutritionDate,
  submitTodayNutrition,
  mealSuggestions,
  addedMealSuggestions,
  addMealSuggestionToLog,
  expandedNutritionSections,
  toggleNutritionSection,
  mealDraft,
  updateMealDraft,
  searchMealDraftSuggestions,
  isSearchingMealDraft,
  mealDraftSuggestions,
  applyFoodResultToMealDraft,
  mealDraftBasePer100g,
  setMealDraft,
  setMealDraftBasePer100g,
  mealDraftUnit,
  setMealDraftUnit,
  addMealDraft,
  foodsForSelectedDate,
  addFood,
  deleteFood,
  updateFood,
  nutritionHistory,
  deleteFoodsByDate,
  mealPresets,
  mealPresetName,
  setMealPresetName,
  saveCurrentMealsAsPreset,
  applyMealPreset,
  deleteMealPreset,
  baseSetup
}: NutritionTabProps) {
  return (
    <div className="nutrition-page compact-page">
      {/* Macro summary pills */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 4 }}>
        {([
          { label: "Calories", value: Math.round(foodTotals.calories), target: targetCalories, unit: "kcal" },
          { label: "Protein", value: Math.round(foodTotals.protein), target: proteinTarget, unit: "g" },
          { label: "Carbs", value: Math.round(foodTotals.carbs), target: carbTarget, unit: "g" },
          { label: "Fat", value: Math.round(foodTotals.fats), target: fatTarget, unit: "g" }
        ] as const).map(({ label, value, target, unit }) => {
          const pct = Math.min(100, target > 0 ? Math.round((value / target) * 100) : 0);
          const over = value > target && target > 0;
          return (
            <div key={label} style={{ background: "#FFFFFF", borderRadius: 12, padding: "10px 10px 8px", border: `1px solid ${over ? "#FDE68A" : "#E5E7EB"}`, textAlign: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: over ? "#D97706" : "#111827", margin: "3px 0 1px" }}>{value}</div>
              <div style={{ fontSize: 10, color: "#9CA3AF" }}>/ {target} {unit}</div>
              <div style={{ height: 3, background: "#E5E7EB", borderRadius: 999, marginTop: 6 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: over ? "#D97706" : "#059669", borderRadius: 999, transition: "width 300ms ease" }} />
              </div>
            </div>
          );
        })}
      </section>

      {/* Submit Food Log */}
      {todayFoodCalories > 0 && selectedNutritionDate === getLocalDateISO() ? (
        <button
          className="btn"
          style={{ width: "100%", background: "#059669", color: "#FFFFFF", fontWeight: 700, borderRadius: 12, padding: "12px 16px", marginBottom: 4 }}
          onClick={submitTodayNutrition}
        >
          Submit Food Log
        </button>
      ) : null}

      <MealSuggestionsSection
        mealSuggestions={mealSuggestions}
        addedMealSuggestions={addedMealSuggestions}
        onAddSuggestion={addMealSuggestionToLog}
      />

      <section className="compact-section">
        <button className={`collapse-pill section-pill ${expandedNutritionSections.logMeal ? "open" : ""}`} onClick={() => toggleNutritionSection("logMeal")}>
          <div>
            <strong>Log meal</strong>
            <span className="pill-subtext">Add food, grams, calories and macros</span>
          </div>
          <span className="pill-icon">{expandedNutritionSections.logMeal ? "−" : "+"}</span>
        </button>

        {expandedNutritionSections.logMeal ? (
          <div className="card nutrition-input-card compact-expanded">
            <div className="meal-log-grid">
              <Field label="Meal">
                <select className="input" value={mealDraft.meal} onChange={(e) => updateMealDraft("meal", e.target.value)}>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Snack">Snack</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Coffee">Coffee</option>
                  <option value="Pre-workout">Pre-workout</option>
                  <option value="Post-workout">Post-workout</option>
                  <option value="Custom">Custom</option>
                </select>
              </Field>

              <Field label="Food / meal">
                <div className="food-autofill">
                  <input
                    className="input"
                    value={mealDraft.food}
                    placeholder="Type food, e.g. boiled basmati rice"
                    onChange={(e) => searchMealDraftSuggestions(e.target.value, mealDraft.grams)}
                    onFocus={() => {
                      if (mealDraftSuggestions.length === 0 && mealDraft.food.trim().length >= 3) {
                        searchMealDraftSuggestions(mealDraft.food, mealDraft.grams);
                      }
                    }}
                  />
                  {isSearchingMealDraft ? (
                    <div className="food-autofill-status">Searching macros...</div>
                  ) : null}
                  {mealDraftSuggestions.length > 0 ? (
                    <div className="food-suggestion-list">
                      {mealDraftSuggestions.map((suggestion, suggestionIndex) => (
                        <button
                          type="button"
                          className="food-suggestion"
                          key={`${suggestion.food}-${suggestionIndex}`}
                          onClick={() => applyFoodResultToMealDraft(suggestion)}
                        >
                          <span>
                            <strong>{suggestion.food}</strong>
                            <small>{suggestion.source === "usda" ? "Verified data" : suggestion.source === "local" ? "Verified app data" : suggestion.source === "claude" ? "Estimated (AI)" : suggestion.source === "cache" ? "Cached result" : "Manual fallback"}</small>
                          </span>
                          <span className="food-suggestion-macros">
                            {suggestion.calories} cal | P {suggestion.protein} | C {suggestion.carbs} | F {suggestion.fats}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Field>

              <Field label="Amount">
                <div className="unit-row">
                  <NumericInput value={mealDraft.grams} onChange={(v) => {
                    const newGrams = v === "" ? 0 : v;
                    if (mealDraftBasePer100g && newGrams > 0) {
                      const f = newGrams / 100;
                      setMealDraft((prev) => ({
                        ...prev,
                        grams: newGrams,
                        calories: Math.round(mealDraftBasePer100g.calories * f),
                        protein: Math.round(mealDraftBasePer100g.protein * f * 10) / 10,
                        carbs: Math.round(mealDraftBasePer100g.carbs * f * 10) / 10,
                        fats: Math.round(mealDraftBasePer100g.fats * f * 10) / 10
                      }));
                    } else {
                      updateMealDraft("grams", newGrams);
                    }
                  }} />
                  <select className="input unit-select" value={mealDraftUnit} onChange={(e) => setMealDraftUnit(e.target.value as "g" | "ml" | "oz")}>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="oz">oz</option>
                  </select>
                </div>
              </Field>

              <Field label="Calories"><NumericInput value={mealDraft.calories} onChange={(v) => updateMealDraft("calories", v === "" ? 0 : v)} /></Field>
              <Field label="Protein"><NumericInput value={mealDraft.protein} onChange={(v) => updateMealDraft("protein", v === "" ? 0 : v)} /></Field>
              <Field label="Carbs"><NumericInput value={mealDraft.carbs} onChange={(v) => updateMealDraft("carbs", v === "" ? 0 : v)} /></Field>
              <Field label="Fat"><NumericInput value={mealDraft.fats} onChange={(v) => updateMealDraft("fats", v === "" ? 0 : v)} /></Field>

              <div className="meal-action-cell">
                <button className="btn" onClick={addMealDraft}>Add</button>
                <button className="btn secondary" onClick={() => {
                  setMealDraft({ id: "draft", date: getLocalDateISO(), meal: mealDraft.meal, food: "", grams: 100, calories: 0, protein: 0, carbs: 0, fats: 0 });
                  setMealDraftBasePer100g(null);
                }}>Clear</button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="compact-section">
        <button className={`collapse-pill section-pill ${expandedNutritionSections.loggedMeals ? "open" : ""}`} onClick={() => toggleNutritionSection("loggedMeals")}>
          <div>
            <strong>Logged meals</strong>
            <span className="pill-subtext">{foodsForSelectedDate.length} items logged for {formatDisplayDate(selectedNutritionDate)}</span>
          </div>
          <span className="pill-icon">{expandedNutritionSections.loggedMeals ? "-" : "+"}</span>
        </button>

        {expandedNutritionSections.loggedMeals ? (
          <div className="card logged-meals-card compact-expanded">
            <div className="row space-between">
              <p className="small" style={{ margin: 0 }}>Meals are grouped so you can scan quickly and expand only what you need.</p>
              <button className="btn secondary" onClick={addFood}>Add blank row</button>
            </div>

            {foodsForSelectedDate.length === 0 ? (
              <p className="small">No meals logged yet.</p>
            ) : (
              <div className="meal-group-list">
                {["Breakfast", "Lunch", "Snack", "Dinner", "Coffee", "Other"].map((mealType) => {
                  const meals = foodsForSelectedDate.filter((food) => {
                    const mealName = food.meal.trim().toLowerCase();
                    const mealAliases: Record<string, string[]> = {
                      Breakfast: ["breakfast"],
                      Lunch: ["lunch"],
                      Snack: ["snack", "snacks"],
                      Dinner: ["dinner"],
                      Coffee: ["coffee"]
                    };

                    if (mealType === "Other") {
                      return !Object.values(mealAliases).flat().some((alias) => mealName.includes(alias));
                    }

                    return (mealAliases[mealType] || [mealType.toLowerCase()]).some((alias) => mealName.includes(alias));
                  });

                  const mealTotals = meals.reduce(
                    (acc, food) => {
                      acc.calories += food.calories;
                      acc.protein += food.protein;
                      acc.carbs += food.carbs;
                      acc.fats += food.fats;
                      return acc;
                    },
                    { calories: 0, protein: 0, carbs: 0, fats: 0 }
                  );

                  const isMealOpen = !!expandedNutritionSections[`meal-${mealType}`];

                  return (
                    <div className="meal-group" key={mealType}>
                      <button
                        className={`collapse-pill meal-group-pill ${isMealOpen ? "open" : ""}`}
                        onClick={() => toggleNutritionSection(`meal-${mealType}`)}
                      >
                        <div>
                          <strong>{mealType}</strong>
                          <span className="pill-subtext">
                            {meals.length} items - {Math.round(mealTotals.calories)} cal - P {mealTotals.protein.toFixed(1)}g
                          </span>
                        </div>
                        <span className="pill-icon">{isMealOpen ? "-" : "+"}</span>
                      </button>

                      {isMealOpen ? (
                        <div className="meal-table">
                          <div className="meal-table-header">
                            <span>Food</span>
                            <span>Grams</span>
                            <span>Calories</span>
                            <span>P/C/F</span>
                          </div>

                          {meals.length === 0 ? (
                            <div className="empty-meal-row">No items logged here yet.</div>
                          ) : (
                            meals.map((item) => (
                              <SwipeToDelete
                                key={item.id}
                                className="meal-swipe"
                                onDelete={() => deleteFood(item.id)}
                              >
                                <details className="meal-row">
                                  <summary>
                                    <span>{item.food}</span>
                                    <span>{item.grams}</span>
                                    <span>{item.calories}</span>
                                    <span>{item.protein}/{item.carbs}/{item.fats}</span>
                                  </summary>

                                  <div className="meal-edit-grid">
                                    <Field label="Meal">
                                      <input className="input" value={item.meal} onChange={(e) => updateFood(item.id, "meal", e.target.value)} />
                                    </Field>
                                    <Field label="Food">
                                      <input className="input" value={item.food} onChange={(e) => updateFood(item.id, "food", e.target.value)} />
                                    </Field>
                                    <Field label="Grams">
                                      <NumericInput value={item.grams} onChange={(v) => updateFood(item.id, "grams", v)} />
                                    </Field>
                                    <Field label="Calories">
                                      <NumericInput value={item.calories} onChange={(v) => updateFood(item.id, "calories", v)} />
                                    </Field>
                                    <Field label="Protein">
                                      <NumericInput value={item.protein} onChange={(v) => updateFood(item.id, "protein", v)} />
                                    </Field>
                                    <Field label="Carbs">
                                      <NumericInput value={item.carbs} onChange={(v) => updateFood(item.id, "carbs", v)} />
                                    </Field>
                                    <Field label="Fat">
                                      <NumericInput value={item.fats} onChange={(v) => updateFood(item.id, "fats", v)} />
                                    </Field>
                                  </div>
                                </details>
                              </SwipeToDelete>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="compact-section">
        <button
          className={`collapse-pill section-pill ${expandedNutritionSections.nutritionHistory ? "open" : ""}`}
          onClick={() => toggleNutritionSection("nutritionHistory")}
        >
          <div>
            <strong>Nutrition history</strong>
            <span className="pill-subtext">{nutritionHistory.length} days logged</span>
          </div>
          <span className="pill-icon">{expandedNutritionSections.nutritionHistory ? "−" : "+"}</span>
        </button>

        {expandedNutritionSections.nutritionHistory ? (
          <div className="card compact-expanded">
            {nutritionHistory.length === 0 ? (
              <p className="small">No nutrition history yet.</p>
            ) : (
              <div className="history-card-list">
                {nutritionHistory.map((group) => (
                  <SwipeToDelete
                    key={group.date}
                    className="nutrition-history-swipe"
                    onDelete={() => deleteFoodsByDate(group.date)}
                  >
                    <div className="history-card">
                      <div>
                        <strong>{formatDisplayDate(group.date)}</strong>
                        <div className="small">
                          {group.items.length} items • {Math.round(group.totals.calories)} cal | P {group.totals.protein.toFixed(1)}g | C {group.totals.carbs.toFixed(1)}g | F {group.totals.fats.toFixed(1)}g
                        </div>
                        <div className="small" style={{ marginTop: 6, lineHeight: 1.6 }}>
                          {group.items.map((item) => `${item.meal}: ${item.food}`).join(", ")}
                        </div>
                      </div>
                    </div>
                  </SwipeToDelete>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="compact-section">
        <button className={`collapse-pill section-pill ${expandedNutritionSections.presets ? "open" : ""}`} onClick={() => toggleNutritionSection("presets")}>
          <div>
            <strong>Meal presets</strong>
            <span className="pill-subtext">{mealPresets.length} saved presets</span>
          </div>
          <span className="pill-icon">{expandedNutritionSections.presets ? "−" : "+"}</span>
        </button>

        {expandedNutritionSections.presets ? (
          <div className="grid grid-2 compact-expanded">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Full-day meal preset</h3>
              <p className="small">Save the current logged meals as a reusable full-day preset.</p>
              <div className="row">
                <input className="input" value={mealPresetName} placeholder="Preset name, e.g. Normal training day" onChange={(e) => setMealPresetName(e.target.value)} />
                <button className="btn" onClick={saveCurrentMealsAsPreset}>Save preset</button>
              </div>
            </div>
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Suggested base setup</h2>
              <div className="signal-stack">
                {baseSetup.map((item) => <div className="mini-signal" key={item}>{item}</div>)}
              </div>
            </div>
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <h2 style={{ marginTop: 0 }}>Saved full-day presets</h2>
              {mealPresets.length === 0 ? (
                <p className="small">No presets yet. Build your nutrition log, name it, then save it.</p>
              ) : (
                <div className="grid">
                  {mealPresets.map((preset) => {
                    const totals = preset.foods.reduce((acc, food) => {
                      acc.calories += food.calories;
                      acc.protein += food.protein;
                      acc.carbs += food.carbs;
                      acc.fats += food.fats;
                      return acc;
                    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

                    return (
                      <SwipeToDelete
                        key={preset.id}
                        className="preset-swipe"
                        onDelete={() => deleteMealPreset(preset.id)}
                      >
                        <div className="card" style={{ background: "#F9FAFB" }}>
                          <div className="row space-between">
                            <div>
                              <strong>{preset.name}</strong>
                              <div className="small">{Math.round(totals.calories)} cal | P {totals.protein.toFixed(1)}g | C {totals.carbs.toFixed(1)}g | F {totals.fats.toFixed(1)}g</div>
                            </div>
                            <div className="row">
                              <button className="btn" onClick={() => applyMealPreset(preset)}>Apply</button>
                            </div>
                          </div>
                        </div>
                      </SwipeToDelete>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
