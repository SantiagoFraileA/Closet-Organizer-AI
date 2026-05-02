import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
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

const SUBCATEGORIES: Record<ClothingCategory, string[]> = {
  tops:        ["Shirt", "T-Shirt", "Tank Top", "Hoodie", "Sweater", "Cardigan", "Blazer", "Jacket", "Coat"],
  bottoms:     ["Jeans", "Trousers", "Shorts", "Skirt", "Leggings", "Sweatpants"],
  shoes:       ["Sneakers", "Boots", "Loafers", "Sandals", "Heels", "Dress Shoes"],
  accessories: ["Bag", "Belt", "Hat", "Watch", "Jewelry", "Sunglasses", "Scarf"],
};

function inferSubcategory(name: string, category: ClothingCategory): string {
  const n = name.toLowerCase();
  const map: Record<ClothingCategory, Array<[string[], string]>> = {
    tops: [
      [["blazer"],                        "Blazer"],
      [["trench", "overcoat"],            "Coat"],
      [["coat"],                          "Coat"],
      [["jacket", "denim jack"],          "Jacket"],
      [["hoodie", "sweatshirt"],          "Hoodie"],
      [["cardigan"],                      "Cardigan"],
      [["sweater", "pullover", "knit", "turtleneck", "knitwear"], "Sweater"],
      [["tank", "sleeveless", "camisole","singlet"],              "Tank Top"],
      [["t-shirt", "tshirt", "tee"],      "T-Shirt"],
      [["shirt", "button", "oxford", "linen", "polo", "flannel"], "Shirt"],
    ],
    bottoms: [
      [["jeans", "denim"],                "Jeans"],
      [["shorts"],                        "Shorts"],
      [["skirt"],                         "Skirt"],
      [["leggings"],                      "Leggings"],
      [["jogger", "sweatpant"],           "Sweatpants"],
      [["trousers", "pants", "slacks", "chinos", "khaki"], "Trousers"],
    ],
    shoes: [
      [["sneaker", "trainer", "runner"],  "Sneakers"],
      [["boot", "chelsea", "combat"],     "Boots"],
      [["loafer", "moccasin"],            "Loafers"],
      [["sandal", "slide"],               "Sandals"],
      [["heel", "pump", "stiletto"],      "Heels"],
      [["oxford", "derby", "dress shoe"], "Dress Shoes"],
    ],
    accessories: [
      [["bag", "backpack", "tote", "clutch", "purse", "satchel"], "Bag"],
      [["belt"],                          "Belt"],
      [["hat", "cap", "beanie", "fedora", "bucket hat"],          "Hat"],
      [["watch"],                         "Watch"],
      [["bracelet", "ring", "necklace", "earring", "chain"],      "Jewelry"],
      [["sunglasses", "glasses"],         "Sunglasses"],
      [["scarf", "shawl"],                "Scarf"],
    ],
  };
  for (const [keywords, sub] of map[category]) {
    if (keywords.some((k) => n.includes(k))) return sub;
  }
  return SUBCATEGORIES[category][0] ?? "";
}

interface DetectedItem {
  name: string;
  category: ClothingCategory;
  subcategory: string;
  color: string;
  colorHex: string;
  style: StyleType;
  tags: string[];
  confirmed: boolean;
  imageThumb: string | null;
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
  return COLOR_PRESETS.reduce(
    (prev, c) => { const d = colorDist(hex, c.hex); return d < prev.dist ? { c, dist: d } : prev; },
    { c: COLOR_PRESETS[0], dist: Infinity }
  ).c;
}

