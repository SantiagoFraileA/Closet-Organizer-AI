import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ClothingCategory, useCloset } from "@/context/ClosetContext";
import { useColors } from "@/hooks/useColors";

type StyleType = "casual" | "formal" | "streetwear" | "sport" | "bohemian" | "minimalist";

interface DetectedItem {
  name: string;
  category: ClothingCategory;
  color: string;
  colorHex: string;
  style: StyleType;
  tags: string[];
  confirmed: boolean;
  imageUri?: string;
}

const CATEGORIES: Array<{ key: ClothingCategory; label: string }> = [
  { key: "tops", label: "Top" },
  { key: "bottoms", label: "Bottom" },
  { key: "shoes", label: "Shoes" },
  { key: "accessories", label: "Accessory" },
];

const STYLES: Array<{ key: StyleType; label: string }> = [
  { key: "casual", label: "Casual" },
  { key: "formal", label: "Formal" },
  { key: "streetwear", label: "Street" },
  { key: "sport", label: "Sport" },
  { key: "bohemian", label: "Boho" },
  { key: "minimalist", label: "Minimal" },
];

const COLOR_PRESETS = [
  { label: "Black", hex: "#1C1917" },
  { label: "White", hex: "#F5F5F0" },
  { label: "Navy", hex: "#1E3A5F" },
  { label: "Camel", hex: "#C4956A" },
  { label: "Cream", hex: "#F5F0E8" },
  { label: "Indigo", hex: "#3730A3" },
  { label: "Sage", hex: "#7D9B7B" },
  { label: "Blush", hex: "#E8A598" },
  { label: "Burgundy", hex: "#7C2D3A" },
  { label: "Grey", hex: "#9E9E9E" },
  { label: "Brown", hex: "#8B6914" },
  { label: "Green", hex: "#2D6A4F" },
];

function getClosestPreset(hex: string) {
  const best = COLOR_PRESETS.reduce(
    (prev, c) => {
      const d = colorDist(hex, c.hex);
      return d < prev.dist ? { c, dist: d } : prev;
    },
    { c: COLOR_PRESETS[0], dist: Infinity }
  );
  return best.c;
}

function colorDist(a: string, b: string) {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
}

