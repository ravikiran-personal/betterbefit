import { NextResponse } from "next/server";

// Client-side food caching is handled via localStorage (see addMealDraft in page.tsx).
// This endpoint exists for future server-side persistence integration.
// On serverless deployments, in-memory state does not persist between invocations.
export async function POST() {
  return NextResponse.json({ success: true });
}
