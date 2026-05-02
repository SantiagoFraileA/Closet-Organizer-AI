import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function CategoryChip({ label, selected, onPress }: Props) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.foreground : colors.secondary,
          borderRadius: 20,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: selected ? colors.primaryForeground : colors.mutedForeground,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});
