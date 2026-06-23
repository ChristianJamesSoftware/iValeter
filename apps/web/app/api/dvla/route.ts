import { NextRequest, NextResponse } from "next/server";

interface DVLAResponse {
  make?: string;
  colour?: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { registrationNumber?: string };
  const reg = body.registrationNumber?.replace(/\s/g, "").toUpperCase();

  if (!reg || reg.length < 2) {
    return NextResponse.json({ error: "Invalid registration" }, { status: 400 });
  }

  const apiKey = process.env.DVLA_API_KEY;

  if (!apiKey) {
    // Mock data for demo — keyed by first 2 chars of reg
    const mocks: Record<string, { make: string; model: string; colour: string }> = {
      MK: { make: "VOLKSWAGEN", model: "GOLF", colour: "SILVER" },
      LS: { make: "BMW", model: "3 SERIES", colour: "BLACK" },
      BK: { make: "FORD", model: "FOCUS", colour: "WHITE" },
      PE: { make: "AUDI", model: "A4", colour: "GREY" },
    };
    const key = reg.slice(0, 2);
    const mock = mocks[key] ?? { make: "TOYOTA", model: "COROLLA", colour: "BLUE" };
    return NextResponse.json(mock);
  }

  try {
    const res = await fetch(
      "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registrationNumber: reg }),
      }
    );

    if (res.status === 404) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: "DVLA lookup failed" }, { status: 502 });
    }

    const data = await res.json() as DVLAResponse;

    // Return only make, model (not in DVLA response directly — derived from make), colour
    return NextResponse.json({
      make: data.make ?? "",
      model: "",  // DVLA API doesn't return model — make is the best we get
      colour: data.colour ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
