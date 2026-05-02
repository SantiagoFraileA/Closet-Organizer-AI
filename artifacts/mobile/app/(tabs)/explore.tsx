import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/EmptyState";
import { OutfitItemRow } from "@/components/OutfitItemRow";
import { Outfit, useCloset } from "@/context/ClosetContext";
import { useColors } from "@/hooks/useColors";

function OutfitCard({ outfit }: { outfit: Outfit }) {
  const colors = useColors();
  const { items } = useCloset();
  const outfitItems = outfit.itemIds
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean);

  const paletteColors = outfitItems
    .map((i) => i?.colorHex)
    .filter(Boolean) as string[];

  return (
    <View
      style={[
        styles.outfitCard,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Color palette bar */}
      <View style={[styles.paletteLine, { borderRadius: colors.radius }]}>
        {paletteColors.map((c, i) => (
          <View
            key={i}
            style={[styles.paletteSegment, { backgroundColor: c, flex: 1 }]}
          />
        ))}
      </View>
      <View style={styles.outfitBody}>
        <View style={styles.outfitMeta}>
          <View
            style={[
              styles.scorePill,
              { backgroundColor: "#3730A3" + "18", borderRadius: 8 },
            ]}
          >
            <Feather name="zap" size={11} color="#3730A3" />
            <Text style={[styles.scoreText, { color: "#3730A3" }]}>
              Bold pick
            </Text>
          </View>
          <Text style={[styles.matchText, { color: colors.mutedForeground }]}>
            {Math.round(outfit.styleScore * 100)}% match
          </Text>
        </View>
        {outfitItems.map(
          (item) => item && <OutfitItemRow key={item.id} item={item} />
        )}
      </View>
    </View>
  );
}

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, generateOutfits } = useCloset();
  const [outfits, setOutfits] = useState<Outfit[]>([]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    if (items.length > 1) {
      setOutfits(generateOutfits(true));
    }
  }, [items.length]);

  const handleRefresh = () => {
    Haptics.selectionAsync();
    setOutfits(generateOutfits(true));
  };

  const hasCombos =
    items.filter((i) => i.category === "tops").length > 0 &&
    items.filter((i) => i.category === "bottoms").length > 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Explore
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Bold combinations awaiting you
          </Text>
        </View>
        <Pressable
          onPress={handleRefresh}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Feather name="refresh-cw" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Hero banner */}
      <LinearGradient
        colors={["#3730A3", "#1E3A5F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderRadius: colors.radius, margin: 20, marginBottom: 4 }]}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroIcon}>
            <Feather name="zap" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Comfort Zone Mode</Text>
            <Text style={styles.heroSubtitle}>
              Outfits that push boundaries and expand your style vocabulary.
            </Text>
          </View>
        </View>
        <View style={styles.heroDots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.heroDot,
                { opacity: i === 0 ? 1 : 0.4, borderRadius: 4 },
              ]}
            />
          ))}
        </View>
      </LinearGradient>

      {/* Style insights row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.insightRow}
      >
        {[
          { icon: "shuffle" as const, label: "Color Play", count: outfits.filter(o => o.isComfortZone).length },
          { icon: "layers" as const, label: "New Combos", count: Math.floor(outfits.length * 1.3) },
          { icon: "trending-up" as const, label: "Style Score", count: "Up 12%" },
        ].map((stat, i) => (
          <View
            key={i}
            style={[
              styles.insightCard,
              {
                backgroundColor: colors.card,
                borderRadius: colors.radius,
                borderColor: colors.border,
              },
            ]}
          >
            <Feather name={stat.icon} size={18} color={colors.accent} />
            <Text style={[styles.insightCount, { color: colors.foreground }]}>
              {stat.count}
            </Text>
            <Text
              style={[styles.insightLabel, { color: colors.mutedForeground }]}
            >
              {stat.label}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Outfits list */}
      {!hasCombos ? (
        <EmptyState
          icon="layers"
          title="Need more items"
          subtitle="Add tops and bottoms to unlock bold combination ideas."
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            {
              paddingBottom:
                (Platform.OS === "web" ? 34 : insets.bottom) + 90,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {outfits.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  hero: {
    padding: 20,
  },
  heroContent: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: { flex: 1 },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    lineHeight: 20,
  },
  heroDots: {
    flexDirection: "row",
    gap: 4,
    marginTop: 16,
  },
  heroDot: {
    width: 24,
    height: 4,
    backgroundColor: "#FFFFFF",
  },
  insightRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  insightCard: {
    width: 110,
    padding: 14,
    gap: 4,
    borderWidth: 1,
  },
  insightCount: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  insightLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
    paddingTop: 4,
  },
  outfitCard: {
    borderWidth: 1,
    overflow: "hidden",
  },
  paletteLine: {
    flexDirection: "row",
    height: 6,
  },
  paletteSegment: {
    height: "100%",
  },
  outfitBody: {
    padding: 16,
  },
  outfitMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  matchText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
