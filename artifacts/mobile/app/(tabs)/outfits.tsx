import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AIPicks } from "@/components/AIPicks";
import { EmptyState } from "@/components/EmptyState";
import { OutfitItemRow } from "@/components/OutfitItemRow";
import { Outfit, SavedLook, useCloset } from "@/context/ClosetContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = 100;

// ─── Look detail modal ────────────────────────────────────────────────────────

function LookModal({ look, onClose, onDelete }: { look: SavedLook; onClose: () => void; onDelete: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
        <View style={[lm.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 }]}>
          <View style={[lm.handle, { backgroundColor: colors.border }]} />
          <Text style={[lm.date, { color: colors.mutedForeground }]}>{look.name}</Text>

          {look.imageThumb ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${look.imageThumb}` }}
              style={[lm.photo, { borderRadius: 16, borderColor: colors.border }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[lm.noPhoto, { backgroundColor: colors.secondary, borderRadius: 16 }]}>
              <Feather name="image" size={32} color={colors.mutedForeground} />
            </View>
          )}

          <Text style={[lm.sectionLabel, { color: colors.mutedForeground }]}>ITEMS IN THIS LOOK</Text>
          <View style={lm.itemList}>
            {look.itemNames.map((name, i) => (
              <View key={i} style={[lm.itemRow, { borderBottomColor: colors.border }]}>
                <Feather name="check" size={14} color={colors.accent} />
                <Text style={[lm.itemName, { color: colors.foreground }]}>{name}</Text>
              </View>
            ))}
          </View>

          <View style={lm.actions}>
            <Pressable
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onDelete(); }}
              style={[lm.deleteBtn, { backgroundColor: colors.destructive + "12", borderRadius: 12, borderColor: colors.destructive + "40" }]}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
              <Text style={[lm.deleteBtnText, { color: colors.destructive }]}>Remove Look</Text>
            </Pressable>
            <Pressable onPress={onClose} style={[lm.closeBtn, { backgroundColor: colors.foreground, borderRadius: 12, flex: 1 }]}>
              <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Saved looks strip ────────────────────────────────────────────────────────

function LooksStrip() {
  const colors = useColors();
  const { savedLooks, removeLook } = useCloset();
  const [selected, setSelected] = useState<SavedLook | null>(null);
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [open]);

  if (!savedLooks.length) return null;

  const arrowRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <>
      {selected && (
        <LookModal
          look={selected}
          onClose={() => setSelected(null)}
          onDelete={() => { removeLook(selected.id); setSelected(null); }}
        />
      )}
      <View style={[ls.container, { borderBottomColor: colors.border }]}>
        {/* Header — always visible, tappable */}
        <Pressable
          onPress={() => { setOpen(v => !v); Haptics.selectionAsync(); }}
          style={ls.titleRow}
        >
          <View style={ls.titleLeft}>
            <Feather name="layers" size={15} color={colors.accent} />
            <Text style={[ls.title, { color: colors.foreground }]}>My Looks</Text>
            <View style={[ls.badge, { backgroundColor: colors.accent + "20" }]}>
              <Text style={[ls.badgeText, { color: colors.accent }]}>{savedLooks.length}</Text>
            </View>
          </View>
          <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
            <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
          </Animated.View>
        </Pressable>

        {/* Collapsible content */}
        {open && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={ls.scroll}
            style={ls.scrollWrapper}
          >
            {savedLooks.map((look) => (
              <Pressable
                key={look.id}
                onPress={() => { setSelected(look); Haptics.selectionAsync(); }}
                style={({ pressed }) => [ls.card, { opacity: pressed ? 0.85 : 1 }]}
              >
                {look.imageThumb ? (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${look.imageThumb}` }}
                    style={[ls.photo, { borderRadius: 12, borderColor: colors.border }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[ls.photo, { borderRadius: 12, backgroundColor: colors.secondary, borderColor: colors.border, alignItems: "center", justifyContent: "center" }]}>
                    <Feather name="image" size={22} color={colors.mutedForeground} />
                  </View>
                )}
                <Text style={[ls.cardDate, { color: colors.mutedForeground }]} numberOfLines={1}>{look.name}</Text>
                <Text style={[ls.cardItems, { color: colors.foreground }]} numberOfLines={1}>
                  {look.itemNames.slice(0, 2).join(", ")}{look.itemNames.length > 2 ? ` +${look.itemNames.length - 2}` : ""}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </>
  );
}

// ─── Swipe card ───────────────────────────────────────────────────────────────

