import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ClothingCategory, useCloset } from "@/context/ClosetContext";
import { useColors } from "@/hooks/useColors";

const CATEGORY_ICONS: Record<ClothingCategory, keyof typeof Feather.glyphMap> =
  {
    tops: "wind",
    bottoms: "minus",
    shoes: "navigation",
    accessories: "watch",
  };

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 150;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, removeItem } = useCloset();

  const item = items.find((i) => i.id === id);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!item) {
    return (
      <View
        style={[
          styles.screen,
          {
            backgroundColor: colors.background,
            paddingTop: topPad,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>
          Item not found
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.accent }]}>
            Go back
          </Text>
        </Pressable>
      </View>
    );
  }

  const handleDelete = () => {
    if (Platform.OS === "web") {
      removeItem(item.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
      return;
    }
    Alert.alert(
      "Remove item",
      `Remove "${item.name}" from your closet?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            removeItem(item.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ]
    );
  };

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
        <Text
          style={[styles.headerTitle, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Feather name="trash-2" size={20} color={colors.destructive} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              (Platform.OS === "web" ? 34 : insets.bottom) + 32,
          },
        ]}
      >
        {/* Image / color block */}
        {item.imageUri ? (
          <Image
            source={{ uri: item.imageUri }}
            style={[
              styles.image,
              { borderRadius: colors.radius },
            ]}
          />
        ) : (
          <View
            style={[
              styles.colorBlock,
              {
                backgroundColor: item.colorHex,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather
              name={CATEGORY_ICONS[item.category]}
              size={48}
              color={isLight(item.colorHex) ? "#1C1917" : "#FFFFFF"}
            />
          </View>
        )}

        {/* Details card */}
        <View
          style={[
            styles.detailCard,
            {
              backgroundColor: colors.card,
              borderRadius: colors.radius,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.itemName, { color: colors.foreground }]}>
            {item.name}
          </Text>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text
                style={[
                  styles.detailLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                Category
              </Text>
              <Text
                style={[styles.detailValue, { color: colors.foreground }]}
              >
                {capitalize(item.category)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text
                style={[
                  styles.detailLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                Color
              </Text>
              <View style={styles.colorLabel}>
                <View
                  style={[
                    styles.colorDot,
                    {
                      backgroundColor: item.colorHex,
                      borderRadius: 6,
                      borderColor: colors.border,
                    },
                  ]}
                />
                <Text
                  style={[styles.detailValue, { color: colors.foreground }]}
                >
                  {item.color}
                </Text>
              </View>
            </View>
          </View>

          {item.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text
                style={[
                  styles.detailLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                Tags
              </Text>
              <View style={styles.tagsRow}>
                {item.tags.map((tag) => (
                  <View
                    key={tag}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: colors.secondary,
                        borderRadius: 8,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        { color: colors.secondaryForeground },
                      ]}
                    >
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Text
            style={[styles.addedDate, { color: colors.mutedForeground }]}
          >
            Added{" "}
            {new Date(item.addedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>

        {/* Remove button */}
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.deleteBtn,
            {
              backgroundColor: colors.destructive + "12",
              borderRadius: colors.radius,
              borderColor: colors.destructive + "30",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="trash-2" size={18} color={colors.destructive} />
          <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>
            Remove from Closet
          </Text>
        </Pressable>
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
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  image: {
    width: "100%",
    height: 320,
    resizeMode: "cover",
  },
  colorBlock: {
    width: "100%",
    height: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCard: {
    padding: 20,
    borderWidth: 1,
    gap: 16,
  },
  itemName: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  detailRow: {
    flexDirection: "row",
    gap: 24,
  },
  detailItem: { gap: 4 },
  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  colorLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderWidth: 1,
  },
  tagsSection: { gap: 8 },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  addedDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  notFound: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  backLink: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  secondaryForeground: {},
});
