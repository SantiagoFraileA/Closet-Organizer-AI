import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/EmptyState";
import { OutfitItemRow } from "@/components/OutfitItemRow";
import { Outfit, useCloset } from "@/context/ClosetContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = 100;

function SwipeCard({
  outfit,
  onLike,
  onPass,
  isTop,
}: {
  outfit: Outfit;
  onLike: () => void;
  onPass: () => void;
  isTop: boolean;
}) {
  const colors = useColors();
  const { items } = useCloset();
  const position = useRef(new Animated.ValueXY()).current;

  const outfitItems = outfit.itemIds
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean);

  const rotate = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ["-18deg", "0deg", "18deg"],
    extrapolate: "clamp",
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [0, 60, 120],
    outputRange: [0, 0.6, 1],
    extrapolate: "clamp",
  });
  const passOpacity = position.x.interpolate({
    inputRange: [-120, -60, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: "clamp",
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isTop,
    onPanResponderMove: (_, g) => {
      position.setValue({ x: g.dx, y: g.dy });
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_THRESHOLD) {
        Animated.timing(position, {
          toValue: { x: width + 100, y: g.dy },
          duration: 250,
          useNativeDriver: true,
        }).start(onLike);
      } else if (g.dx < -SWIPE_THRESHOLD) {
        Animated.timing(position, {
          toValue: { x: -(width + 100), y: g.dy },
          duration: 250,
          useNativeDriver: true,
        }).start(onPass);
      } else {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const paletteColors = outfitItems
    .map((i) => i?.colorHex)
    .filter(Boolean)
    .slice(0, 5) as string[];

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
            ? [
                { translateX: position.x },
                { translateY: position.y },
                { rotate },
              ]
            : [{ scale: 0.95 }, { translateY: 12 }],
          zIndex: isTop ? 10 : 5,
        },
      ]}
    >
      {/* Like / Pass overlays */}
      {isTop && (
        <>
          <Animated.View
            style={[
              styles.overlay,
              styles.likeOverlay,
              { borderRadius: colors.radius * 1.5, opacity: likeOpacity },
            ]}
          >
            <Text style={styles.overlayText}>LOVE IT</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.overlay,
              styles.passOverlay,
              { borderRadius: colors.radius * 1.5, opacity: passOpacity },
            ]}
          >
            <Text style={styles.overlayText}>PASS</Text>
          </Animated.View>
        </>
      )}

      {/* Color palette strip */}
      <View style={styles.palette}>
        {paletteColors.map((c, i) => (
          <View
            key={i}
            style={[styles.paletteSwatch, { backgroundColor: c, flex: 1 }]}
          />
        ))}
      </View>

      {/* Items */}
      <View style={styles.cardBody}>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
            Style match
          </Text>
          <Text style={[styles.scoreValue, { color: colors.foreground }]}>
            {Math.round(outfit.styleScore * 100)}%
          </Text>
        </View>
        {outfitItems.map(
          (item) =>
            item && <OutfitItemRow key={item.id} item={item} />
        )}
        {outfit.isComfortZone && (
          <View
            style={[
              styles.badge,
              { backgroundColor: "#3730A3" + "22", borderRadius: 8 },
            ]}
          >
            <Feather name="zap" size={12} color="#3730A3" />
            <Text style={[styles.badgeText, { color: "#3730A3" }]}>
              Comfort Zone Challenge
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

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
    const top = deck[deck.length - 1];
    rateOutfit(top.id, "like");
    setDeck((prev) => prev.slice(0, -1));
    setLikeCount((c) => c + 1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handlePass = () => {
    if (!deck.length) return;
    const top = deck[deck.length - 1];
    rateOutfit(top.id, "dislike");
    setDeck((prev) => prev.slice(0, -1));
    Haptics.selectionAsync();
  };

  const handleRefresh = () => {
    Haptics.selectionAsync();
    const generated = generateOutfits(comfortZone);
    setDeck([...generated].reverse());
    setLikeCount(0);
  };

  const canShow = items.filter((i) => i.category === "tops").length > 0 &&
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
            Outfit Ideas
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Swipe right to love, left to pass
          </Text>
        </View>
        <View style={styles.headerRight}>
          {likeCount > 0 && (
            <View
              style={[
                styles.likeCounter,
                { backgroundColor: "#C4956A" + "22", borderRadius: 12 },
              ]}
            >
              <Feather name="heart" size={13} color="#C4956A" />
              <Text style={[styles.likeCountText, { color: "#C4956A" }]}>
                {likeCount}
              </Text>
            </View>
          )}
          <Pressable
            onPress={handleRefresh}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="refresh-cw" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {/* Comfort Zone Toggle */}
      <Pressable
        onPress={() => {
          setComfortZone((v) => !v);
          Haptics.selectionAsync();
        }}
        style={[
          styles.modeToggle,
          {
            backgroundColor: comfortZone ? "#3730A3" : colors.secondary,
            borderRadius: 12,
            marginHorizontal: 20,
            marginTop: 14,
          },
        ]}
      >
        <Feather
          name="zap"
          size={16}
          color={comfortZone ? "#FFFFFF" : colors.mutedForeground}
        />
        <Text
          style={[
            styles.modeText,
            { color: comfortZone ? "#FFFFFF" : colors.mutedForeground },
          ]}
        >
          {comfortZone ? "Comfort Zone Mode ON" : "Exit Comfort Zone"}
        </Text>
      </Pressable>

      {/* Card stack */}
      {!canShow ? (
        <EmptyState
          icon="layers"
          title="Need more clothes"
          subtitle="Add at least one top and one bottom to generate outfit ideas."
        />
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
            <SwipeCard
              key={outfit.id}
              outfit={outfit}
              isTop={i === arr.length - 1}
              onLike={handleLike}
              onPass={handlePass}
            />
          ))}
        </View>
      )}

      {/* Action buttons */}
      {deck.length > 0 && canShow && (
        <View
          style={[
            styles.actions,
            { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 90 },
          ]}
        >
          <Pressable
            onPress={handlePass}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: colors.destructive + "15",
                borderColor: colors.destructive + "50",
                borderRadius: 36,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="x" size={28} color={colors.destructive} />
          </Pressable>
          <Pressable
            onPress={handleLike}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.likeBtn,
              {
                backgroundColor: colors.foreground,
                borderRadius: 44,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="heart" size={30} color={colors.primaryForeground} />
          </Pressable>
          <Pressable
            onPress={handleRefresh}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                borderRadius: 36,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="refresh-cw" size={24} color={colors.foreground} />
          </Pressable>
        </View>
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  likeCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  likeCountText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  modeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modeText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  stackArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 16,
  },
  card: {
    position: "absolute",
    width: width - 40,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  likeOverlay: { backgroundColor: "#C4956A" + "AA" },
  passOverlay: { backgroundColor: "#1C1917" + "99" },
  overlayText: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 4,
  },
  palette: {
    flexDirection: "row",
    height: 8,
  },
  paletteSwatch: {
    height: "100%",
  },
  cardBody: {
    padding: 20,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  scoreValue: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    padding: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingTop: 16,
    paddingHorizontal: 40,
  },
  actionBtn: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  likeBtn: {
    width: 76,
    height: 76,
    borderWidth: 0,
  },
});
