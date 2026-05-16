const express = require("express");
const cors = require("cors");
const https = require("https");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const GROQ_KEY = process.env.GROQ_API_KEY;

console.log("Groq key loaded:", !!GROQ_KEY, "Length:", GROQ_KEY ? GROQ_KEY.length : 0);

app.post("/api/gemini", (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  console.log("Received prompt:", prompt.slice(0, 50));

  const payload = JSON.stringify({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1024,
  });

  const options = {
    hostname: "api.groq.com",
    path: "/openai/v1/chat/completions",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_KEY}`,
      "Content-Length": Buffer.byteLength(payload)
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = "";
    console.log("Groq status:", apiRes.statusCode);
    apiRes.on("data", chunk => data += chunk);
    apiRes.on("end", () => {
      console.log("Groq raw response:", data.slice(0, 300));
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) {
          console.log("Groq error:", parsed.error.message);
          return res.status(500).json({ error: parsed.error.message });
        }
        const text = parsed.choices?.[0]?.message?.content || "";
        console.log("Success, text length:", text.length);
        res.json({ text });
      } catch (e) {
        console.log("Parse error:", e.message);
        res.status(500).json({ error: "Parse error: " + e.message });
      }
    });
  });

  apiReq.on("error", (e) => {
    console.log("Request error:", e.message);
    res.status(500).json({ error: e.message });
  });

  apiReq.write(payload);
  apiReq.end();
});

app.get("/api/health", (_, res) => res.json({ status: "ok" }));
app.get("/api/keycheck", (_, res) => res.json({
  keyLoaded: !!GROQ_KEY,
  keyLength: GROQ_KEY ? GROQ_KEY.length : 0
}));
app.get("/", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Running on port " + PORT));