import { NextRequest, NextResponse } from "next/server";

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
      grant_type:    "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// Encode non-ASCII subject header per RFC 2047
function encodeSubject(subject: string): string {
  if (/[^\x00-\x7F]/.test(subject)) {
    const b64 = Buffer.from(subject, "utf-8").toString("base64");
    return `=?UTF-8?B?${b64}?=`;
  }
  return subject;
}

function buildRawEmail(from: string, to: string, subject: string, html: string, text: string): string {
  const boundary = "boundary_" + Math.random().toString(36).slice(2);
  const msg = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    text,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    html,
    ``,
    `--${boundary}--`,
  ].join("\r\n");

  return Buffer.from(msg).toString("base64url");
}

export async function POST(req: NextRequest) {
  const missing = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"].filter(
    (k) => !process.env[k]
  );
  if (missing.length) {
    return NextResponse.json({ error: `Missing env vars: ${missing.join(", ")}` }, { status: 500 });
  }

  const { to, vendor, html, text } = await req.json();
  if (!to || !html) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  // ASCII-safe subject — avoid special chars that cause encoding issues
  const subject = `Purchase Note - ${vendor || "Session"} - ${date}`;

  try {
    const accessToken = await getAccessToken();

    const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();
    const from = profile.emailAddress ?? "me";

    const raw = buildRawEmail(from, to, subject, html, text);

    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.json();
      throw new Error(JSON.stringify(err));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
