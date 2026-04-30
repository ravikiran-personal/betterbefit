import { NextResponse } from "next/server";

const validatedCache = new Map();

export async function POST(req: Request) {
  const { query, data } = await req.json();

  if (!query || !data) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  const key = query.toLowerCase().trim();

  validatedCache.set(key, {
    ...data,
    source: "cache",
    confidence: "high",
    note: "User validated"
  });

  return NextResponse.json({ success: true });
}
