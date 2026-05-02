import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoryChip } from "@/components/CategoryChip";
import { ClothingCard } from "@/components/ClothingCard";
import { EmptyState } from "@/components/EmptyState";
import { ClothingCategory, useCloset } from "@/context/ClosetContext";
import { useColors } from "@/hooks/useColors";

const CATEGORIES: Array<{ key: "all" | ClothingCategory; label: string }> = [
  { key: "all",         label: "All" },
  { key: "tops",        label: "Tops" },
  { key: "bottoms",     label: "Bottoms" },
  { key: "shoes",       label: "Shoes" },
  { key: "accessories", label: "Accessories" },
];

const SUBCATEGORIES: Record<ClothingCategory, string[]> = {
  tops:        ["Shirt", "T-Shirt", "Tank Top", "Hoodie", "Sweater", "Cardigan", "Blazer", "Jacket", "Coat"],
  bottoms:     ["Jeans", "Trousers", "Shorts", "Skirt", "Leggings", "Sweatpants"],
  shoes:       ["Sneakers", "Boots", "Loafers", "Sandals", "Heels", "Dress Shoes"],
  accessories: ["Bag", "Belt", "Hat", "Watch", "Jewelry", "Sunglasses", "Scarf"],
};

export default function WardrobeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items } = useCloset();
  const [activeCategory, setActiveCategory] = useState<"all" | ClothingCategory>("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

  const subcats = activeCategory !== "all" ? SUBCATEGORIES[activeCategory] : [];

  // Items used by subcategory (before sub-filter) to know which subcats have items
  const categoryItems = useMemo(() => {
    if (activeCategory === "all") return items;
    return items.filter((i) => i.category === activeCategory);
  }, [items, activeCategory]);

  const filtered = useMemo(() => {
    if (!activeSubcategory) return categoryItems;
    return categoryItems.filter(
      (i) => i.subcategory?.toLowerCase() === activeSubcategory.toLowerCase()
    );
  }, [categoryItems, activeSubcategory]);

  function selectCategory(cat: "all" | ClothingCategory) {
    setActiveCategory(cat);
    setActiveSubcategory(null);
    Haptics.selectionAsync();
  }

  function selectSubcategory(sub: string) {
    setActiveSubcategory(prev => prev === sub ? null : sub);
    Haptics.selectionAsync();
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>My Closet</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {items.length} {items.length === 1 ? "item" : "items"}
          </Text>
        </View>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/add"); }}
          style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.foreground, borderRadius: 24, opacity: pressed ? 0.8 : 1 }]}
        >
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {/* Main category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.chipRow, { borderBottomColor: subcats.length ? "transparent" : colors.border }]}
        contentContainerStyle={styles.chipContent}
      >
        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c.key}
            label={c.label}
            selected={activeCategory === c.key}
            onPress={() => selectCategory(c.key)}
          />
        ))}
      </ScrollView>

      {/* Subcategory filter — appears when a main category is selected */}
      {subcats.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.subRow, { borderBottomColor: colors.border }]}
          contentContainerStyle={styles.chipContent}
        >
          {subcats.map((sub) => {
            const count = categoryItems.filter(
              (i) => i.subcategory?.toLowerCase() === sub.toLowerCase()
            ).length;
            const active = activeSubcategory === sub;
            return (
              <Pressable
                key={sub}
                onPress={() => selectSubcategory(sub)}
                style={[
                  styles.subChip,
                  {
                    backgroundColor: active ? colors.accent : colors.secondary,
                    borderColor: active ? colors.accent : colors.border,
                    borderRadius: 20,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subChipText,
                    { color: active ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {sub}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.subChipBadge,
                      { backgroundColor: active ? "rgba(255,255,255,0.3)" : colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.subChipBadgeText,
                        { color: active ? "#fff" : colors.mutedForeground },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="layers"
          title={activeSubcategory ? `No ${activeSubcategory}s yet` : "Nothing here yet"}
          subtitle={
            activeSubcategory
              ? `Add some ${activeSubcategory.toLowerCase()}s to your closet.`
              : "Add your first item to start building your digital wardrobe."
          }
          actionLabel="Add item"
          onAction={() => router.push("/(tabs)/add")}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 90 },
          ]}
          renderItem={({ item }) => (
            <ClothingCard item={item} onPress={() => router.push(`/item/${item.id}`)} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  chipRow: { borderBottomWidth: 1, maxHeight: 52 },
  subRow: { borderBottomWidth: 1, maxHeight: 48 },
  chipContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: "row", alignItems: "center" },
  subChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  subChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  subChipBadge: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  subChipBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  grid: { paddingHorizontal: 10, paddingTop: 8 },
});
