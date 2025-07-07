import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  const arrayBuffer = await (file as Blob).arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  try {
    const result = await mammoth.extractRawText({ buffer });
    return NextResponse.json({ text: result.value });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
} 