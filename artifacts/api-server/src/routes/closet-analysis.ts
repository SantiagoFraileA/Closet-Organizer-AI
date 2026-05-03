import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const router = Router();

const PROMPT = `You are a personal stylist AI. Analyze this wardrobe and return ONLY valid JSON (no markdown):
{
  "score": 72,
  "trend": "+3",
  "missing": ["White sneakers", "Basic white tee", "Dark slim jeans"],
  "tip": "Neutral basics multiply your outfit options with minimal effort"
}

Rules:
- score: 0-100 (how versatile and complete the wardrobe is)
- trend: signed number vs ideal baseline of 75, e.g. "+5", "-12", "0"
- missing: 2-3 wardrobe essentials that would most increase outfit combinations (max 5 words each)
- tip: one actionable tip to improve the wardrobe (max 15 words, specific and practical)

Scoring criteria:
- Category coverage (tops/bottoms/shoes/accessories all present): 30 pts
- Color versatility (good neutral + accent mix): 25 pts
- Subcategory variety (multiple types per category): 25 pts
- Wardrobe size (8+ items is solid, 15+ is great): 20 pts

If the wardrobe is empty or has <2 items, return score: 10, trend: "-65", and basics as missing.`;

// POST /api/closet-analysis
router.post("/closet-analysis", async (req, res) => {
  const { items } = req.body ?? {};

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "items array required" });
  }

  try {
    const wardrobeText = items.length === 0
      ? "Empty wardrobe — no items yet."
      : items.map((i: any) =>
          `- ${i.name} (${i.category}${i.subcategory ? `/${i.subcategory}` : ""}, ${i.color})`
        ).join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `${PROMPT}\n\nWardrobe (${items.length} items):\n${wardrobeText}` }],
        },
      ],
      config: {
        maxOutputTokens: 512,
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "";
    let parsed: { score: number; trend: string; missing: string[]; tip: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: "invalid_ai_response", raw: text });
    }

    return res.json({
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      trend: String(parsed.trend ?? "0"),
      missing: Array.isArray(parsed.missing) ? parsed.missing.slice(0, 3) : [],
      tip: String(parsed.tip ?? ""),
    });
  } catch (err: any) {
    req.log.error({ err }, "closet-analysis error");
    return res.status(500).json({ error: "server_error", message: String(err?.message ?? err) });
  }
});

export default router;
