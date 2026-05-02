import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCloset } from "@/context/ClosetContext";
import { useColors } from "@/hooks/useColors";

const STEPS = [
  {
    title: "Your closet,\nreimagined.",
    subtitle:
      "Closetfy builds a digital twin of your wardrobe and generates outfits you'll actually love.",
    accent: "#C4956A",
  },
  {
    title: "Snap, tag,\ndone.",
    subtitle:
      "Photograph your clothes and we'll organize them by category, color, and style automatically.",
    accent: "#1E3A5F",
  },
  {
    title: "Outfits that\nfeel like you.",
    subtitle:
      "Get daily picks tailored to your taste — or unlock Comfort Zone mode for something bold.",
    accent: "#3730A3",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useCloset();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isNameStep = step === STEPS.length;
  const totalSteps = STEPS.length + 1;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const currentStep = STEPS[step];

  const goNext = () => {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      completeOnboarding(name.trim() || "Stylist");
      router.replace("/(tabs)");
    }
  };

  const accentColor = currentStep?.accent ?? colors.accent;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topPad + 16 },
      ]}
    >
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i <= step ? colors.foreground : colors.border,
                width: i === step ? 28 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Content area */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {!isNameStep ? (
          <>
            {/* Illustration */}
            <View
              style={[
                styles.illustration,
                {
                  backgroundColor: accentColor + "18",
                  borderRadius: colors.radius * 2,
                },
              ]}
            >
              <View
                style={[
                  styles.innerCircle,
                  {
                    backgroundColor: accentColor + "35",
                    borderRadius: 88,
                  },
                ]}
              >
                <View
                  style={[
                    styles.coreCircle,
                    { backgroundColor: accentColor, borderRadius: 52 },
                  ]}
                />
              </View>
            </View>

            {/* Text */}
            <Text style={[styles.title, { color: colors.foreground }]}>
              {currentStep.title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {currentStep.subtitle}
            </Text>
          </>
        ) : (
          <>
            {/* Name step */}
            <View
              style={[
                styles.illustration,
                {
                  backgroundColor: colors.accent + "18",
                  borderRadius: colors.radius * 2,
                },
              ]}
            >
              <View
                style={[
                  styles.innerCircle,
                  {
                    backgroundColor: colors.accent + "35",
                    borderRadius: 88,
                  },
                ]}
              >
                <View
                  style={[
                    styles.coreCircle,
                    { backgroundColor: colors.accent, borderRadius: 52 },
                  ]}
                />
              </View>
            </View>

            <Text style={[styles.title, { color: colors.foreground }]}>
              {"What should\nwe call you?"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Personalise your Closetfy experience.
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.nameInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                  borderRadius: colors.radius,
                },
              ]}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={goNext}
            />
          </>
        )}
      </Animated.View>

      {/* Next button */}
      <View style={[styles.bottom, { paddingBottom: botPad + 24 }]}>
        <Pressable
          onPress={goNext}
          style={({ pressed }) => [
            styles.nextBtn,
            {
              backgroundColor: colors.foreground,
              borderRadius: colors.radius,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <Text style={[styles.nextText, { color: colors.primaryForeground }]}>
            {isNameStep ? "Let's go" : step === STEPS.length - 1 ? "Almost there" : "Continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 28,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    gap: 16,
    justifyContent: "center",
  },
  illustration: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  innerCircle: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  coreCircle: {
    width: 104,
    height: 104,
  },
  title: {
    fontSize: 38,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 26,
  },
  nameInput: {
    height: 56,
    paddingHorizontal: 16,
    fontSize: 17,
    borderWidth: 1.5,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
  bottom: {
    paddingHorizontal: 28,
  },
  nextBtn: {
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  nextText: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
