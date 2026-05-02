import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCloset } from "@/context/ClosetContext";
import { useColors } from "@/hooks/useColors";
import { useWeather, WeatherData } from "@/hooks/useWeather";

interface Recommendation {
  occasion: string;
  vibe: string;
  items: string[];
  weatherNote: string;
  styleNote: string;
}

function occasionIcon(occasion: string): string {
  const o = occasion.toLowerCase();
  if (o.includes("morning") || o.includes("commute")) return "sunrise";
  if (o.includes("work") || o.includes("meeting") || o.includes("office")) return "briefcase";
  if (o.includes("evening") || o.includes("night") || o.includes("dinner")) return "moon";
  if (o.includes("weekend") || o.includes("casual") || o.includes("errand")) return "coffee";
  if (o.includes("lunch") || o.includes("brunch")) return "sun";
  if (o.includes("sport") || o.includes("gym") || o.includes("workout")) return "activity";
  return "star";
}

const CARD_ACCENTS = ["#C4956A", "#7D9B7B", "#3730A3", "#7C2D3A"];

// ── Detail modal ─────────────────────────────────────────────────────────────

function PickModal({
  pick,
  accent,
  weather,
  onClose,
}: {
  pick: Recommendation;
  accent: string;
  weather: WeatherData | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={pm.overlay}>
        <View
          style={[
            pm.sheet,
            { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 },
          ]}
        >
          {/* Handle */}
          <View style={[pm.handle, { backgroundColor: colors.border }]} />

          {/* Accent strip */}
          <View style={[pm.strip, { backgroundColor: accent }]} />

          <ScrollView
            style={pm.scroll}
            contentContainerStyle={pm.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Occasion + vibe */}
            <View style={pm.occasionRow}>
              <View style={[pm.occasionBadge, { backgroundColor: accent + "22" }]}>
                <Feather name={occasionIcon(pick.occasion) as any} size={14} color={accent} />
                <Text style={[pm.occasionText, { color: accent }]}>{pick.occasion}</Text>
              </View>
              <Text style={[pm.vibe, { color: colors.mutedForeground }]}>· {pick.vibe}</Text>
            </View>

            {/* Weather context */}
            {weather && (
              <View style={[pm.weatherBox, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
                <Text style={pm.weatherEmoji}>{weather.conditionEmoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[pm.weatherTemp, { color: colors.foreground }]}>
                    {weather.tempC}°C · {weather.condition}
                  </Text>
                  <Text style={[pm.weatherSub, { color: colors.mutedForeground }]}>
                    {weather.locationName ? `${weather.locationName} · ` : ""}
                    {weather.tempMinC}°–{weather.tempMaxC}°
                    {weather.precipMm > 0 ? ` · 🌧 ${weather.precipMm}mm` : ""}
                  </Text>
                </View>
              </View>
            )}

            {/* Items */}
            <Text style={[pm.sectionLabel, { color: colors.mutedForeground }]}>PRENDAS</Text>
            <View style={[pm.itemsBox, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
              {pick.items.map((name, i) => (
                <View
                  key={i}
                  style={[
                    pm.itemRow,
                    { borderBottomColor: colors.border, borderBottomWidth: i < pick.items.length - 1 ? StyleSheet.hairlineWidth : 0 },
                  ]}
                >
                  <View style={[pm.dot, { backgroundColor: accent }]} />
                  <Text style={[pm.itemName, { color: colors.foreground }]}>{name}</Text>
                </View>
              ))}
            </View>

            {/* Notes */}
            <Text style={[pm.sectionLabel, { color: colors.mutedForeground }]}>POR QUÉ FUNCIONA</Text>
            <View style={[pm.noteBox, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
              <View style={pm.noteRow}>
                <Text style={pm.noteEmoji}>🌤</Text>
                <Text style={[pm.noteText, { color: colors.foreground }]}>{pick.weatherNote}</Text>
              </View>
              <View style={[pm.noteDivider, { backgroundColor: colors.border }]} />
              <View style={pm.noteRow}>
                <Text style={pm.noteEmoji}>✨</Text>
                <Text style={[pm.noteText, { color: colors.foreground }]}>{pick.styleNote}</Text>
              </View>
            </View>
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={[pm.closeBtn, { backgroundColor: colors.foreground, borderRadius: 14 }]}
          >
            <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
              Done
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AIPicks() {
  const colors = useColors();
  const { items, savedLooks } = useCloset();
  const { weather, loading: weatherLoading, error: weatherError, permissionDenied, refresh: refreshWeather } = useWeather();

  const [picks, setPicks] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<{ pick: Recommendation; index: number } | null>(null);

  useEffect(() => {
    if (weather && items.length >= 2) fetchPicks();
  }, [weather]);

  async function fetchPicks() {
    if (!weather) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recommend-outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ id: i.id, name: i.name, category: i.category, color: i.color, colorHex: i.colorHex, tags: i.tags })),
          savedLooks: savedLooks.map((l) => ({ name: l.name, itemNames: l.itemNames })),
          weather,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error");
      setPicks(json.recommendations ?? []);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError("Couldn't generate picks. Tap to retry.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    Haptics.selectionAsync();
    if (!weather) { await refreshWeather(); } else { await fetchPicks(); }
  }

  function WeatherBanner() {
    if (weatherLoading) {
      return (
        <View style={[wb.banner, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[wb.text, { color: colors.mutedForeground }]}>Getting your location…</Text>
        </View>
      );
    }
    if (permissionDenied || weatherError) {
      return (
        <Pressable onPress={refreshWeather} style={[wb.banner, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
          <Feather name="map-pin" size={14} color={colors.mutedForeground} />
          <Text style={[wb.text, { color: colors.mutedForeground }]}>
            {permissionDenied ? "Allow location for weather-based picks" : "Tap to retry weather"}
          </Text>
        </Pressable>
      );
    }
    if (!weather) return null;
    return (
      <View style={[wb.banner, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
        <Text style={wb.emoji}>{weather.conditionEmoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[wb.temp, { color: colors.foreground }]}>{weather.tempC}°C · {weather.condition}</Text>
          <Text style={[wb.sub, { color: colors.mutedForeground }]}>
            {weather.locationName ? `${weather.locationName} · ` : ""}
            Feels {weather.feelsLikeC}°C · {weather.tempMinC}°–{weather.tempMaxC}°
            {weather.precipMm > 0 ? ` · 🌧 ${weather.precipMm}mm` : ""}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[ai.container, { borderBottomColor: colors.border }]}>
      {/* Detail modal */}
      {selected && (
        <PickModal
          pick={selected.pick}
          accent={CARD_ACCENTS[selected.index % CARD_ACCENTS.length]}
          weather={weather}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Section header */}
      <Pressable
        onPress={() => { setOpen(v => !v); Haptics.selectionAsync(); }}
        style={ai.header}
      >
        <View style={ai.headerLeft}>
          <Feather name="zap" size={15} color={colors.accent} />
          <Text style={[ai.title, { color: colors.foreground }]}>AI Picks for Today</Text>
          {picks.length > 0 && !loading && (
            <View style={[ai.badge, { backgroundColor: colors.accent + "22" }]}>
              <Text style={[ai.badgeText, { color: colors.accent }]}>{picks.length}</Text>
            </View>
          )}
        </View>
        <View style={ai.headerRight}>
          {(picks.length > 0 || error) && (
            <Pressable onPress={handleRefresh} hitSlop={10} style={{ opacity: loading ? 0.4 : 1 }}>
              <Feather name="refresh-cw" size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
          <Feather name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
        </View>
      </Pressable>

      {open && (
        <View style={ai.body}>
          <WeatherBanner />

          {loading ? (
            <View style={ai.loadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[ai.loadingText, { color: colors.mutedForeground }]}>
                Gemini is analyzing your style + weather…
              </Text>
            </View>
          ) : error ? (
            <Pressable onPress={handleRefresh} style={[ai.errorBox, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[ai.errorText, { color: colors.mutedForeground }]}>{error}</Text>
            </Pressable>
          ) : picks.length === 0 && weather ? (
            <Pressable onPress={fetchPicks} style={[ai.generateBtn, { backgroundColor: colors.foreground, borderRadius: 12 }]}>
              <Feather name="zap" size={16} color={colors.primaryForeground} />
              <Text style={[ai.generateBtnText, { color: colors.primaryForeground }]}>Generate today's picks</Text>
            </Pressable>
          ) : picks.length === 0 ? null : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={ai.scroll}
            >
              {picks.map((pick, i) => {
                const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
                return (
                  <Pressable
                    key={i}
                    onPress={() => { setSelected({ pick, index: i }); Haptics.selectionAsync(); }}
                    style={({ pressed }) => [
                      ai.card,
                      { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, opacity: pressed ? 0.88 : 1 },
                    ]}
                  >
                    <View style={[ai.strip, { backgroundColor: accent }]} />
                    <View style={ai.cardInner}>
                      {/* Occasion row */}
                      <View style={ai.cardHeader}>
                        <View style={[ai.occasionBadge, { backgroundColor: accent + "22" }]}>
                          <Feather name={occasionIcon(pick.occasion) as any} size={11} color={accent} />
                          <Text style={[ai.occasionText, { color: accent }]} numberOfLines={1}>
                            {pick.occasion}
                          </Text>
                        </View>
                        <Text style={[ai.vibe, { color: colors.mutedForeground }]}>{pick.vibe}</Text>
                      </View>

                      {/* Items — limited preview */}
                      <View style={ai.itemList}>
                        {pick.items.slice(0, 3).map((name, j) => (
                          <View key={j} style={ai.itemRow}>
                            <View style={[ai.dot, { backgroundColor: accent }]} />
                            <Text style={[ai.itemName, { color: colors.foreground }]} numberOfLines={1}>
                              {name}
                            </Text>
                          </View>
                        ))}
                        {pick.items.length > 3 && (
                          <Text style={[ai.moreText, { color: colors.mutedForeground }]}>
                            +{pick.items.length - 3} more…
                          </Text>
                        )}
                      </View>

                      {/* Tap hint */}
                      <View style={[ai.tapHint, { backgroundColor: colors.secondary, borderRadius: 8 }]}>
                        <Feather name="maximize-2" size={10} color={colors.mutedForeground} />
                        <Text style={[ai.tapHintText, { color: colors.mutedForeground }]}>
                          Tap to see full details
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const ai = StyleSheet.create({
  container: { borderBottomWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  body: { paddingBottom: 16, gap: 12 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, padding: 14 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  generateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 20, paddingVertical: 14 },
  generateBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scroll: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  card: { width: 210, borderWidth: 1, overflow: "hidden" },
  strip: { height: 4 },
  cardInner: { padding: 14, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  occasionBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flex: 1, marginRight: 8 },
  occasionText: { fontSize: 11, fontFamily: "Inter_600SemiBold", flex: 1 },
  vibe: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  itemList: { gap: 5 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  itemName: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  moreText: { fontSize: 11, fontFamily: "Inter_400Regular", paddingLeft: 14 },
  tapHint: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 6 },
  tapHintText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});

const wb = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, paddingHorizontal: 14, paddingVertical: 10 },
  emoji: { fontSize: 22 },
  text: { fontSize: 13, fontFamily: "Inter_400Regular" },
  temp: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "88%" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  strip: { height: 5, marginBottom: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 16 },
  occasionRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  occasionBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  occasionText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  vibe: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  weatherBox: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  weatherEmoji: { fontSize: 28 },
  weatherTemp: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  weatherSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  itemsBox: { overflow: "hidden" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  itemName: { fontSize: 15, fontFamily: "Inter_400Regular", flex: 1 },
  noteBox: { overflow: "hidden" },
  noteRow: { flexDirection: "row", gap: 12, padding: 14 },
  noteEmoji: { fontSize: 18, lineHeight: 24 },
  noteText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, flex: 1 },
  noteDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  closeBtn: { marginHorizontal: 20, marginTop: 12, alignItems: "center", justifyContent: "center", height: 54 },
});
