import { db } from "@workspace/db";
import { clothingItemsTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import { Router } from "express";

const router = Router();

// POST /api/items — upsert clothing items with compressed thumbnail
router.post("/items", async (req, res) => {
  const { items } = req.body as {
    items?: Array<{
      id: string;
      name: string;
      category: string;
      color: string;
      colorHex: string;
      tags?: string[];
      imageThumb?: string | null;
    }>;
  };

  if (!Array.isArray(items) || items.length === 0) {
    res.json({ saved: 0 });
    return;
  }

  try {
    const rows = items.map((item) => ({
      id: String(item.id),
      name: String(item.name),
      category: String(item.category),
      color: String(item.color),
      colorHex: String(item.colorHex),
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      imageThumb: item.imageThumb ?? null,
    }));

    await db
      .insert(clothingItemsTable)
      .values(rows)
      .onConflictDoUpdate({
        target: clothingItemsTable.id,
        set: {
          name: sql`excluded.name`,
          category: sql`excluded.category`,
          color: sql`excluded.color`,
          colorHex: sql`excluded.color_hex`,
          tags: sql`excluded.tags`,
          imageThumb: sql`excluded.image_thumb`,
        },
      });

    req.log.info({ count: rows.length }, "Saved clothing items");
    res.json({ saved: rows.length });
  } catch (err: any) {
    req.log.error({ err }, "Failed to save items");
    res.status(500).json({ error: "server_error", message: err?.message });
  }
});

// GET /api/items — list all saved items
router.get("/items", async (req, res) => {
  try {
    const items = await db
      .select({
        id: clothingItemsTable.id,
        name: clothingItemsTable.name,
        category: clothingItemsTable.category,
        color: clothingItemsTable.color,
        colorHex: clothingItemsTable.colorHex,
        tags: clothingItemsTable.tags,
        imageThumb: clothingItemsTable.imageThumb,
        addedAt: clothingItemsTable.addedAt,
      })
      .from(clothingItemsTable)
      .orderBy(clothingItemsTable.addedAt);
    res.json({ items });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch items");
    res.status(500).json({ error: "server_error", message: err?.message });
  }
});

export default router;