function ItemCard({
  item,
  index,
  onChange,
  imageUri,
}: {
  item: DetectedItem;
  index: number;
  onChange: (idx: number, patch: Partial<DetectedItem>) => void;
  imageUri: string | null;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(true);

  const closestPreset = getClosestPreset(item.colorHex);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: item.confirmed ? colors.accent : colors.border,
          borderRadius: 16,
          borderWidth: item.confirmed ? 2 : 1,
        },
      ]}
    >
      {/* Card header */}
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={styles.cardHeader}
      >
        <View style={styles.cardHeaderLeft}>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: item.colorHex, borderColor: colors.border },
            ]}
          />
          <View>
            <Text style={[styles.cardName, { color: colors.foreground }]}>
              {item.name}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
              {CATEGORIES.find((c) => c.key === item.category)?.label} · {item.color} · {item.style}
            </Text>
          </View>
        </View>
        <View style={styles.cardHeaderRight}>
          {item.confirmed && (
            <Feather name="check-circle" size={18} color={colors.accent} />
          )}
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.mutedForeground}
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
          {/* Name */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              NAME
            </Text>
            <TextInput
              value={item.name}
              onChangeText={(v) => onChange(index, { name: v })}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.secondary,
                  color: colors.foreground,
                  borderRadius: 10,
                },
              ]}
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              CATEGORY
            </Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => {
                    onChange(index, { category: c.key });
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        item.category === c.key
                          ? colors.foreground
                          : colors.secondary,
                      borderRadius: 8,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          item.category === c.key
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Style */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              STYLE
            </Text>
            <View style={styles.chipRow}>
              {STYLES.map((s) => (
                <Pressable
                  key={s.key}
                  onPress={() => {
                    onChange(index, { style: s.key });
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        item.style === s.key
                          ? colors.accent
                          : colors.secondary,
                      borderRadius: 8,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          item.style === s.key
                            ? "#FFFFFF"
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Color */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              COLOR
            </Text>
            <View style={styles.colorRow}>
              {COLOR_PRESETS.map((c) => (
                <Pressable
                  key={c.hex}
                  onPress={() => {
                    onChange(index, { color: c.label, colorHex: c.hex });
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: c.hex,
                      borderWidth: item.colorHex === c.hex ? 3 : 1.5,
                      borderColor:
                        item.colorHex === c.hex ? colors.accent : colors.border,
                      borderRadius: 20,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.colorName, { color: colors.mutedForeground }]}>
              {item.color}
            </Text>
          </View>

          {/* Confirm / Remove */}
          <View style={styles.cardActions}>
            <Pressable
              onPress={() => {
                onChange(index, { confirmed: !item.confirmed });
                Haptics.notificationAsync(
                  item.confirmed
                    ? Haptics.NotificationFeedbackType.Warning
                    : Haptics.NotificationFeedbackType.Success
                );
              }}
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: item.confirmed
                    ? colors.accent
                    : colors.foreground,
                  borderRadius: 12,
                  flex: 1,
                },
              ]}
            >
              <Feather
                name={item.confirmed ? "check" : "plus"}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.confirmBtnText}>
                {item.confirmed ? "Confirmed" : "Add to Closet"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export default function AnalyzeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addItem } = useCloset();
  const params = useLocalSearchParams<{ imageUri: string; imageBase64: string; mimeType: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    analyzeImage();
  }, []);

  async function analyzeImage() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/analyze-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: params.imageBase64,
          mimeType: params.mimeType ?? "image/jpeg",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Error analyzing the image");
        return;
      }

      const detected: DetectedItem[] = (json.items ?? []).map((item: any) => ({
        name: item.name ?? "Clothing item",
        category: (["tops", "bottoms", "shoes", "accessories"].includes(item.category)
          ? item.category
          : "tops") as ClothingCategory,
        color: item.color ?? "Unknown",
        colorHex: /^#[0-9A-Fa-f]{6}$/.test(item.colorHex)
          ? item.colorHex
          : getClosestPreset(item.colorHex ?? "#9E9E9E").hex,
        style: (["casual", "formal", "streetwear", "sport", "bohemian", "minimalist"].includes(item.style)
          ? item.style
          : "casual") as StyleType,
        tags: Array.isArray(item.tags) ? item.tags : [],
        confirmed: true,
        imageUri: params.imageUri,
      }));

      setItems(detected);
    } catch (err: any) {
      setError("Connection error. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  }

  function updateItem(idx: number, patch: Partial<DetectedItem>) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  async function saveConfirmed() {
    const toSave = items.filter((i) => i.confirmed);
    if (toSave.length === 0) return;

    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    for (const item of toSave) {
      addItem({
        imageUri: item.imageUri ?? null,
        name: item.name,
        category: item.category,
        color: item.color,
        colorHex: item.colorHex,
        tags: [...item.tags, item.style],
      });
    }

    router.replace("/(tabs)/");
  }

  const confirmedCount = items.filter((i) => i.confirmed).length;

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
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            AI Analysis
          </Text>
          {!loading && items.length > 0 && (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {items.length} item{items.length !== 1 ? "s" : ""} detected
            </Text>
          )}
        </View>
        <Pressable
          onPress={analyzeImage}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Analyzing your outfit...
          </Text>
          <Text style={[styles.loadingHint, { color: colors.mutedForeground }]}>
            AI is identifying each garment
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={40} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>
            {error}
          </Text>
          <Pressable
            onPress={analyzeImage}
            style={[
              styles.retryBtn,
              { backgroundColor: colors.foreground, borderRadius: 12 },
            ]}
          >
            <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>
              Try again
            </Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Feather name="search" size={40} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>
            No items detected
          </Text>
          <Text style={[styles.loadingHint, { color: colors.mutedForeground }]}>
            Try a clearer photo with better lighting
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.retryBtn,
              { backgroundColor: colors.secondary, borderRadius: 12 },
            ]}
          >
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
              Go back
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[
              styles.list,
              { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.listHint, { color: colors.mutedForeground }]}>
              Review each item detected by AI. Edit anything before adding to your closet.
            </Text>
            {items.map((item, i) => (
              <ItemCard
                key={i}
                item={item}
                index={i}
                onChange={updateItem}
                imageUri={params.imageUri}
              />
            ))}
          </ScrollView>

          {/* Save bar */}
          <View
            style={[
              styles.saveBar,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
                paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 8,
              },
            ]}
          >
            <Pressable
              onPress={saveConfirmed}
              disabled={confirmedCount === 0 || saving}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor:
                    confirmedCount > 0 ? colors.foreground : colors.secondary,
                  borderRadius: 14,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Feather
                    name="check-circle"
                    size={18}
                    color={
                      confirmedCount > 0
                        ? colors.primaryForeground
                        : colors.mutedForeground
                    }
                  />
                  <Text
                    style={[
                      styles.saveBtnText,
                      {
                        color:
                          confirmedCount > 0
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    Add {confirmedCount} item{confirmedCount !== 1 ? "s" : ""} to Closet
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </>
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
  headerCenter: { alignItems: "center" },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  loadingHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  errorText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  listHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 4,
  },
  card: {
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  cardBody: {
    borderTopWidth: 1,
    padding: 16,
    gap: 16,
  },
  field: { gap: 8 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
  },
  textInput: {
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  swatch: {
    width: 32,
    height: 32,
  },
  colorName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  saveBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
