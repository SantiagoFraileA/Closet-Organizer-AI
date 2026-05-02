import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
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

const CATEGORIES: Array<{ key: ClothingCategory; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { key: "tops", label: "Top", icon: "wind" },
  { key: "bottoms", label: "Bottom", icon: "minus" },
  { key: "shoes", label: "Shoes", icon: "navigation" },
  { key: "accessories", label: "Accessory", icon: "watch" },
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
];

export default function AddItemScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addItem } = useCloset();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ClothingCategory>("tops");
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addItem({
      imageUri,
      name: name.trim(),
      category,
      color: selectedColor.label,
      colorHex: selectedColor.hex,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setSaving(false);
    router.back();
  };

  const canSave = name.trim().length > 0;

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
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Add Item
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={!canSave || saving}
          style={({ pressed }) => ({
            opacity: !canSave ? 0.4 : pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={[
              styles.saveText,
              { color: canSave ? colors.accent : colors.mutedForeground },
            ]}
          >
            Save
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image picker */}
        <Pressable
          onPress={pickImage}
          style={({ pressed }) => [
            styles.imagePicker,
            {
              backgroundColor: imageUri ? "transparent" : colors.secondary,
              borderColor: colors.border,
              borderRadius: colors.radius,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.pickerPlaceholder}>
              <Feather name="camera" size={32} color={colors.mutedForeground} />
              <Text
                style={[styles.pickerText, { color: colors.mutedForeground }]}
              >
                Add photo
              </Text>
            </View>
          )}
        </Pressable>

        {/* Photo action buttons */}
        <View style={styles.photoActions}>
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => [
              styles.photoBtn,
              {
                backgroundColor: colors.secondary,
                borderRadius: colors.radius,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="image" size={16} color={colors.mutedForeground} />
            <Text
              style={[styles.photoBtnText, { color: colors.mutedForeground }]}
            >
              Gallery
            </Text>
          </Pressable>
          {Platform.OS !== "web" && (
            <Pressable
              onPress={takePhoto}
              style={({ pressed }) => [
                styles.photoBtn,
                {
                  backgroundColor: colors.secondary,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="camera" size={16} color={colors.mutedForeground} />
              <Text
                style={[styles.photoBtnText, { color: colors.mutedForeground }]}
              >
                Camera
              </Text>
            </Pressable>
          )}
        </View>

        {/* Name input */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. White Oxford Shirt"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
                borderRadius: colors.radius,
              },
            ]}
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Category
          </Text>
          <View style={styles.catRow}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => {
                  setCategory(c.key);
                  Haptics.selectionAsync();
                }}
                style={({ pressed }) => [
                  styles.catBtn,
                  {
                    backgroundColor:
                      category === c.key
                        ? colors.foreground
                        : colors.secondary,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.8 : 1,
                    flex: 1,
                  },
                ]}
              >
                <Feather
                  name={c.icon}
                  size={16}
                  color={
                    category === c.key
                      ? colors.primaryForeground
                      : colors.mutedForeground
                  }
                />
                <Text
                  style={[
                    styles.catLabel,
                    {
                      color:
                        category === c.key
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Color */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Color
          </Text>
          <View style={styles.colorGrid}>
            {COLOR_PRESETS.map((c) => (
              <Pressable
                key={c.label}
                onPress={() => {
                  setSelectedColor(c);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.colorSwatch,
                  {
                    backgroundColor: c.hex,
                    borderRadius: 24,
                    borderWidth: selectedColor.hex === c.hex ? 3 : 1.5,
                    borderColor:
                      selectedColor.hex === c.hex
                        ? colors.accent
                        : colors.border,
                  },
                ]}
              />
            ))}
          </View>
          <Text
            style={[styles.colorName, { color: colors.mutedForeground }]}
          >
            {selectedColor.label}
          </Text>
        </View>

        {/* Tags */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Tags{" "}
            <Text style={{ fontWeight: "400" }}>(comma separated)</Text>
          </Text>
          <TextInput
            value={tags}
            onChangeText={setTags}
            placeholder="e.g. casual, summer, basic"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
                borderRadius: colors.radius,
              },
            ]}
          />
        </View>

        {/* Save */}
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: canSave
                ? colors.foreground
                : colors.secondary,
              borderRadius: colors.radius,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.saveBtnText,
              {
                color: canSave
                  ? colors.primaryForeground
                  : colors.mutedForeground,
              },
            ]}
          >
            Add to Closet
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
  },
  saveText: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 24,
  },
  imagePicker: {
    height: 200,
    borderWidth: 1.5,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  pickerPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pickerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  photoActions: {
    flexDirection: "row",
    gap: 12,
  },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  photoBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  field: { gap: 8 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  input: {
    height: 52,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1.5,
    fontFamily: "Inter_400Regular",
  },
  catRow: {
    flexDirection: "row",
    gap: 8,
  },
  catBtn: {
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  catLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorSwatch: {
    width: 36,
    height: 36,
  },
  colorName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  saveBtn: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
