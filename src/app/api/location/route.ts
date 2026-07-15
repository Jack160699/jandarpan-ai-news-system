import { NextRequest, NextResponse } from "next/server";
import { CG_DISTRICTS } from "@/lib/regional/districts";

export const dynamic = "force-dynamic";

const CHHATTISGARH_REGION_CODES = new Set([
  "CG",
  "CT",
  "CHHATTISGARH",
]);

function decodeHeader(value: string | null): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value).trim().toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

function districtForCity(city: string): string {
  if (!city) return "raipur";
  const match = CG_DISTRICTS.find((district) =>
    [district.name, district.slug, ...district.aliases].some((alias) =>
      city.includes(alias.toLowerCase())
    )
  );
  return match?.slug ?? "raipur";
}

export function GET(request: NextRequest) {
  const city = decodeHeader(request.headers.get("x-vercel-ip-city"));
  const country = decodeHeader(request.headers.get("x-vercel-ip-country")).toUpperCase();
  const region = decodeHeader(
    request.headers.get("x-vercel-ip-country-region")
  ).toUpperCase();
  const inChhattisgarh =
    country === "IN" && CHHATTISGARH_REGION_CODES.has(region);
  const district = inChhattisgarh ? districtForCity(city) : "raipur";

  return NextResponse.json(
    { district, source: inChhattisgarh ? "regional-ip" : "default" },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    }
  );
}
