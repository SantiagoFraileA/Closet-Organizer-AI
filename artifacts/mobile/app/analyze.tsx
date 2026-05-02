import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
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
import { api } from "@/utils/api";

type StyleType = "casual" | "formal" | "streetwear" | "sport" | "bohemian" | "minimalist";
type ZoneKey = "top" | "upper-middle" | "lower-middle" | "bottom" | "full";

interface DetectedItem {
  name: string;
  category: ClothingCategory;
  color: string;
  colorHex: string;
  style: StyleType;
  tags: string[];
  confirmed: boolean;
  imageThumb: string | null;
}

// Vertical zones — fractions of image height (yMin, yMax)
const ZONES: { key: ZoneKey; label: string; icon: string; yMin: number; yMax: number }[] = [
  { key: "top", label: "Head / Neck", icon: "arrow-up", yMin: 0, yMax: 0.42 },
  { key: "upper-middle", label: "Torso / Jacket", icon: "wind", yMin: 0.18, yMax: 0.62 },
  { key: "lower-middle", label: "Waist / Pants", icon: "align-justify", yMin: 0.44, yMax: 0.82 },
  { key: "bottom", label: "Shoes / Feet", icon: "arrow-down", yMin: 0.68, yMax: 1.0 },
  { key: "full", label: "Full / Accessories", icon: "maximize", yMin: 0, yMax: 1.0 },
];

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
  return COLOR_PRESETS.reduce(
    (prev, c) => {
      const d = colorDist(hex, c.hex);
      return d < prev.dist ? { c, dist: d } : prev;
    },
    { c: COLOR_PRESETS[0], dist: Infinity }
  ).c;
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

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// ─── Crop picker modal ────────────────────────────────────────────────────────

