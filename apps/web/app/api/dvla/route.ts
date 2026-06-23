import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json() as { registrationNumber?: string };
  const vrm = body.registrationNumber?.replace(/\s/g, "").toUpperCase();

  if (!vrm || vrm.length < 2) {
    return NextResponse.json({ error: "Invalid registration" }, { status: 400 });
  }

  const apiKey = process.env.CHECKCARDETAILS_API_KEY;

  if (!apiKey) {
    // Mock data for demo
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
    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Log the raw response to help debug the structure
    console.log("checkcardetails raw response:", JSON.stringify(data));

    // Try multiple known response shapes
    // Shape 1: { Response: { DataItems: { VehicleRegistration: { Make, Model, Colour } } } }
    const shape1 = (data as { Response?: { DataItems?: { VehicleRegistration?: { Make?: string; Model?: string; Colour?: string } } } })
      ?.Response?.DataItems?.VehicleRegistration;

    // Shape 2: { DataItems: { VehicleRegistration: { Make, Model, Colour } } }
    const shape2 = (data as { DataItems?: { VehicleRegistration?: { Make?: string; Model?: string; Colour?: string } } })
      ?.DataItems?.VehicleRegistration;

    // Shape 3: flat { make, model, colour } or { Make, Model, Colour }
    const flat = data as { Make?: string; Model?: string; Colour?: string; make?: string; model?: string; colour?: string };

    const make = shape1?.Make ?? shape2?.Make ?? flat.Make ?? flat.make ?? "";
    const model = shape1?.Model ?? shape2?.Model ?? flat.Model ?? flat.model ?? "";
    const colour = shape1?.Colour ?? shape2?.Colour ?? flat.Colour ?? flat.colour ?? "";

    if (!make && !colour) {
      // Return the raw data so we can see the structure in the browser
      return NextResponse.json({ error: "Unexpected response format", raw: data }, { status: 422 });
    }

    return NextResponse.json({ make, model, colour });
  } catch (err) {
    console.error("DVLA lookup error:", err);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
