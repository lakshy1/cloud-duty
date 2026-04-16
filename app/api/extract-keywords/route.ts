import { NextResponse } from "next/server";

type ExtractRequest =
  | { type: "linkedin_url"; content: string }
  | { type: "text"; content: string }; // resume text or pasted bio

const SYSTEM_PROMPT = `You are a professional interest and skill extractor.
Given some profile text or a LinkedIn page, extract 8-10 concise keywords that best represent the person's professional interests, skills, and domain expertise.
Return ONLY a valid JSON array of strings. No explanation, no markdown, no extra text.
Example: ["machine learning","product management","fintech","B2B SaaS","growth hacking","data analytics","leadership","cloud infrastructure"]
Rules:
- Each keyword should be 1-4 words max
- Focus on topics, domains, technologies, industries
- Avoid generic words like "professional", "experienced", "motivated"
- Make them specific enough to match article titles or tags`;

async function callGroq(userMessage: string, apiKey: string): Promise<string[]> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) throw new Error("Groq request failed");

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? "[]";

  // Extract JSON array even if there's surrounding text
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON array in response");

  const parsed = JSON.parse(match[0]) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Not an array");

  return (parsed as unknown[])
    .filter((k): k is string => typeof k === "string")
    .slice(0, 10);
}

async function fetchLinkedInText(url: string): Promise<string> {
  // Attempt to fetch the public LinkedIn profile page
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`LinkedIn fetch failed: ${res.status}`);

  const html = await res.text();

  // Strip HTML tags and extract meaningful text
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000); // Limit to 4000 chars for Groq

  return text;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExtractRequest;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
    }

    if (!body.content?.trim()) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    let userMessage: string;

    if (body.type === "linkedin_url") {
      let profileText: string;

      try {
        profileText = await fetchLinkedInText(body.content.trim());
        userMessage = `Extract professional keywords from this LinkedIn profile page content:\n\n${profileText}`;
      } catch {
        // LinkedIn blocked the request — fall back to URL-based inference
        // Extract username from URL for context
        const username = body.content.match(/linkedin\.com\/in\/([^/?]+)/)?.[1] ?? "";
        userMessage = `Extract professional interest keywords. The person's LinkedIn profile URL is: ${body.content}. Username hint: "${username}". Generate relevant professional interest keywords based on any context available.`;
      }
    } else {
      userMessage = `Extract professional interest and skill keywords from this resume/profile text:\n\n${body.content.trim().slice(0, 4000)}`;
    }

    const keywords = await callGroq(userMessage, apiKey);

    return NextResponse.json({ keywords });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