function colorDist(a: string, b: string) {
  const p = (h: string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [r1,g1,b1] = p(a); const [r2,g2,b2] = p(b);
  return Math.abs(r1-r2)+Math.abs(g1-g2)+Math.abs(b1-b2);
}

function makeId() { return Date.now().toString()+Math.random().toString(36).substr(2,9); }

const SCREEN_W = Dimensions.get("window").width;
const FRAME = Math.min(300, SCREEN_W - 48);

// ─── Free Crop Modal ──────────────────────────────────────────────────────────
// Tab A: Pinch & pan the outfit photo to select any area → square crop
// Tab B: Pick a brand-new photo from gallery (with native square crop)

function FreeCropModal({
  visible,
  imageUri,
  onClose,
  onApply,
}: {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onApply: (base64: string) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"crop" | "pick">("crop");
  const [origSize, setOrigSize] = useState({ w: 1, h: 1 });
  const scrollRef = useRef<ScrollView>(null);
  const scrollInfo = useRef({ x: 0, y: 0, zoom: 1 });
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (imageUri) Image.getSize(imageUri, (w, h) => setOrigSize({ w, h }));
  }, [imageUri]);

  // Display scale: fit image width to FRAME
  const pixelScale = FRAME / origSize.w;
  const scaledW = FRAME;
  const scaledH = origSize.h * pixelScale;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, zoomScale } = e.nativeEvent;
    scrollInfo.current = { x: contentOffset.x, y: contentOffset.y, zoom: zoomScale ?? 1 };
  }

  async function applyCrop() {
    if (Platform.OS === "web") { onClose(); return; }
    setApplying(true);
    try {
      const { x, y, zoom } = scrollInfo.current;
      // Convert scroll position back to original image coordinates
      const originX = Math.max(0, Math.round(x / (pixelScale * zoom)));
      const originY = Math.max(0, Math.round(y / (pixelScale * zoom)));
      const visibleSize = Math.round(FRAME / (pixelScale * zoom));
      const cropW = Math.min(origSize.w - originX, visibleSize);
      const cropH = Math.min(origSize.h - originY, visibleSize);

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { crop: { originX, originY, width: Math.max(1,cropW), height: Math.max(1,cropH) } },
          { resize: { width: 200, height: 200 } },
        ],
        { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (result.base64) { onApply(result.base64); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
    } catch { /* silently ignore */ }
    finally { setApplying(false); }
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,   // native crop UI
      aspect: [1, 1],
      quality: 0.6,
    });
    if (result.canceled) return;
    setApplying(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 200, height: 200 } }],
        { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (compressed.base64) { onApply(compressed.base64); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
    } catch { /* silently ignore */ }
    finally { setApplying(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={cs.overlay}>
        <View style={[cs.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={[cs.handle, { backgroundColor: colors.border }]} />

          <Text style={[cs.title, { color: colors.foreground }]}>Edit photo</Text>

          {/* Tabs */}
          <View style={[cs.tabRow, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
            {(["crop", "pick"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => { setTab(t); Haptics.selectionAsync(); }}
                style={[
                  cs.tab,
                  { backgroundColor: tab === t ? colors.foreground : "transparent", borderRadius: 10 },
                ]}
              >
                <Feather
                  name={t === "crop" ? "crop" : "image"}
                  size={14}
                  color={tab === t ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text style={[cs.tabText, { color: tab === t ? colors.primaryForeground : colors.mutedForeground }]}>
                  {t === "crop" ? "Crop outfit" : "New photo"}
                </Text>
              </Pressable>
            ))}
          </View>

          {tab === "crop" ? (
            <>
              {/* Square crop frame with zoomable/pannable image */}
              <View style={[cs.frame, { borderColor: colors.accent }]}>
                <ScrollView
                  ref={scrollRef}
                  maximumZoomScale={6}
                  minimumZoomScale={1}
                  bouncesZoom={false}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={onScroll}
                  style={{ width: FRAME, height: FRAME }}
                  contentContainerStyle={{ width: scaledW, height: scaledH }}
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={{ width: scaledW, height: scaledH }}
                    resizeMode="cover"
                  />
                </ScrollView>
                {/* Corner indicators */}
                {["tl","tr","bl","br"].map(p => (
                  <View key={p} style={[cs.corner, cs[p as keyof typeof cs] as any, { borderColor: colors.accent }]} />
                ))}
              </View>
              <Text style={[cs.hint, { color: colors.mutedForeground }]}>
                Pinch to zoom · Drag to reposition · The frame is your crop
              </Text>

              <View style={cs.actions}>
                <Pressable onPress={onClose} style={[cs.cancelBtn, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={applyCrop}
                  disabled={applying}
                  style={[cs.applyBtn, { backgroundColor: colors.accent, borderRadius: 12, flex: 1 }]}
                >
                  {applying ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Feather name="check" size={16} color="#fff" />
                      <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Apply crop</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={[cs.pickArea, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Feather name="image" size={36} color={colors.mutedForeground} />
                <Text style={[cs.pickTitle, { color: colors.foreground }]}>Choose from gallery</Text>
                <Text style={[cs.hint, { color: colors.mutedForeground, textAlign: "center" }]}>
                  Select a close-up photo of this item. You can crop it in the next step.
                </Text>
              </View>

              <View style={cs.actions}>
                <Pressable onPress={onClose} style={[cs.cancelBtn, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={pickFromGallery}
                  disabled={applying}
                  style={[cs.applyBtn, { backgroundColor: colors.foreground, borderRadius: 12, flex: 1 }]}
                >
                  {applying ? <ActivityIndicator color={colors.primaryForeground} /> : (
                    <>
                      <Feather name="folder" size={16} color={colors.primaryForeground} />
                      <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Open gallery</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({
  item, index, onChange, onEditCrop,
}: {
  item: DetectedItem; index: number;
  onChange: (i: number, p: Partial<DetectedItem>) => void;
  onEditCrop: (i: number) => void;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: item.confirmed ? colors.accent : colors.border, borderRadius: 16, borderWidth: item.confirmed ? 2 : 1 }]}>
      <Pressable onPress={() => setExpanded(e => !e)} style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <View>
            {item.imageThumb ? (
              <Image source={{ uri: `data:image/jpeg;base64,${item.imageThumb}` }} style={[s.thumb, { borderColor: colors.border }]} />
            ) : (
              <View style={[s.thumb, { backgroundColor: item.colorHex, borderColor: colors.border, borderRadius: 10 }]} />
            )}
            <Pressable
              onPress={e => { e.stopPropagation(); onEditCrop(index); }}
              style={[s.editBtn, { backgroundColor: colors.foreground }]}
              hitSlop={10}
            >
              <Feather name="edit-2" size={9} color={colors.primaryForeground} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[s.cardMeta, { color: colors.mutedForeground }]}>
              {CATEGORIES.find(c => c.key === item.category)?.label} · {item.color} · {item.style}
            </Text>
          </View>
        </View>
        <View style={s.cardHeaderRight}>
          {item.confirmed && <Feather name="check-circle" size={18} color={colors.accent} />}
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
        </View>
      </Pressable>

      {expanded && (
        <View style={[s.cardBody, { borderTopColor: colors.border }]}>
          <View style={s.field}>
            <Text style={[s.label, { color: colors.mutedForeground }]}>NAME</Text>
            <TextInput value={item.name} onChangeText={v => onChange(index, { name: v })}
              style={[s.input, { backgroundColor: colors.secondary, color: colors.foreground, borderRadius: 10 }]} />
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: colors.mutedForeground }]}>CATEGORY</Text>
            <View style={s.row}>
              {CATEGORIES.map(c => (
                <Pressable key={c.key} onPress={() => {
                  onChange(index, { category: c.key, subcategory: inferSubcategory(item.name, c.key) });
                  Haptics.selectionAsync();
                }}
                  style={[s.chip, { backgroundColor: item.category === c.key ? colors.foreground : colors.secondary, borderRadius: 8 }]}>
                  <Text style={[s.chipText, { color: item.category === c.key ? colors.primaryForeground : colors.mutedForeground }]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: colors.mutedForeground }]}>SUBCATEGORY</Text>
            <View style={s.row}>
              {SUBCATEGORIES[item.category].map(sub => (
                <Pressable key={sub} onPress={() => { onChange(index, { subcategory: sub }); Haptics.selectionAsync(); }}
                  style={[s.chip, { backgroundColor: item.subcategory === sub ? colors.accent : colors.secondary, borderRadius: 8 }]}>
                  <Text style={[s.chipText, { color: item.subcategory === sub ? "#fff" : colors.mutedForeground }]}>{sub}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: colors.mutedForeground }]}>STYLE</Text>
            <View style={s.row}>
              {STYLES.map(st => (
                <Pressable key={st.key} onPress={() => { onChange(index, { style: st.key }); Haptics.selectionAsync(); }}
                  style={[s.chip, { backgroundColor: item.style === st.key ? colors.accent : colors.secondary, borderRadius: 8 }]}>
                  <Text style={[s.chipText, { color: item.style === st.key ? "#fff" : colors.mutedForeground }]}>{st.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: colors.mutedForeground }]}>COLOR</Text>
            <View style={s.row}>
              {COLOR_PRESETS.map(c => (
                <Pressable key={c.hex} onPress={() => { onChange(index, { color: c.label, colorHex: c.hex }); Haptics.selectionAsync(); }}
                  style={[s.swatch, { backgroundColor: c.hex, borderWidth: item.colorHex === c.hex ? 3 : 1.5, borderColor: item.colorHex === c.hex ? colors.accent : colors.border, borderRadius: 20 }]} />
              ))}
            </View>
            <Text style={[s.colorName, { color: colors.mutedForeground }]}>{item.color}</Text>
          </View>

          <Pressable
            onPress={() => { onChange(index, { confirmed: !item.confirmed }); Haptics.notificationAsync(item.confirmed ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success); }}
            style={[s.confirmBtn, { backgroundColor: item.confirmed ? colors.accent : colors.foreground, borderRadius: 12 }]}>
            <Feather name={item.confirmed ? "check" : "plus"} size={16} color="#fff" />
            <Text style={s.confirmText}>{item.confirmed ? "Confirmed" : "Add to Closet"}</Text>
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
  const { addItem, addLook } = useCloset();
  const params = useLocalSearchParams<{ imageUri: string; imageBase64: string; mimeType: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saveLook, setSaveLook] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => { analyzeImage(); }, []);

  async function analyzeImage() {
    try {
      setLoading(true); setError(null);
      const res = await fetch("/api/analyze-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: params.imageBase64, mimeType: params.mimeType ?? "image/jpeg" }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message ?? json.error ?? "Error analyzing"); return; }
      setItems((json.items ?? []).map((item: any) => {
        const cat = (["tops","bottoms","shoes","accessories"].includes(item.category) ? item.category : "tops") as ClothingCategory;
        const name = item.name ?? "Clothing item";
        return {
          name,
          category: cat,
          subcategory: inferSubcategory(name, cat),
          color: item.color ?? "Unknown",
          colorHex: /^#[0-9A-Fa-f]{6}$/.test(item.colorHex) ? item.colorHex : getClosestPreset(item.colorHex ?? "#9E9E9E").hex,
          style: (["casual","formal","streetwear","sport","bohemian","minimalist"].includes(item.style) ? item.style : "casual") as StyleType,
          tags: Array.isArray(item.tags) ? item.tags : [],
          confirmed: true,
          imageThumb: item.imageThumb ?? null,
        };
      }));
    } catch { setError("Connection error. Make sure the server is running."); }
    finally { setLoading(false); }
  }

  function updateItem(idx: number, patch: Partial<DetectedItem>) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
  }

  async function saveConfirmed() {
    const toSave = items.filter(i => i.confirmed);
    if (!toSave.length) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const withIds = toSave.map(item => ({ ...item, id: makeId() }));

    // Save items locally
    for (const item of withIds) {
      addItem({ imageUri: params.imageUri ?? null, imageThumb: item.imageThumb, name: item.name, category: item.category, subcategory: item.subcategory, color: item.color, colorHex: item.colorHex, tags: [...item.tags, item.style] });
    }

    // Save outfit look (the full outfit composition)
    if (saveLook) {
      try {
        // Start with the original base64 as guaranteed fallback
        let lookThumb: string | null = params.imageBase64 ?? null;
        // Try to create a smaller version from the URI if available
        if (Platform.OS !== "web" && params.imageUri) {
          try {
            const compressed = await ImageManipulator.manipulateAsync(
              params.imageUri,
              [{ resize: { width: 500 } }],
              { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            lookThumb = compressed.base64 ?? lookThumb;
          } catch { /* keep original base64 */ }
        }
        addLook({
          name: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          imageThumb: lookThumb,
          itemNames: withIds.map(i => i.name),
        });
      } catch { /* ignore */ }
    }

    // Persist items to DB in background
    api.saveItems(withIds.map(item => ({ id: item.id, name: item.name, category: item.category, color: item.color, colorHex: item.colorHex, tags: [...item.tags, item.style], imageThumb: item.imageThumb })))
      .catch(err => console.warn("[analyze] DB persist failed:", err));

    router.replace("/(tabs)/outfits");
  }

  const confirmedCount = items.filter(i => i.confirmed).length;

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      {editingIndex !== null && (
        <FreeCropModal
          visible
          imageUri={params.imageUri}
          onClose={() => setEditingIndex(null)}
          onApply={(b64) => { updateItem(editingIndex, { imageThumb: b64 }); setEditingIndex(null); }}
        />
      )}

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>AI Analysis</Text>
          {!loading && items.length > 0 && (
            <Text style={[s.headerSub, { color: colors.mutedForeground }]}>{items.length} item{items.length !== 1 ? "s" : ""} detected</Text>
          )}
        </View>
        <Pressable onPress={analyzeImage} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[s.loadText, { color: colors.mutedForeground }]}>Analyzing your outfit...</Text>
          <Text style={[s.hint, { color: colors.mutedForeground }]}>AI is identifying and cropping each garment</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Feather name="alert-circle" size={40} color={colors.destructive} />
          <Text style={[s.errText, { color: colors.foreground }]}>{error}</Text>
          <Pressable onPress={analyzeImage} style={[s.btn, { backgroundColor: colors.foreground, borderRadius: 12 }]}>
            <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Try again</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={s.center}>
          <Feather name="search" size={40} color={colors.mutedForeground} />
          <Text style={[s.errText, { color: colors.foreground }]}>No items detected</Text>
          <Pressable onPress={() => router.back()} style={[s.btn, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Go back</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[s.list, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 130 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[s.listHint, { color: colors.mutedForeground }]}>
              Tap ✎ on any thumbnail to crop freely or upload a different photo
            </Text>
            {items.map((item, i) => (
              <ItemCard key={i} item={item} index={i} onChange={updateItem} onEditCrop={setEditingIndex} />
            ))}
          </ScrollView>

          {/* Save bar */}
          <View style={[s.saveBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 8 }]}>
            {/* Save look toggle */}
            <Pressable
              onPress={() => { setSaveLook(v => !v); Haptics.selectionAsync(); }}
              style={[s.lookToggle, { backgroundColor: saveLook ? colors.accent + "18" : colors.secondary, borderRadius: 10, borderColor: saveLook ? colors.accent : colors.border }]}
            >
              <Feather name={saveLook ? "check-square" : "square"} size={16} color={saveLook ? colors.accent : colors.mutedForeground} />
              <Text style={[s.lookToggleText, { color: saveLook ? colors.accent : colors.mutedForeground }]}>
                Save outfit as a Look
              </Text>
            </Pressable>

            <Pressable
              onPress={saveConfirmed}
              disabled={confirmedCount === 0 || saving}
              style={({ pressed }) => [s.saveBtn, { backgroundColor: confirmedCount > 0 ? colors.foreground : colors.secondary, borderRadius: 14, opacity: pressed ? 0.85 : 1 }]}
            >
              {saving ? <ActivityIndicator color={colors.primaryForeground} /> : (
                <>
                  <Feather name="check-circle" size={18} color={confirmedCount > 0 ? colors.primaryForeground : colors.mutedForeground} />
                  <Text style={[s.saveBtnText, { color: confirmedCount > 0 ? colors.primaryForeground : colors.mutedForeground }]}>
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

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  loadText: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  errText: { fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  btn: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  listHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 4 },
  card: { overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  cardHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  thumb: { width: 52, height: 52, borderRadius: 10, borderWidth: 1 },
  editBtn: { position: "absolute", bottom: -4, right: -4, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  cardMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  cardBody: { borderTopWidth: 1, padding: 16, gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
  input: { height: 44, paddingHorizontal: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  swatch: { width: 32, height: 32 },
  colorName: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  confirmText: { color: "#fff", fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  saveBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  lookToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  lookToggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 54 },
  saveBtnText: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});

// Modal styles
const cs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, gap: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold", fontWeight: "600", textAlign: "center" },
  tabRow: { flexDirection: "row", padding: 4, gap: 4 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9 },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  frame: {
    width: FRAME, height: FRAME, alignSelf: "center",
    borderRadius: 12, overflow: "hidden", borderWidth: 2,
  },
  corner: { position: "absolute", width: 16, height: 16, borderWidth: 2.5 },
  tl: { top: -1, left: -1, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  tr: { top: -1, right: -1, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  bl: { bottom: -1, left: -1, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  br: { bottom: -1, right: -1, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  pickArea: { borderRadius: 16, borderWidth: 1, borderStyle: "dashed", alignItems: "center", padding: 32, gap: 10 },
  pickTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 10 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  applyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
});
