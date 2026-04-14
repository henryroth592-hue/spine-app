import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export interface CertScanResult {
  reportNumber: string | null;
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
    max_tokens: 64,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: imageBase64 },
        },
        {
          type: "text",
          text: `Find the GIA report number on this document. It is a 10-digit number, often labeled "GIA Report Number", "Report No.", or similar. Return ONLY a valid JSON object — no explanation, no markdown:
{"reportNumber": "1234567890"}
If you cannot find a report number, return: {"reportNumber": null}`,
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
    return NextResponse.json({ error: "Could not read cert number" }, { status: 422 });
  }
}
