import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import sharp from "sharp";

const router = Router();

// Vertical zone definitions (0-1000 scale, top-left origin)
// Each zone maps to a predictable vertical slice of the image
const ZONE_COORDS: Record<string, { yMin: number; yMax: number }> = {
  top: { yMin: 0, yMax: 420 },            // head, hat, neck, upper torso
  "upper-middle": { yMin: 200, yMax: 620 }, // torso, jacket, shirt, bag
  "lower-middle": { yMin: 440, yMax: 820 }, // waist, pants, skirt, belt
  bottom: { yMin: 680, yMax: 1000 },       // shoes, socks, ankles
  full: { yMin: 0, yMax: 1000 },           // accessories, jewelry, watches
};

const SYSTEM_PROMPT = `You are a fashion AI. Analyze this outfit photo and identify every visible clothing item.

Return ONLY valid JSON (no markdown):
{
  "items": [
    {
      "name": "descriptive name",
      "category": "tops" | "bottoms" | "shoes" | "accessories",
      "color": "color name in English",
      "colorHex": "#RRGGBB",
      "style": "casual" | "formal" | "streetwear" | "sport" | "bohemian" | "minimalist",
      "tags": ["tag1", "tag2"],
      "position": "top" | "upper-middle" | "lower-middle" | "bottom" | "full"
    }
  ]
}

Position guide (where in the photo is this garment located, top of image = head, bottom = feet):
- "top"          → hats, headbands, scarves, earrings, neck items
- "upper-middle" → shirts, t-shirts, jackets, blazers, coats, tops, bags, backpacks
- "lower-middle" → trousers, jeans, skirts, shorts, waist belts
- "bottom"       → shoes, sneakers, boots, sandals, socks
- "full"         → watches, bracelets, rings, sunglasses, full-length dresses/jumpsuits

Rules:
- Detect ALL visible garments and accessories
- colorHex must match the actual color
- tags: fit, fabric, occasion (e.g. "slim fit", "cotton", "summer")
- Choose position based on WHERE in the photo the item appears`;

/** Crop a vertical zone from image, adding slight horizontal padding */
async function cropZone(
  imageBuffer: Buffer,
  position: string
): Promise<string | null> {
  try {
    const zone = ZONE_COORDS[position] ?? ZONE_COORDS["full"];
    const img = sharp(imageBuffer);
    const meta = await img.metadata();
    const W = meta.width ?? 1;
    const H = meta.height ?? 1;

    // Vertical crop from zone
    const top = Math.max(0, Math.round((zone.yMin / 1000) * H));
    const bottom = Math.min(H, Math.round((zone.yMax / 1000) * H));
    const height = Math.max(1, bottom - top);

    // Horizontal: full width with small padding removed for a cleaner crop
    const hPad = Math.round(W * 0.05);
    const left = hPad;
    const width = Math.max(1, W - hPad * 2);

    const thumb = await sharp(imageBuffer)
      .extract({ left, top, width, height })
      .resize(200, 200, { fit: "cover", position: "centre" })
      .jpeg({ quality: 30 })
      .toBuffer();

    return thumb.toString("base64");
  } catch {
    return null;
  }
}

// POST /api/analyze-outfit
router.post("/analyze-outfit", async (req, res) => {
  const { imageBase64, mimeType } = req.body ?? {};

  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 is required" });
  }

  try {
    // 1. Ask Gemini to detect items + vertical positions
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

    let parsed: { items: any[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: "invalid_ai_response", raw: text });
    }

    const rawItems: any[] = parsed.items ?? [];
    const imageBuffer = Buffer.from(imageBase64, "base64");

    // 2. Crop individual zones in parallel
    const itemsWithThumbs = await Promise.all(
      rawItems.map(async (item) => {
        // Fallback: infer position from category if Gemini didn't provide one
        const position =
          item.position ??
          ({
            tops: "upper-middle",
            bottoms: "lower-middle",
            shoes: "bottom",
            accessories: "full",
          }[item.category as string] ?? "full");

        const imageThumb = await cropZone(imageBuffer, position);

        return {
          name: item.name ?? "Clothing item",
          category: item.category ?? "tops",
          color: item.color ?? "Unknown",
          colorHex: item.colorHex ?? "#9E9E9E",
          style: item.style ?? "casual",
          tags: Array.isArray(item.tags) ? item.tags : [],
          imageThumb,
        };
      })
    );

    return res.json({ items: itemsWithThumbs });
  } catch (err: any) {
    req.log.error({ err }, "analyze-outfit error");
    return res.status(500).json({ error: "server_error", message: String(err?.message ?? err) });
  }
});

export default router;
