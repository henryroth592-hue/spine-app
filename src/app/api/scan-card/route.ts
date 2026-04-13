import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export interface CardScanResult {
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
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
    max_tokens: 256,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: imageBase64 },
        },
        {
          type: "text",
          text: `Extract contact information from this business card. Return ONLY a valid JSON object — no explanation, no markdown:
{
  "name": "person's full name or null",
  "company": "company/business name or null",
  "email": "email address or null",
  "phone": "phone number or null"
}`,
        },
      ],
    }],
  });

  try {
    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
    const result: CardScanResult = JSON.parse(text);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Could not parse card data" }, { status: 422 });
  }
}
