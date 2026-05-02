import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
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

const CATEGORY_LABELS: Record<ClothingCategory, string> = {
  tops: "Tops",
  bottoms: "Bottoms",
  shoes: "Shoes",
  accessories: "Accessories",
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, ratings, profileName, setProfileName, signOut } = useCloset();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profileName);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const stats = useMemo(() => {
    const liked = ratings.filter((r) => r.rating === "like").length;
    const topColors = items.reduce(
      (acc, item) => {
        acc[item.color] = (acc[item.color] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const colorEntries = Object.entries(topColors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const catCounts: Record<ClothingCategory, number> = {
      tops: 0,
      bottoms: 0,
      shoes: 0,
      accessories: 0,
    };
    items.forEach((i) => {
      catCounts[i.category]++;
    });

    return { liked, colorEntries, catCounts };
  }, [items, ratings]);

  const handleNameSave = () => {
    if (nameInput.trim()) {
      setProfileName(nameInput.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditingName(false);
  };

  const colorItems = (items ?? []).filter(Boolean);
  const uniqueColors = [
    ...new Set(colorItems.map((i) => i.colorHex)),
  ].slice(0, 8);

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
        <Text style={[styles.title, { color: colors.foreground }]}>
          Profile
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              (Platform.OS === "web" ? 34 : insets.bottom) + 90,
          },
        ]}
      >
        {/* Avatar + name */}
        <View style={styles.profileSection}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: colors.accent + "22",
                borderRadius: 44,
                borderColor: colors.accent + "44",
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.accent }]}>
              {(profileName || "S").charAt(0).toUpperCase()}
            </Text>
          </View>

          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                style={[
                  styles.nameInput,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                    backgroundColor: colors.card,
                  },
                ]}
                onSubmitEditing={handleNameSave}
                returnKeyType="done"
              />
              <Pressable
                onPress={handleNameSave}
                style={[
                  styles.nameConfirm,
                  {
                    backgroundColor: colors.foreground,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Feather
                  name="check"
                  size={16}
                  color={colors.primaryForeground}
                />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setEditingName(true);
                setNameInput(profileName);
                Haptics.selectionAsync();
              }}
              style={styles.nameRow}
            >
              <Text style={[styles.name, { color: colors.foreground }]}>
                {profileName || "Tap to add name"}
              </Text>
              <Feather
                name="edit-2"
                size={14}
                color={colors.mutedForeground}
              />
            </Pressable>
          )}
          <Text style={[styles.nameLabel, { color: colors.mutedForeground }]}>
            Style enthusiast
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { value: items.length, label: "Items" },
            { value: stats.liked, label: "Loved" },
            {
              value: new Set(items.map((i) => i.color)).size,
              label: "Colors",
            },
          ].map((s, i) => (
            <View
              key={i}
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.card,
                  borderRadius: colors.radius,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {s.value}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.mutedForeground }]}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Wardrobe breakdown */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.card,
              borderRadius: colors.radius,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Wardrobe Breakdown
          </Text>
          {(Object.entries(stats.catCounts) as [ClothingCategory, number][]).map(
            ([cat, count]) => {
              const max = Math.max(...Object.values(stats.catCounts), 1);
              return (
                <View key={cat} style={styles.barRow}>
                  <Text
                    style={[styles.barLabel, { color: colors.mutedForeground }]}
                  >
                    {CATEGORY_LABELS[cat]}
                  </Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.secondary }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: colors.accent,
                          width: `${(count / max) * 100}%`,
                          borderRadius: 4,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.barCount, { color: colors.mutedForeground }]}
                  >
                    {count}
                  </Text>
                </View>
              );
            }
          )}
        </View>

        {/* Color palette */}
        {uniqueColors.length > 0 && (
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.card,
                borderRadius: colors.radius,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Your Palette
            </Text>
            <View style={styles.paletteRow}>
              {uniqueColors.map((hex, i) => (
                <View
                  key={i}
                  style={[
                    styles.paletteDot,
                    {
                      backgroundColor: hex,
                      borderRadius: 24,
                      borderColor: colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Top colors */}
        {stats.colorEntries.length > 0 && (
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.card,
                borderRadius: colors.radius,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Favorite Colors
            </Text>
            {stats.colorEntries.map(([color, count]) => (
              <View key={color} style={styles.colorRow}>
                <View
                  style={[
                    styles.colorDot,
                    {
                      backgroundColor:
                        items.find((i) => i.color === color)?.colorHex ??
                        "#888",
                      borderRadius: 8,
                    },
                  ]}
                />
                <Text
                  style={[styles.colorName, { color: colors.foreground }]}
                >
                  {color}
                </Text>
                <Text
                  style={[
                    styles.colorCount,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {count} {count === 1 ? "item" : "items"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Sign out */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            signOut();
          }}
          style={({ pressed }) => [
            styles.signOutBtn,
            {
              borderColor: colors.border,
              borderRadius: colors.radius,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="log-out" size={16} color={colors.mutedForeground} />
          <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>
            Sign out
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  profileSection: {
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  nameLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  nameEditRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  nameInput: {
    height: 44,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1.5,
    minWidth: 160,
    fontFamily: "Inter_400Regular",
  },
  nameConfirm: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  section: {
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  barLabel: {
    width: 80,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
  },
  barCount: {
    width: 20,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
  },
  paletteRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  paletteDot: {
    width: 40,
    height: 40,
    borderWidth: 1,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  colorDot: {
    width: 20,
    height: 20,
  },
  colorName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  colorCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderWidth: 1.5,
    marginTop: 4,
    marginBottom: 8,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
