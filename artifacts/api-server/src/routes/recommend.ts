import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const router = Router();

interface ItemInput {
  id: string;
  name: string;
  category: string;
  color: string;
  colorHex: string;
  tags: string[];
}

interface LookInput {
  name: string;
  itemNames: string[];
}

interface WeatherInput {
  tempC: number;
  feelsLikeC: number;
  tempMinC: number;
  tempMaxC: number;
  condition: string;
  windKph: number;
  precipMm: number;
  locationName?: string;
}

router.post("/recommend-outfits", async (req, res) => {
  const { items, savedLooks, weather } = req.body as {
    items: ItemInput[];
    savedLooks: LookInput[];
    weather: WeatherInput;
  };

  if (!items?.length) {
    res.status(400).json({ error: "No wardrobe items provided" });
    return;
  }

  const weatherDesc = [
    `Current: ${weather.tempC}°C (feels like ${weather.feelsLikeC}°C)`,
    `Today's range: ${weather.tempMinC}°C – ${weather.tempMaxC}°C`,
    `Conditions: ${weather.condition}`,
    `Wind: ${weather.windKph} km/h`,
    weather.precipMm > 0 ? `Rain expected: ${weather.precipMm} mm` : "No rain expected",
    weather.locationName ? `Location: ${weather.locationName}` : "",
  ].filter(Boolean).join("\n");

  const wardrobeDesc = items
    .map((i) => `• ${i.name} [${i.category}] color: ${i.color} tags: ${i.tags.join(", ")}`)
    .join("\n");

  const styleHistory = savedLooks.length
    ? savedLooks
        .slice(0, 6)
        .map((l) => `  - ${l.name}: ${l.itemNames.join(", ")}`)
        .join("\n")
    : "  (no looks saved yet — use the user's general style tags as reference)";

  const prompt = `You are a personal stylist AI with deep knowledge of fashion, color theory, and weather-appropriate dressing.

WEATHER TODAY:
${weatherDesc}

USER'S WARDROBE:
${wardrobeDesc}

USER'S RECENT OUTFIT HISTORY (style reference — shows what they actually wear):
${styleHistory}

TASK: Recommend exactly 4 distinct outfit combinations from the wardrobe above. Rules:
- Use ONLY items listed in the wardrobe (exact names, no inventions)
- Each outfit must be appropriate for the weather conditions
- Vary the occasions across the 4 outfits (different moments of the day or week)
- Reflect the user's demonstrated style from their history
- Never repeat the exact same combination of items
- Each outfit should have 2–4 items

Return ONLY valid JSON with no markdown fences:
{
  "recommendations": [
    {
      "occasion": "Morning commute",
      "vibe": "Sharp",
      "items": ["exact item name from wardrobe"],
      "weatherNote": "one sentence about why this is right for today's weather",
      "styleNote": "one sentence about the look and why it suits this person"
    }
  ]
}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in Gemini response");

    const parsed = JSON.parse(match[0]);
    res.json(parsed);
  } catch (err: any) {
    req.log.error({ err }, "recommend-outfits error");
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

export default router;
