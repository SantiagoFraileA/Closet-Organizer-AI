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
  { key: "all", label: "All" },
  { key: "tops", label: "Tops" },
  { key: "bottoms", label: "Bottoms" },
  { key: "shoes", label: "Shoes" },
  { key: "accessories", label: "Accessories" },
];

export default function WardrobeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items } = useCloset();
  const [activeCategory, setActiveCategory] = useState<"all" | ClothingCategory>("all");

  const filtered = useMemo(() => {
    if (activeCategory === "all") return items;
    return items.filter((i) => i.category === activeCategory);
  }, [items, activeCategory]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            My Closet
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {items.length} {items.length === 1 ? "item" : "items"}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(tabs)/add");
          }}
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: colors.foreground,
              borderRadius: 24,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={[styles.chipRow, { borderBottomColor: colors.border }]}
      >
        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c.key}
            label={c.label}
            selected={activeCategory === c.key}
            onPress={() => setActiveCategory(c.key)}
          />
        ))}
      </ScrollView>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="layers"
          title="Nothing here yet"
          subtitle="Add your first item to start building your digital wardrobe."
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
            {
              paddingBottom:
                (Platform.OS === "web" ? 34 : insets.bottom) + 90,
            },
          ]}
          renderItem={({ item }) => (
            <ClothingCard
              item={item}
              onPress={() => router.push(`/item/${item.id}`)}
            />
          )}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filtered.length}
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
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: {
    borderBottomWidth: 1,
  },
  chips: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 0,
  },
  grid: {
    paddingHorizontal: 10,
    paddingTop: 8,
  },
});
