import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const router = Router();

const SYSTEM_PROMPT = `You are a fashion AI assistant. Analyze the outfit photo and identify every clothing item visible.

For each item return a JSON array with this exact structure:
{
  "items": [
    {
      "name": "descriptive name of the garment",
      "category": "tops" | "bottoms" | "shoes" | "accessories",
      "color": "color name in English",
      "colorHex": "#RRGGBB hex code of the dominant color",
      "style": "casual" | "formal" | "streetwear" | "sport" | "bohemian" | "minimalist",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Rules:
- Detect ALL visible garments including accessories, bags, hats, belts
- colorHex must be a valid hex code matching the actual color
- tags should describe fit, fabric, occasion (e.g. "slim fit", "cotton", "summer")
- Return ONLY valid JSON, no markdown, no extra text`;

// POST /api/analyze-outfit
router.post("/analyze-outfit", async (req, res) => {
  const { imageBase64, mimeType } = req.body ?? {};

  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 is required" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType ?? "image/jpeg",
                data: imageBase64,
              },
            },
            { text: SYSTEM_PROMPT },
          ],
        },
      ],
      config: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "";

    let parsed: { items: unknown[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: "invalid_ai_response", raw: text });
    }

    return res.json({ items: parsed.items ?? [] });
  } catch (err: any) {
    console.error("analyze-outfit error", err);
    return res.status(500).json({ error: "server_error", message: err?.message });
  }
});

export default router;
