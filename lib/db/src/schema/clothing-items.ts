import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clothingItemsTable = pgTable("clothing_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  color: text("color").notNull(),
  colorHex: text("color_hex").notNull(),
  tags: text("tags").array().notNull().default([]),
  imageThumb: text("image_thumb"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const insertClothingItemSchema = createInsertSchema(clothingItemsTable);
export type InsertClothingItem = z.infer<typeof insertClothingItemSchema>;
export type ClothingItemRow = typeof clothingItemsTable.$inferSelect;