function CropPickerModal({
  visible,
  imageUri,
  onClose,
  onApply,
}: {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onApply: (thumb: string) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedZone, setSelectedZone] = useState<ZoneKey>("full");
  const [cropping, setCropping] = useState(false);
  const [previewThumb, setPreviewThumb] = useState<string | null>(null);

  const screenW = Dimensions.get("window").width;
  const previewH = Math.min(300, screenW * 0.75);

  async function buildPreview(zone: ZoneKey) {
    if (Platform.OS === "web" || !imageUri) return;
    try {
      const z = ZONES.find((z) => z.key === zone)!;
      const img = await ImageManipulator.manipulateAsync(imageUri, [], {});
      const W = img.width;
      const H = img.height;
      const hPad = Math.round(W * 0.04);
      const originX = hPad;
      const originY = Math.round(H * z.yMin);
      const width = Math.max(1, W - hPad * 2);
      const height = Math.max(1, Math.round(H * (z.yMax - z.yMin)));

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { crop: { originX, originY, width, height } },
          { resize: { width: 400 } },
        ],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      setPreviewThumb(result.base64 ?? null);
    } catch {
      setPreviewThumb(null);
    }
  }

  function selectZone(zone: ZoneKey) {
    setSelectedZone(zone);
    setPreviewThumb(null);
    buildPreview(zone);
    Haptics.selectionAsync();
  }

  async function apply() {
    if (Platform.OS === "web" || !imageUri) { onClose(); return; }
    setCropping(true);
    try {
      const z = ZONES.find((z) => z.key === selectedZone)!;
      const img = await ImageManipulator.manipulateAsync(imageUri, [], {});
      const W = img.width;
      const H = img.height;
      const hPad = Math.round(W * 0.04);
      const originX = hPad;
      const originY = Math.round(H * z.yMin);
      const width = Math.max(1, W - hPad * 2);
      const height = Math.max(1, Math.round(H * (z.yMax - z.yMin)));

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { crop: { originX, originY, width, height } },
          { resize: { width: 200, height: 200 } },
        ],
        { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (result.base64) {
        onApply(result.base64);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // silently fail
    } finally {
      setCropping(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[cropStyles.overlay]}>
        <View
          style={[
            cropStyles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Handle */}
          <View style={[cropStyles.handle, { backgroundColor: colors.border }]} />

          <Text style={[cropStyles.title, { color: colors.foreground }]}>
            Choose crop zone
          </Text>
          <Text style={[cropStyles.subtitle, { color: colors.mutedForeground }]}>
            Select the area of the outfit photo to save for this item
          </Text>

          {/* Full image reference */}
          <Image
            source={{ uri: imageUri }}
            style={[cropStyles.fullImage, { borderColor: colors.border }]}
            resizeMode="cover"
          />

          {/* Zone buttons */}
          <View style={cropStyles.zoneList}>
            {ZONES.map((z) => {
              const active = selectedZone === z.key;
              return (
                <Pressable
                  key={z.key}
                  onPress={() => selectZone(z.key)}
                  style={[
                    cropStyles.zoneBtn,
                    {
                      backgroundColor: active ? colors.foreground : colors.secondary,
                      borderRadius: 12,
                      flex: 1,
                    },
                  ]}
                >
                  <Feather
                    name={z.icon as any}
                    size={14}
                    color={active ? colors.primaryForeground : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      cropStyles.zoneBtnText,
                      { color: active ? colors.primaryForeground : colors.mutedForeground },
                    ]}
                    numberOfLines={2}
                  >
                    {z.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Preview of selected crop */}
          <View style={[cropStyles.previewBox, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
            {previewThumb ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${previewThumb}` }}
                style={cropStyles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={cropStyles.previewPlaceholder}>
                <Feather name="crop" size={22} color={colors.mutedForeground} />
                <Text style={[cropStyles.previewHint, { color: colors.mutedForeground }]}>
                  {Platform.OS === "web" ? "Preview on device" : "Select a zone to preview"}
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={cropStyles.actions}>
            <Pressable
              onPress={onClose}
              style={[cropStyles.cancelBtn, { backgroundColor: colors.secondary, borderRadius: 12 }]}
            >
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={apply}
              disabled={cropping}
              style={[cropStyles.applyBtn, { backgroundColor: colors.accent, borderRadius: 12, flex: 1 }]}
            >
              {cropping ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                    Apply crop
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Item card ────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  index,
  onChange,
  onEditCrop,
}: {
  item: DetectedItem;
  index: number;
  onChange: (idx: number, patch: Partial<DetectedItem>) => void;
  onEditCrop: (idx: number) => void;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(true);

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
      {/* Header */}
      <Pressable onPress={() => setExpanded((e) => !e)} style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {/* Thumbnail + edit button */}
          <View>
            {item.imageThumb ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${item.imageThumb}` }}
                style={[styles.thumbImage, { borderColor: colors.border }]}
              />
            ) : (
              <View style={[styles.colorDot, { backgroundColor: item.colorHex, borderColor: colors.border }]} />
            )}
            <Pressable
              onPress={(e) => { e.stopPropagation(); onEditCrop(index); }}
              style={[styles.editCropBtn, { backgroundColor: colors.foreground }]}
              hitSlop={8}
            >
              <Feather name="crop" size={10} color={colors.primaryForeground} />
            </Pressable>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
              {CATEGORIES.find((c) => c.key === item.category)?.label} · {item.color} · {item.style}
            </Text>
          </View>
        </View>
        <View style={styles.cardHeaderRight}>
          {item.confirmed && <Feather name="check-circle" size={18} color={colors.accent} />}
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
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>NAME</Text>
            <TextInput
              value={item.name}
              onChangeText={(v) => onChange(index, { name: v })}
              style={[
                styles.textInput,
                { backgroundColor: colors.secondary, color: colors.foreground, borderRadius: 10 },
              ]}
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>CATEGORY</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => { onChange(index, { category: c.key }); Haptics.selectionAsync(); }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: item.category === c.key ? colors.foreground : colors.secondary,
                      borderRadius: 8,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: item.category === c.key ? colors.primaryForeground : colors.mutedForeground },
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
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>STYLE</Text>
            <View style={styles.chipRow}>
              {STYLES.map((s) => (
                <Pressable
                  key={s.key}
                  onPress={() => { onChange(index, { style: s.key }); Haptics.selectionAsync(); }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: item.style === s.key ? colors.accent : colors.secondary,
                      borderRadius: 8,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: item.style === s.key ? "#FFFFFF" : colors.mutedForeground },
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
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>COLOR</Text>
            <View style={styles.colorRow}>
              {COLOR_PRESETS.map((c) => (
                <Pressable
                  key={c.hex}
                  onPress={() => { onChange(index, { color: c.label, colorHex: c.hex }); Haptics.selectionAsync(); }}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: c.hex,
                      borderWidth: item.colorHex === c.hex ? 3 : 1.5,
                      borderColor: item.colorHex === c.hex ? colors.accent : colors.border,
                      borderRadius: 20,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.colorName, { color: colors.mutedForeground }]}>{item.color}</Text>
          </View>

          {/* Confirm */}
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
                backgroundColor: item.confirmed ? colors.accent : colors.foreground,
                borderRadius: 12,
              },
            ]}
          >
            <Feather name={item.confirmed ? "check" : "plus"} size={16} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>
              {item.confirmed ? "Confirmed" : "Add to Closet"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => { analyzeImage(); }, []);

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
        setError(json.message ?? json.error ?? "Error analyzing the image");
        return;
      }

      const detected: DetectedItem[] = (json.items ?? []).map((item: any) => ({
        name: item.name ?? "Clothing item",
        category: (["tops", "bottoms", "shoes", "accessories"].includes(item.category)
          ? item.category : "tops") as ClothingCategory,
        color: item.color ?? "Unknown",
        colorHex: /^#[0-9A-Fa-f]{6}$/.test(item.colorHex)
          ? item.colorHex
          : getClosestPreset(item.colorHex ?? "#9E9E9E").hex,
        style: (["casual", "formal", "streetwear", "sport", "bohemian", "minimalist"].includes(item.style)
          ? item.style : "casual") as StyleType,
        tags: Array.isArray(item.tags) ? item.tags : [],
        confirmed: true,
        imageThumb: item.imageThumb ?? null,
      }));

      setItems(detected);
    } catch {
      setError("Connection error. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  }

  function updateItem(idx: number, patch: Partial<DetectedItem>) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  function applyCrop(thumb: string) {
    if (editingIndex === null) return;
    updateItem(editingIndex, { imageThumb: thumb });
    setEditingIndex(null);
  }

  async function saveConfirmed() {
    const toSave = items.filter((i) => i.confirmed);
    if (toSave.length === 0) return;

    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const itemsWithIds = toSave.map((item) => ({ ...item, id: makeId() }));

    for (const item of itemsWithIds) {
      addItem({
        imageUri: params.imageUri ?? null,
        imageThumb: item.imageThumb,
        name: item.name,
        category: item.category,
        color: item.color,
        colorHex: item.colorHex,
        tags: [...item.tags, item.style],
      });
    }

    api
      .saveItems(
        itemsWithIds.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          color: item.color,
          colorHex: item.colorHex,
          tags: [...item.tags, item.style],
          imageThumb: item.imageThumb,
        }))
      )
      .catch((err) => console.warn("[analyze] DB persist failed:", err));

    router.replace("/(tabs)/");
  }

  const confirmedCount = items.filter((i) => i.confirmed).length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Crop picker modal */}
      {editingIndex !== null && (
        <CropPickerModal
          visible
          imageUri={params.imageUri}
          onClose={() => setEditingIndex(null)}
          onApply={applyCrop}
        />
      )}

      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI Analysis</Text>
          {!loading && items.length > 0 && (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {items.length} item{items.length !== 1 ? "s" : ""} detected
            </Text>
          )}
        </View>
        <Pressable onPress={analyzeImage} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Analyzing your outfit...</Text>
          <Text style={[styles.loadingHint, { color: colors.mutedForeground }]}>
            AI is identifying and cropping each garment
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={40} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
          <Pressable
            onPress={analyzeImage}
            style={[styles.retryBtn, { backgroundColor: colors.foreground, borderRadius: 12 }]}
          >
            <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Try again</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Feather name="search" size={40} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>No items detected</Text>
          <Text style={[styles.loadingHint, { color: colors.mutedForeground }]}>
            Try a clearer photo with better lighting
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.retryBtn, { backgroundColor: colors.secondary, borderRadius: 12 }]}
          >
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Go back</Text>
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
              Tap the crop icon on any thumbnail to adjust it
            </Text>
            {items.map((item, i) => (
              <ItemCard
                key={i}
                item={item}
                index={i}
                onChange={updateItem}
                onEditCrop={setEditingIndex}
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
                  backgroundColor: confirmedCount > 0 ? colors.foreground : colors.secondary,
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
                    color={confirmedCount > 0 ? colors.primaryForeground : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.saveBtnText,
                      { color: confirmedCount > 0 ? colors.primaryForeground : colors.mutedForeground },
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

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  headerTitle: { fontSize: 17, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  loadingText: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  loadingHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  errorText: { fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  listHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 4 },
  card: { overflow: "hidden" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  cardHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  thumbImage: { width: 52, height: 52, borderRadius: 10, borderWidth: 1 },
  colorDot: { width: 52, height: 52, borderRadius: 26, borderWidth: 1 },
  editCropBtn: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  cardMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  cardBody: { borderTopWidth: 1, padding: 16, gap: 16 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
  textInput: { height: 44, paddingHorizontal: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  swatch: { width: 32, height: 32 },
  colorName: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  confirmBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
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
  saveBtnText: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});

const cropStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: -6,
  },
  fullImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
  },
  zoneList: {
    flexDirection: "row",
    gap: 6,
  },
  zoneBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 4,
    minHeight: 60,
  },
  zoneBtnText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 13,
  },
  previewBox: {
    width: "100%",
    height: 130,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewPlaceholder: {
    alignItems: "center",
    gap: 8,
  },
  previewHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
});
