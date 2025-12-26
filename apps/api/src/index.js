import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));

// CORS: 웹 배포 주소(10173)에서 API(13173) 호출 가능하도록 허용
app.use(
  cors({
    origin: true, // 일단 전체 허용 (과제용). 더 엄격히 하려면 아래처럼 고정해도 됨.
    // origin: ["http://113.198.66.68:10173"],
    credentials: false,
  })
);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Web -> API -> OpenAI 프록시
app.post("/ai/chat", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not set on server" });
    }

    const { messages, temperature } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages is required (array)" });
    }

    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: typeof temperature === "number" ? temperature : 0.7,
      }),
    });

    const text = await r.text();
    if (!r.ok) {
      return res.status(r.status).json({ error: text });
    }

    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content?.trim() ?? "";
    return res.json({ content });
  } catch (err) {
    console.error("[api] /ai/chat error:", err);
    return res.status(500).json({ error: String(err) });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => {
  console.log(`[api] listening on 0.0.0.0:${port}`);
});