function SwipeCard({
  outfit, onLike, onPass, isTop,
}: {
  outfit: Outfit; onLike: () => void; onPass: () => void; isTop: boolean;
}) {
  const colors = useColors();
  const { items } = useCloset();
  const position = useRef(new Animated.ValueXY()).current;

  const outfitItems = outfit.itemIds.map((id) => items.find((i) => i.id === id)).filter(Boolean);

  const rotate = position.x.interpolate({ inputRange: [-width, 0, width], outputRange: ["-18deg", "0deg", "18deg"], extrapolate: "clamp" });
  const likeOpacity = position.x.interpolate({ inputRange: [0, 60, 120], outputRange: [0, 0.6, 1], extrapolate: "clamp" });
  const passOpacity = position.x.interpolate({ inputRange: [-120, -60, 0], outputRange: [1, 0.6, 0], extrapolate: "clamp" });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isTop,
    onPanResponderMove: (_, g) => { position.setValue({ x: g.dx, y: g.dy }); },
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_THRESHOLD) {
        Animated.timing(position, { toValue: { x: width + 100, y: g.dy }, duration: 250, useNativeDriver: true }).start(onLike);
      } else if (g.dx < -SWIPE_THRESHOLD) {
        Animated.timing(position, { toValue: { x: -(width + 100), y: g.dy }, duration: 250, useNativeDriver: true }).start(onPass);
      } else {
        Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      }
    },
  });

  const paletteColors = outfitItems.map((i) => i?.colorHex).filter(Boolean).slice(0, 5) as string[];

  return (
    <Animated.View
      {...(isTop ? panResponder.panHandlers : {})}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius * 1.5,
          borderColor: colors.border,
          transform: isTop
            ? [{ translateX: position.x }, { translateY: position.y }, { rotate }]
            : [{ scale: 0.95 }, { translateY: 12 }],
          zIndex: isTop ? 10 : 5,
        },
      ]}
    >
      {isTop && (
        <>
          <Animated.View style={[styles.overlay, styles.likeOverlay, { borderRadius: colors.radius * 1.5, opacity: likeOpacity }]}>
            <Text style={styles.overlayText}>LOVE IT</Text>
          </Animated.View>
          <Animated.View style={[styles.overlay, styles.passOverlay, { borderRadius: colors.radius * 1.5, opacity: passOpacity }]}>
            <Text style={styles.overlayText}>PASS</Text>
          </Animated.View>
        </>
      )}
      <View style={styles.palette}>
        {paletteColors.map((c, i) => <View key={i} style={[styles.paletteSwatch, { backgroundColor: c, flex: 1 }]} />)}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Style match</Text>
          <Text style={[styles.scoreValue, { color: colors.foreground }]}>{Math.round(outfit.styleScore * 100)}%</Text>
        </View>
        {outfitItems.map((item) => item && <OutfitItemRow key={item.id} item={item} />)}
        {outfit.isComfortZone && (
          <View style={[styles.badge, { backgroundColor: "#3730A3" + "22", borderRadius: 8 }]}>
            <Feather name="zap" size={12} color="#3730A3" />
            <Text style={[styles.badgeText, { color: "#3730A3" }]}>Comfort Zone Challenge</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OutfitsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { outfits, ratings, rateOutfit, generateOutfits, items } = useCloset();
  const [comfortZone, setComfortZone] = useState(false);
  const [deck, setDeck] = useState<Outfit[]>([]);
  const [likeCount, setLikeCount] = useState(0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    const generated = generateOutfits(comfortZone);
    setDeck([...generated].reverse());
  }, [comfortZone, items.length]);

  const handleLike = () => {
    if (!deck.length) return;
    rateOutfit(deck[deck.length - 1].id, "like");
    setDeck((prev) => prev.slice(0, -1));
    setLikeCount((c) => c + 1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handlePass = () => {
    if (!deck.length) return;
    rateOutfit(deck[deck.length - 1].id, "dislike");
    setDeck((prev) => prev.slice(0, -1));
    Haptics.selectionAsync();
  };

  const handleRefresh = () => {
    Haptics.selectionAsync();
    setDeck([...generateOutfits(comfortZone)].reverse());
    setLikeCount(0);
  };

  const canShow =
    items.filter((i) => i.category === "tops").length > 0 &&
    items.filter((i) => i.category === "bottoms").length > 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Outfits</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Swipe right to love, left to pass</Text>
        </View>
        <View style={styles.headerRight}>
          {likeCount > 0 && (
            <View style={[styles.likeCounter, { backgroundColor: "#C4956A22", borderRadius: 12 }]}>
              <Feather name="heart" size={13} color="#C4956A" />
              <Text style={[styles.likeCountText, { color: "#C4956A" }]}>{likeCount}</Text>
            </View>
          )}
          <Pressable onPress={handleRefresh} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, width: 44, height: 44, alignItems: "center", justifyContent: "center" })}>
            <Feather name="refresh-cw" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Picks */}
        <AIPicks />

        {/* My Looks strip */}
        <LooksStrip />

        {/* Comfort Zone Toggle */}
        <Pressable
          onPress={() => { setComfortZone((v) => !v); Haptics.selectionAsync(); }}
          style={[styles.modeToggle, { backgroundColor: comfortZone ? "#3730A3" : colors.secondary, borderRadius: 12, marginHorizontal: 20, marginTop: 14 }]}
        >
          <Feather name="zap" size={16} color={comfortZone ? "#FFFFFF" : colors.mutedForeground} />
          <Text style={[styles.modeText, { color: comfortZone ? "#FFFFFF" : colors.mutedForeground }]}>
            {comfortZone ? "Comfort Zone Mode ON" : "Exit Comfort Zone"}
          </Text>
        </Pressable>

        {/* Card stack */}
        {!canShow ? (
          <EmptyState icon="layers" title="Need more clothes" subtitle="Add at least one top and one bottom to generate outfit ideas." />
        ) : deck.length === 0 ? (
          <EmptyState
            icon="check-circle"
            title="You've seen them all"
            subtitle={`${likeCount > 0 ? `Loved ${likeCount} outfit${likeCount > 1 ? "s" : ""}. ` : ""}Tap refresh to see more picks.`}
            actionLabel="Refresh"
            onAction={handleRefresh}
          />
        ) : (
          <View style={styles.stackArea}>
            {deck.slice(-2).map((outfit, i, arr) => (
              <SwipeCard key={outfit.id} outfit={outfit} isTop={i === arr.length - 1} onLike={handleLike} onPass={handlePass} />
            ))}
          </View>
        )}

        {/* Action buttons */}
        {deck.length > 0 && canShow && (
          <View style={[styles.actions, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 90 }]}>
            <Pressable onPress={handlePass} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "50", borderRadius: 36, opacity: pressed ? 0.8 : 1 }]}>
              <Feather name="x" size={28} color={colors.destructive} />
            </Pressable>
            <Pressable onPress={handleLike} style={({ pressed }) => [styles.actionBtn, styles.likeBtn, { backgroundColor: colors.foreground, borderRadius: 44, opacity: pressed ? 0.8 : 1 }]}>
              <Feather name="heart" size={30} color={colors.primaryForeground} />
            </Pressable>
            <Pressable onPress={handleRefresh} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: 36, opacity: pressed ? 0.8 : 1 }]}>
              <Feather name="refresh-cw" size={24} color={colors.foreground} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 28, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 18 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  likeCounter: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5 },
  likeCountText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  modeToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14, minHeight: 44 },
  modeText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  stackArea: { height: 420, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, marginTop: 16 },
  card: { position: "absolute", width: width - 40, borderWidth: 1, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 20 },
  likeOverlay: { backgroundColor: "#C4956AAA" },
  passOverlay: { backgroundColor: "#1C191799" },
  overlayText: { fontSize: 32, fontWeight: "700", fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: 4 },
  palette: { flexDirection: "row", height: 8 },
  paletteSwatch: { height: "100%" },
  cardBody: { padding: 20 },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  scoreLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  scoreValue: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, padding: 8 },
  badgeText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 24, paddingTop: 16, paddingHorizontal: 40 },
  actionBtn: { width: 60, height: 60, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  likeBtn: { width: 76, height: 76, borderWidth: 0 },
});

const ls = StyleSheet.create({
  container: { borderBottomWidth: StyleSheet.hairlineWidth },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, minHeight: 44 },
  titleLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  scrollWrapper: { marginBottom: 16 },
  scroll: { paddingHorizontal: 20, gap: 12 },
  card: { width: 120 },
  photo: { width: 120, height: 160, borderWidth: 1, marginBottom: 8 },
  cardDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  cardItems: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});

const lm = StyleSheet.create({
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, gap: 14 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  date: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  photo: { width: "100%", height: 260, borderWidth: 1 },
  noPhoto: { width: "100%", height: 180, alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginTop: 4 },
  itemList: { gap: 0 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  itemName: { fontSize: 14, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1 },
  deleteBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  closeBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 14 },
});
