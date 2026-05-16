const express = require("express");
const cors = require("cors");
const https = require("https");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const GEMINI_KEY = process.env.GEMINI_API_KEY;

app.post("/api/gemini", (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }]
  });

  const options = {
    hostname: "generativelanguage.googleapis.com",
    path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = "";
    apiRes.on("data", chunk => data += chunk);
    apiRes.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) return res.status(500).json({ error: parsed.error.message });
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
        res.json({ text });
      } catch (e) {
        res.status(500).json({ error: "Parse error: " + e.message });
      }
    });
  });

  apiReq.on("error", (e) => {
    res.status(500).json({ error: e.message });
  });

  apiReq.write(payload);
  apiReq.end();
});

app.get("/api/health", (_, res) => res.json({ status: "ok" }));
app.get("/api/keycheck", (_, res) => res.json({
  keyLoaded: !!GEMINI_KEY,
  keyLength: GEMINI_KEY ? GEMINI_KEY.length : 0
}));
app.get("/", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Running on port " + PORT));