import { NextRequest, NextResponse } from "next/server";
import { isFuelCitySlug, isRateCategory } from "@/lib/verified-rates";
import { buildVerifiedRatesCsv } from "@/lib/verified-rates/dataset";
import type { RateCategory } from "@/lib/verified-rates/types";

export const runtime = "nodejs";

/**
 * Citation-friendly CSV export — only when enough verified history exists.
 * Does not expose provider URLs or credentials.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const categoryRaw = (sp.get("category") ?? "").trim().toLowerCase();
  const cityRaw = (sp.get("city") ?? "").trim().toLowerCase();

  if (!isRateCategory(categoryRaw)) {
    return NextResponse.json({ status: "unavailable", error: "invalid_category" }, { status: 400 });
  }
  const citySlug = cityRaw ? cityRaw : null;
  if (citySlug && !isFuelCitySlug(citySlug)) {
    return NextResponse.json({ status: "unavailable", error: "invalid_city" }, { status: 400 });
  }

  const result = await buildVerifiedRatesCsv({
    category: categoryRaw as RateCategory,
    citySlug,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        status: "unavailable",
        reason: result.reason,
        messageHi: "डेटा संग्रह जारी है — पर्याप्त सत्यापित इतिहास उपलब्ध होने पर CSV खुलेगा।",
      },
      { status: 404 }
    );
  }

  const filename = `jandarpan-${categoryRaw}${citySlug ? `-${citySlug}` : ""}-verified-rates.csv`;
  return new NextResponse(result.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, s-maxage=600",
    },
  });
}
