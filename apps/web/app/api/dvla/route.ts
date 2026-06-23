import { NextRequest, NextResponse } from "next/server";

interface CheckCarDetailsResponse {
  make?: string;
  model?: string;
  colour?: string;
  registrationNumber?: string;
  message?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { registrationNumber?: string };
  const vrm = body.registrationNumber?.replace(/\s/g, "").toUpperCase();

  if (!vrm || vrm.length < 2) {
    return NextResponse.json({ error: "Invalid registration" }, { status: 400 });
  }

  const apiKey = process.env.CHECKCARDETAILS_API_KEY;

  if (!apiKey) {
    // Mock data for demo when no API key set
    const mocks: Record<string, { make: string; model: string; colour: string }> = {
      MK: { make: "VOLKSWAGEN", model: "GOLF", colour: "SILVER" },
      LS: { make: "BMW", model: "3 SERIES", colour: "BLACK" },
      BK: { make: "FORD", model: "FOCUS", colour: "WHITE" },
      PE: { make: "AUDI", model: "A4", colour: "GREY" },
      LO: { make: "MERCEDES", model: "C CLASS", colour: "BLUE" },
    };
    const key = vrm.slice(0, 2);
    const mock = mocks[key] ?? { make: "TOYOTA", model: "COROLLA", colour: "BLUE" };
    return NextResponse.json(mock);
  }

  try {
    const url = `https://api.checkcardetails.co.uk/vehicledata/vehicleregistration?apikey=${apiKey}&vrm=${vrm}`;
    const res = await fetch(url, { method: "GET" });
    const data = await res.json() as CheckCarDetailsResponse;

    if (!res.ok || data.message) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Response is flat: { make, model, colour, ... }
    return NextResponse.json({
      make: data.make ?? "",
      model: data.model ?? "",
      colour: data.colour ?? "",
    });
  } catch (err) {
    console.error("Vehicle lookup error:", err);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
