import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
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

interface ClosetScore {
  score: number;
  missing: string[];
  tip: string;
}

function computeClosetScore(items: import("@/context/ClosetContext").ClothingItem[]): ClosetScore {
  const tops       = items.filter(i => i.category === "tops");
  const bottoms    = items.filter(i => i.category === "bottoms");
  const shoes      = items.filter(i => i.category === "shoes");
  const colors     = items.map(i => (i.color ?? "").toLowerCase());

  const hasColor = (c: string) => colors.some(col => col.includes(c));

  let score = 0;
  const missing: string[] = [];

  // Tops — 25 pts max (5 items × 5)
  score += Math.min(tops.length, 5) * 5;
  if (tops.length < 3) missing.push("Más tops básicos");

  // Bottoms — 25 pts max (5 items × 5)
  score += Math.min(bottoms.length, 5) * 5;
  if (bottoms.length < 3) missing.push("Más pantalones versátiles");

  // Shoes — 20 pts max (2 items × 10)
  score += Math.min(shoes.length, 2) * 10;
  if (shoes.length === 0) missing.push("Tenis o zapatos básicos");

  // Neutral colors — 20 pts max (4 neutrals × 5)
  const neutrals = ["white", "blanco", "black", "negro", "grey", "gray", "gris", "beige", "navy", "azul marino", "cream", "crema"];
  const neutralHits = new Set(neutrals.filter(n => hasColor(n))).size;
  score += Math.min(neutralHits, 4) * 5;
  if (!hasColor("white") && !hasColor("blanco")) missing.push("Top o playera blanca");
  if (!hasColor("black") && !hasColor("negro"))  missing.push("Prenda negra básica");

  // Balance bonus — 10 pts
  const diff = Math.abs(tops.length - bottoms.length);
  if (diff <= 1)      score += 10;
  else if (diff <= 3) score += 5;

  score = Math.min(score, 100);

  const tip = missing.length === 0
    ? "¡Excelente closet! Sigue agregando variedad para más creatividad."
    : `Agrega ${missing[0].toLowerCase()} para multiplicar tus outfits posibles.`;

  return { score, missing, tip };
}

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
  const topsCount = items.filter(i => i.category === "tops").length;
  const bottomsCount = items.filter(i => i.category === "bottoms").length;
  const totalCombos = topsCount * bottomsCount;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const closetScore = useMemo(() => computeClosetScore(items), [items]);

  useEffect(() => {
    if (items.length > 1) setOutfits(generateOutfits("bold"));
  }, [items.length]);

  const handleRefresh = () => {
    Haptics.selectionAsync();
    setOutfits(generateOutfits("bold"));
  };

  const hasCombos =
    items.filter((i) => i.category === "tops").length > 0 &&
    items.filter((i) => i.category === "bottoms").length > 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Sticky header */}
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
          style={({ pressed }) => [
            styles.refreshBtn,
            {
              backgroundColor: colors.secondary,
              borderRadius: 20,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="refresh-cw" size={18} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Single scrollable body */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          {
            paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 90,
          },
        ]}
      >
        {/* Hero banner */}
        <LinearGradient
          colors={["#3730A3", "#1E3A5F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderRadius: colors.radius }]}
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

        {/* Stats row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.insightRow}
        >
          {[
            { icon: "zap" as const,    label: "Bold Picks", count: outfits.length || "—" },
            { icon: "layers" as const,      label: "Combos",        count: totalCombos || "—" },
            { icon: "bar-chart-2" as const, label: "Closet Score",  count: closetScore.score },
          ].map((stat, i) => (
            <View
              key={i}
              style={[
                styles.insightCard,
                { backgroundColor: colors.secondary, borderRadius: colors.radius, borderColor: colors.border },
              ]}
            >
              <Feather name={stat.icon} size={18} color={colors.accent} />
              <Text style={[styles.insightCount, { color: colors.foreground }]}>{stat.count}</Text>
              <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Closet Score card — always visible, computed locally */}
        <View style={[styles.aiCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 20, marginBottom: 8 }]}>
          {/* Score bar */}
          <View style={styles.scoreBarWrap}>
            <View style={[styles.scoreBarBg, { backgroundColor: colors.secondary }]}>
              <View style={[styles.scoreBarFill, {
                width: `${closetScore.score}%` as any,
                backgroundColor: closetScore.score >= 70 ? "#2D6A4F" : closetScore.score >= 50 ? colors.accent : "#E05252",
              }]} />
            </View>
            <Text style={[styles.scoreNum, { color: colors.foreground }]}>
              {closetScore.score}<Text style={[styles.scoreOf, { color: colors.mutedForeground }]}>/100</Text>
            </Text>
          </View>

          {closetScore.missing.length > 0 && (
            <View style={styles.missingSection}>
              <Text style={[styles.missingLabel, { color: colors.mutedForeground }]}>BÁSICOS QUE TE FALTAN</Text>
              <View style={styles.missingPills}>
                {closetScore.missing.map((item, idx) => (
                  <View key={idx} style={[styles.missingPill, { backgroundColor: "#E05252" + "14", borderColor: "#E05252" + "40" }]}>
                    <Feather name="plus-circle" size={11} color="#E05252" />
                    <Text style={[styles.missingPillText, { color: "#E05252" }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.tipRow, { backgroundColor: colors.accent + "10", borderRadius: 8 }]}>
            <Feather name="star" size={13} color={colors.accent} />
            <Text style={[styles.tipText, { color: colors.foreground }]}>{closetScore.tip}</Text>
          </View>
        </View>

        {/* Outfits list */}
        {!hasCombos ? (
          <EmptyState
            icon="layers"
            title="Need more items"
            subtitle="Add tops and bottoms to unlock bold combination ideas."
          />
        ) : (
          <View style={styles.list}>
            {outfits.map((outfit) => (
              <OutfitCard key={outfit.id} outfit={outfit} />
            ))}
          </View>
        )}
      </ScrollView>
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
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 18,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollBody: {
    paddingTop: 20,
    gap: 0,
  },
  hero: {
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 4,
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
  aiCard: { borderWidth: 1, padding: 16, gap: 12, marginTop: 4 },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  aiTitle: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  trendPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  trendText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  scoreBarWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  scoreBarFill: { height: "100%", borderRadius: 4 },
  scoreNum: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold", minWidth: 52, textAlign: "right" },
  scoreOf: { fontSize: 12, fontFamily: "Inter_400Regular" },
  missingSection: { gap: 8 },
  missingLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
  missingPills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  missingPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  missingPillText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10 },
  tipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  list: {
    paddingHorizontal: 20,
    gap: 12,
    paddingTop: 8,
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
