import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import sharp from "sharp";

const router = Router();

// Gemini prompt — asks for bounding boxes (0-1000 scale, yMin/xMin/yMax/xMax from top-left)
const SYSTEM_PROMPT = `You are a fashion AI assistant. Analyze the outfit photo and identify every visible clothing item.

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "items": [
    {
      "name": "descriptive name of the garment",
      "category": "tops" | "bottoms" | "shoes" | "accessories",
      "color": "color name in English",
      "colorHex": "#RRGGBB hex code of the dominant color",
      "style": "casual" | "formal" | "streetwear" | "sport" | "bohemian" | "minimalist",
      "tags": ["tag1", "tag2"],
      "box": { "yMin": 0, "xMin": 0, "yMax": 1000, "xMax": 1000 }
    }
  ]
}

Rules:
- Detect ALL visible garments including accessories, bags, hats, belts
- colorHex must be a valid hex code matching the actual color
- tags should describe fit, fabric, occasion (e.g. "slim fit", "cotton", "summer")
- box: integer coordinates on a 0–1000 scale, top-left origin (yMin<yMax, xMin<xMax)
- If you cannot locate a precise bounding box, use the full image area: {"yMin":0,"xMin":0,"yMax":1000,"xMax":1000}`;

/** Crop a bounding box from a base64 image buffer, resize and compress to JPEG thumbnail */
async function cropThumb(
  imageBuffer: Buffer,
  box: { yMin: number; xMin: number; yMax: number; xMax: number }
): Promise<string | null> {
  try {
    const img = sharp(imageBuffer);
    const meta = await img.metadata();
    const W = meta.width ?? 1;
    const H = meta.height ?? 1;

    // Clamp and convert 0-1000 scale to pixels
    const left = Math.max(0, Math.round((box.xMin / 1000) * W));
    const top = Math.max(0, Math.round((box.yMin / 1000) * H));
    const right = Math.min(W, Math.round((box.xMax / 1000) * W));
    const bottom = Math.min(H, Math.round((box.yMax / 1000) * H));

    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);

    const thumb = await sharp(imageBuffer)
      .extract({ left, top, width, height })
      .resize(200, 200, { fit: "cover", position: "centre" })
      .jpeg({ quality: 28, mozjpeg: true })
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
    // 1. Ask Gemini to detect items + bounding boxes
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

    // 2. Decode full-resolution image once
    const imageBuffer = Buffer.from(imageBase64, "base64");

    // 3. Crop individual thumbnails in parallel — one per detected item
    const itemsWithThumbs = await Promise.all(
      rawItems.map(async (item) => {
        const box = item.box ?? { yMin: 0, xMin: 0, yMax: 1000, xMax: 1000 };

        // Validate box shape
        const safeBox = {
          yMin: Number(box.yMin ?? 0),
          xMin: Number(box.xMin ?? 0),
          yMax: Number(box.yMax ?? 1000),
          xMax: Number(box.xMax ?? 1000),
        };

        const imageThumb = await cropThumb(imageBuffer, safeBox);

        return {
          name: item.name ?? "Clothing item",
          category: item.category ?? "tops",
          color: item.color ?? "Unknown",
          colorHex: item.colorHex ?? "#9E9E9E",
          style: item.style ?? "casual",
          tags: Array.isArray(item.tags) ? item.tags : [],
          imageThumb, // base64 JPEG 200×200, ~4-8 KB
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
