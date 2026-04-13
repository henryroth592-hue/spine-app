import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export interface CardScanResult {
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  cell: string | null;
  title: string | null;
  address: string | null;
  website: string | null;
  social: string | null;
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
          text: `Extract all contact information from this business card. Return ONLY a valid JSON object — no explanation, no markdown:
{
  "name": "individual person's full name or null",
  "company": "company/business name or null",
  "title": "job title or null",
  "email": "email address or null",
  "phone": "main/office phone number or null",
  "cell": "cell/mobile number if different from main phone or null",
  "address": "full mailing address on one line or null",
  "website": "website URL or null",
  "social": "social media handles or URLs (comma-separated if multiple) or null"
}`,
        },
      ],
    }],
  });

  try {
    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
    // Strip markdown code fences if Claude wrapped the JSON
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const result: CardScanResult = JSON.parse(jsonStr);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Could not parse card data" }, { status: 422 });
  }
}
