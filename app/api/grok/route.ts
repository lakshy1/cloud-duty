type GrokMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT: GrokMessage = {
  role: "system",
  content:
    "You are Reading Queue AI, a friendly assistant for the Reading Queue workspace. Keep responses concise, actionable, and focused on helping users manage posts, boards, and insights. If a request is unclear, ask a brief follow-up question.",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing GROQ_API_KEY in environment." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const rawMessages = Array.isArray(body?.messages) ? (body.messages as GrokMessage[]) : [];

  const messages = rawMessages
    .filter(
      (msg) =>
        msg &&
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string" &&
        msg.content.trim().length > 0
    )
    .map((msg) => ({
      role: msg.role,
      content: msg.content.trim(),
    }));

  if (messages.length === 0) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
  }

  const lastUser = [...messages].reverse().find((msg) => msg.role === "user");
  if (lastUser) {
    const content = lastUser.content.toLowerCase();
    const normalized = content.replace(/[^a-z]/g, "");
    const mentionsReadingQueue = content.includes("reading queue") || normalized.includes("readingqueue");
    const aboutReadingQueue =
      mentionsReadingQueue &&
      (content.includes("what is") ||
        content.includes("about") ||
        content.includes("tell me about") ||
        content.includes("explain") ||
        content.includes("define") ||
        content.includes("meaning") ||
        content.includes("describe") ||
        content.includes("what's") ||
        content.includes("whats") ||
        normalized.includes("whatisreadingqueue") ||
        normalized.includes("aboutreadingqueue"));
    if (aboutReadingQueue) {
      return Response.json({
        message:
          "Reading Queue is an AI-powered developer social platform where developers can showcase projects, interact with others, and discover relevant content through intelligent features like chatbot assistance and personalized feeds.",
      });
    }
  }

  const model =
    process.env.GROQ_MODEL && process.env.GROQ_MODEL.trim().length > 0
      ? process.env.GROQ_MODEL
      : "llama-3.1-8b-instant";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [SYSTEM_PROMPT, ...messages],
      temperature: 0.3,
      stream: false,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage =
      data?.error?.message || data?.error || "Upstream AI provider error.";
    return Response.json({ error: errorMessage }, { status: response.status });
  }

  const reply = data?.choices?.[0]?.message?.content ?? "";
  return Response.json({ message: reply });
}
