import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/check", async (req, res) => {
  try {
    const { level, grammar, prompt, answer } = req.body;

    if (!answer || !grammar) {
      return res.status(400).json({
        correct: false,
        fix: "",
        explanation: "Jawaban atau grammar kosong.",
        grammar_used: [],
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        correct: false,
        fix: "",
        explanation: "OPENAI_API_KEY belum di set.",
        grammar_used: [],
      });
    }

    const aiPrompt = `
Kamu adalah guru bahasa Jepang JLPT.

Cek jawaban siswa berikut:
"${answer}"

LEVEL: ${level || "-"}
SOAL: ${prompt || "-"}

Fokus grammar: ${grammar}

BALAS HARUS JSON VALID TANPA TEKS LAIN:
{
  "correct": true/false,
  "fix": "kalimat Jepang yang benar (hiragana/kanji)",
  "explanation": "penjelasan singkat dalam bahasa Indonesia",
  "grammar_used": ["..."]
}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Jawab hanya JSON valid." },
          { role: "user", content: aiPrompt },
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();

    let text = data.choices[0].message.content.trim();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err) {
    console.error("ERROR /check:", err);
    return res.status(500).json({
      correct: false,
      fix: "",
      explanation: "Server error / AI error.",
      grammar_used: [],
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
