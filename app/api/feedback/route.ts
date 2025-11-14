import { NextResponse } from "next/server";

type WordStat = {
  word: string;
  timeToTypeMs: number;
  correct: boolean;
  backspaces: number;
};

type FeedbackRequestBody = {
  stats: WordStat[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FeedbackRequestBody;
    const { stats } = body;

    if (!stats || !Array.isArray(stats) || stats.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty stats" },
        { status: 400 }
      );
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API_KEY is not set");
      return NextResponse.json(
        { error: "Server misconfiguration: API key missing" },
        { status: 500 }
      );
    }

    // Build a concise prompt for the LLM
    const userContent = `
You are a friendly typing coach and excellent teacher.
Here are this user's typing stats as JSON.
Each item: { word, timeToTypeMs, correct, backspaces }.

Stats:
${JSON.stringify(stats, null, 2)}

Please provide feedback that is:
- Human-friendly and warm in tone
- Educational and informative like a patient teacher
- Encouraging and supportive, celebrating progress
- Easy to understand with clear explanations

Your response should:
1) Identify 3–5 words they struggled most with (slowest, many backspaces, or incorrect).
2) Explain likely issues in a teaching manner (finger positions, unusual letter combos, etc.).
3) Give 3 concrete, actionable tips to improve, mentioning home row and finger usage.
4) Keep it under 150 words, and speak directly to the user ("You...").
5) Use **bold** for emphasis on important words and techniques.
6) Sound like an encouraging teacher who believes in their student's potential.
`.trim();

    // Call Mistral Chat Completions API
    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          {
            role: "system",
            content: "You are an expert typing tutor. Be concise and encouraging.",
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0.4,
      }),
    });

    if (!mistralRes.ok) {
      const text = await mistralRes.text();
      console.error("Mistral API error:", text);
      return NextResponse.json(
        { error: "Error from Mistral API", details: text },
        { status: 500 }
      );
    }

    const data = await mistralRes.json();
    const feedback = data.choices?.[0]?.message?.content ?? "No feedback generated.";

    return NextResponse.json({ feedback });
  } catch (err) {
    console.error("Feedback route error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
