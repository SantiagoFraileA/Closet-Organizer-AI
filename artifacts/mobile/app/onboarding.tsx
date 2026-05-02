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
    icon: "🪡",
  },
  {
    title: "Snap, tag,\ndone.",
    subtitle:
      "Photograph your clothes and we'll organize them by category, color, and style automatically.",
    accent: "#1E3A5F",
    icon: "📸",
  },
  {
    title: "Outfits that\nfeel like you.",
    subtitle:
      "Get daily picks tailored to your taste — or unlock Comfort Zone mode for something bold.",
    accent: "#3730A3",
    icon: "✨",
  },
];

function GoogleIcon() {
  return (
    <Text style={{ fontSize: 18, lineHeight: 22 }}>G</Text>
  );
}

function AppleIcon({ color }: { color: string }) {
  return (
    <Text style={{ fontSize: 18, lineHeight: 22, color }}>🍎</Text>
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useCloset();
  const [step, setStep] = useState(0);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isAuthStep = step === STEPS.length;
  const totalDots = STEPS.length + 1;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const currentStep = STEPS[step];

  const animate = (cb: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    cb();
  };

  const goNext = () => {
    Haptics.selectionAsync();
    if (step < STEPS.length) {
      animate(() => setStep((s) => s + 1));
    }
  };

  const handleSocialAuth = (provider: "google" | "apple") => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeOnboarding("User");
    router.replace("/(tabs)");
  };

  const handleEmailAuth = () => {
    if (!showEmailForm) {
      setShowEmailForm(true);
      return;
    }
    if (!email.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeOnboarding(name.trim() || email.split("@")[0] || "Stylist");
    router.replace("/(tabs)");
  };

  const handleSignIn = () => {
    Haptics.selectionAsync();
    completeOnboarding("User");
    router.replace("/(tabs)");
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
        {Array.from({ length: totalDots }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i <= step ? colors.foreground : colors.border,
                width: i === step ? 28 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Content area */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {!isAuthStep ? (
          <>
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
                <Text style={styles.stepIcon}>{currentStep.icon}</Text>
              </View>
            </View>

            <Text style={[styles.title, { color: colors.foreground }]}>
              {currentStep.title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {currentStep.subtitle}
            </Text>
          </>
        ) : (
          /* Auth step */
          <View style={styles.authContent}>
            <Text style={[styles.authTitle, { color: colors.foreground }]}>
              {"Let's get\nstarted."}
            </Text>
            <Text style={[styles.authSubtitle, { color: colors.mutedForeground }]}>
              Create your account to save your wardrobe across devices.
            </Text>

            {showEmailForm ? (
              <View style={styles.emailForm}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
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
                  autoFocus
                  returnKeyType="next"
                />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
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
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleEmailAuth}
                />
                <Pressable
                  onPress={handleEmailAuth}
                  style={({ pressed }) => [
                    styles.authBtn,
                    {
                      backgroundColor: colors.foreground,
                      borderRadius: colors.radius,
                      opacity: pressed ? 0.85 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <Text style={[styles.authBtnText, { color: colors.primaryForeground }]}>
                    Create account
                  </Text>
                </Pressable>
                <Pressable onPress={() => setShowEmailForm(false)} style={styles.backLink}>
                  <Text style={[styles.backLinkText, { color: colors.mutedForeground }]}>
                    ← Back
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.authButtons}>
                {/* Google */}
                <Pressable
                  onPress={() => handleSocialAuth("google")}
                  style={({ pressed }) => [
                    styles.socialBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: colors.radius,
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <Text style={styles.socialIcon}>G</Text>
                  <Text style={[styles.socialBtnText, { color: colors.foreground }]}>
                    Continue with Google
                  </Text>
                </Pressable>

                {/* Apple */}
                <Pressable
                  onPress={() => handleSocialAuth("apple")}
                  style={({ pressed }) => [
                    styles.socialBtn,
                    {
                      backgroundColor: colors.foreground,
                      borderColor: colors.foreground,
                      borderRadius: colors.radius,
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <Text style={[styles.socialIcon, { color: colors.primaryForeground }]}>
                    
                  </Text>
                  <Text style={[styles.socialBtnText, { color: colors.primaryForeground }]}>
                    Continue with Apple
                  </Text>
                </Pressable>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>

                {/* Email */}
                <Pressable
                  onPress={handleEmailAuth}
                  style={({ pressed }) => [
                    styles.socialBtn,
                    {
                      backgroundColor: "transparent",
                      borderColor: colors.border,
                      borderRadius: colors.radius,
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <Text style={[styles.socialIcon, { color: colors.foreground }]}>✉</Text>
                  <Text style={[styles.socialBtnText, { color: colors.foreground }]}>
                    Sign up with Email
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </Animated.View>

      {/* Bottom area */}
      {!isAuthStep ? (
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
              {step === STEPS.length - 1 ? "Let's begin" : "Continue"}
            </Text>
          </Pressable>
        </View>
      ) : (
        !showEmailForm && (
          <View style={[styles.bottom, { paddingBottom: botPad + 24 }]}>
            <Pressable onPress={handleSignIn} style={styles.signInLink}>
              <Text style={[styles.signInText, { color: colors.mutedForeground }]}>
                Already have an account?{" "}
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                  Sign in
                </Text>
              </Text>
            </Pressable>
          </View>
        )
      )}
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
  stepIcon: {
    fontSize: 52,
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
  authContent: {
    gap: 20,
  },
  authTitle: {
    fontSize: 38,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 46,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  authSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    marginBottom: 8,
  },
  authButtons: {
    gap: 12,
  },
  socialBtn: {
    height: 56,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: "700",
    width: 22,
    textAlign: "center",
  },
  socialBtnText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  emailForm: {
    gap: 12,
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1.5,
    fontFamily: "Inter_400Regular",
  },
  authBtn: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  authBtnText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  backLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
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
  signInLink: {
    alignItems: "center",
    paddingVertical: 12,
  },
  signInText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
