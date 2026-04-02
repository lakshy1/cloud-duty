import { NextResponse } from "next/server";

type GroqRequest = {
  field: "summary" | "details";
  title?: string;
  summary?: string;
  details?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GroqRequest;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY." }, { status: 500 });
    }

    const title = (body.title ?? "").trim();
    const summary = (body.summary ?? "").trim();
    const details = (body.details ?? "").trim();
    const field = body.field;
    const baseContext = [
      title ? `Title: ${title}` : null,
      summary ? `Summary: ${summary}` : null,
      details ? `Details: ${details}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const system =
      field === "summary"
        ? "You are a concise product copywriter. Write a sharp 1-2 sentence summary under 220 characters. Return plain text only."
        : "You are a product storyteller. Expand the details into 3-5 short sentences with clarity and action. Return plain text only.";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.6,
        messages: [
          { role: "system", content: system },
          { role: "user", content: baseContext || "Generate text for this field." },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err || "Groq request failed." }, { status: 500 });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Groq request failed." },
      { status: 500 }
    );
  }
}
