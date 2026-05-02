import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ClothingCategory, ClothingItem } from "@/context/ClosetContext";
import { useColors } from "@/hooks/useColors";

const CATEGORY_ICONS: Record<ClothingCategory, keyof typeof Feather.glyphMap> =
  {
    tops: "wind",
    bottoms: "minus",
    shoes: "navigation",
    accessories: "watch",
  };

interface Props {
  item: ClothingItem;
}

export function OutfitItemRow({ item }: Props) {
  const colors = useColors();

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.swatch,
          {
            backgroundColor: item.colorHex,
            borderRadius: 8,
          },
        ]}
      >
        <Feather
          name={CATEGORY_ICONS[item.category]}
          size={14}
          color={isLight(item.colorHex) ? "#1C1917" : "#FFFFFF"}
        />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {item.name}
        </Text>
        <Text style={[styles.cat, { color: colors.mutedForeground }]}>
          {capitalize(item.category)} · {item.color}
        </Text>
      </View>
    </View>
  );
}

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 150;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  swatch: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  cat: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
});
