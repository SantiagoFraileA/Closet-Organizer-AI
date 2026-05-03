import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { ClothingCategory, ClothingItem } from "@/context/ClosetContext";

const CATEGORY_ICONS: Record<ClothingCategory, keyof typeof Feather.glyphMap> =
  {
    tops: "wind",
    bottoms: "minus",
    shoes: "navigation",
    accessories: "watch",
  };

interface Props {
  item: ClothingItem;
  onPress: () => void;
}

export function ClothingCard({ item, onPress }: Props) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      {item.imageThumb ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${item.imageThumb}` }}
          style={[styles.colorBlock, { borderRadius: colors.radius - 4 }]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.colorBlock,
            {
              backgroundColor: item.colorHex,
              borderRadius: colors.radius - 4,
            },
          ]}
        >
          <Feather
            name={CATEGORY_ICONS[item.category]}
            size={24}
            color={isLight(item.colorHex) ? "#1C1917" : "#FFFFFF"}
          />
        </View>
      )}
      <View style={styles.info}>
        <Text
          style={[styles.name, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text style={[styles.color, { color: colors.mutedForeground }]}>
          {item.color}
        </Text>
      </View>
    </Pressable>
  );
}

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 150;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderWidth: 1,
    overflow: "hidden",
  },
  colorBlock: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    margin: 8,
  },
  info: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  color: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
});
