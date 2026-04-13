import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export interface CertScanResult {
  reportNumber: string | null;
  shape: string | null;       // GIA shape name, e.g. "Round Brilliant"
  caratWeight: string | null; // e.g. "1.23"
  color: string | null;       // e.g. "H"
  clarity: string | null;     // e.g. "VS2"
  cut: string | null;         // e.g. "Excellent"
  polish: string | null;
  symmetry: string | null;
  fluorescence: string | null;
  measurements: string | null; // e.g. "6.51 - 6.54 x 4.03 mm"
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { imageBase64, mediaType } = await req.json();
  if (!imageBase64) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: imageBase64 },
        },
        {
          type: "text",
          text: `Extract all grading information from this GIA diamond grading report. Return ONLY a valid JSON object — no explanation, no markdown:
{
  "reportNumber": "GIA report number or null",
  "shape": "shape and cutting style exactly as printed, e.g. 'Round Brilliant' or 'Oval Modified Brilliant' or null",
  "caratWeight": "carat weight as a decimal string, e.g. '1.23' or null",
  "color": "color grade letter(s), e.g. 'H' or null",
  "clarity": "clarity grade, e.g. 'VS2' or null",
  "cut": "cut grade, e.g. 'Excellent' or null (rounds only)",
  "polish": "polish grade, e.g. 'Excellent' or null",
  "symmetry": "symmetry grade, e.g. 'Very Good' or null",
  "fluorescence": "fluorescence, e.g. 'None' or 'Medium Blue' or null",
  "measurements": "measurements as printed, e.g. '6.51 - 6.54 x 4.03 mm' or null"
}`,
        },
      ],
    }],
  });

  try {
    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const result: CertScanResult = JSON.parse(jsonStr);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Could not parse cert data" }, { status: 422 });
  }
}
