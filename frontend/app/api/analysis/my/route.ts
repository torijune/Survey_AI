import { NextRequest, NextResponse } from "next/server";
// import { db } from "@/lib/db";
// import { analysisResults } from "@/lib/db/schema/analysis_results";
// import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ results: [] });
  }
  
  // 임시로 빈 결과 반환 (데이터베이스 설정 완료 후 주석 해제)
  return NextResponse.json({ results: [] });
  
  // const results = await db
  //   .select({
  //     id: analysisResults.id,
  //     fileName: analysisResults.fileName,
  //     summary: analysisResults.summary,
  //     createdAt: analysisResults.createdAt,
  //   })
  //   .from(analysisResults)
  //   .where(eq(analysisResults.userId, userId))
  //   .orderBy(analysisResults.createdAt);
  // return NextResponse.json({ results });
} 