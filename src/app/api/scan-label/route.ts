import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Label scanning not configured" },
      { status: 500 }
    );
  }

  const body = await req.json();
  const imageDataUri: string = body.image ?? "";

  // Strip data URI prefix to get raw base64
  const base64Data = imageDataUri.replace(/^data:image\/[a-z]+;base64,/, "");
  if (!base64Data) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: `You are reading a product label, sticker, or nameplate on a home appliance or device. Extract the following information from the image.

CRITICAL: Read model numbers and serial numbers character by character. These are alphanumeric codes where every character matters. Pay close attention to:
- Distinguish 0 (zero) from O (letter) — model numbers almost always use zero, not the letter O
- Distinguish 5 from S, 1 from I/l, 8 from B
- Include all characters including slashes, dashes, and suffixes (e.g. "/AA", "-SS")
- The model number is the COMPLETE string next to "Model", "Mod.", or "M/N"
- The serial number is the COMPLETE string next to "S/N", "Serial No.", or "SN"

Fields to extract:
- brand: The manufacturer or brand name
- model: The full model number exactly as printed
- serialNumber: The full serial number exactly as printed
- name: A descriptive product name if visible (e.g. "French Door Refrigerator"), or construct one from the brand and type of appliance
- category: Classify this product into exactly one of these categories: "Kitchen", "Laundry", "HVAC & Climate", "Water Systems", "Electrical & Safety", "Outdoor / Exterior", "Plumbing Fixtures", "Entertainment / Tech"

Return ONLY a JSON object with these five fields. Use empty string "" for any field you cannot determine with confidence.
Example: {"brand":"Samsung","model":"RS28A500ASG/AA","serialNumber":"0A8B1234567","name":"Samsung Side-by-Side Refrigerator","category":"Kitchen"}`,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error("Anthropic API error:", res.status, await res.text());
      return NextResponse.json(
        { error: "Failed to analyze label" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const textContent = data.content?.[0]?.text ?? "{}";

    // Strip markdown code blocks if present
    const jsonStr = textContent
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({
      brand: typeof parsed.brand === "string" ? parsed.brand : "",
      model: typeof parsed.model === "string" ? parsed.model : "",
      serialNumber:
        typeof parsed.serialNumber === "string" ? parsed.serialNumber : "",
      name: typeof parsed.name === "string" ? parsed.name : "",
      category: typeof parsed.category === "string" ? parsed.category : "",
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Could not read label" },
        { status: 502 }
      );
    }
    console.error("Scan label failed:", err);
    return NextResponse.json(
      { error: "Failed to scan label" },
      { status: 500 }
    );
  }
}
