import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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

const GENDER_OPTIONS = [
  "Man",
  "Woman",
  "Non-binary",
  "Genderfluid",
  "Agender",
  "Prefer not to say",
];

function GenderPicker({
  value,
  onSelect,
  colors,
  hasError,
}: {
  value: string;
  onSelect: (v: string) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.input,
          styles.pickerBtn,
          {
            backgroundColor: colors.card,
            borderColor: hasError
              ? colors.destructive
              : value
              ? colors.foreground
              : colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        <Text
          style={[
            styles.pickerBtnText,
            { color: value ? colors.foreground : colors.mutedForeground },
          ]}
        >
          {value || "Gender"}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>▼</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.card,
                paddingBottom:
                  (Platform.OS === "web" ? 24 : insets.bottom) + 16,
              },
            ]}
          >
            <View
              style={[styles.modalHandle, { backgroundColor: colors.border }]}
            />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Select Gender
            </Text>
            {GENDER_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelect(opt);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.modalOption,
                  {
                    backgroundColor:
                      opt === value
                        ? colors.foreground + "10"
                        : pressed
                        ? colors.secondary
                        : "transparent",
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    {
                      color: colors.foreground,
                      fontFamily:
                        opt === value
                          ? "Inter_600SemiBold"
                          : "Inter_400Regular",
                    },
                  ]}
                >
                  {opt}
                </Text>
                {opt === value && (
                  <Text style={{ color: colors.accent, fontSize: 18 }}>✓</Text>
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding, signIn } = useCloset();

  const [step, setStep] = useState(0);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showSignInForm, setShowSignInForm] = useState(false);

  // Registration fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign-in fields
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInError, setSignInError] = useState("");

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isAuthStep = step === STEPS.length;
  const totalDots = STEPS.length + 1;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const currentStep = STEPS[step];

  const animate = (cb: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
    cb();
  };

  const goNext = () => {
    Haptics.selectionAsync();
    if (step < STEPS.length) animate(() => setStep((s) => s + 1));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "Required";
    if (!lastName.trim()) errs.lastName = "Required";
    if (!email.trim() || !email.includes("@"))
      errs.email = "Enter a valid email";
    if (!password || password.length < 6)
      errs.password = "At least 6 characters";
    if (
      !age.trim() ||
      isNaN(Number(age)) ||
      Number(age) < 13 ||
      Number(age) > 120
    )
      errs.age = "Must be 13+";
    if (!gender) errs.gender = "Required";
    return errs;
  };

  const handleCreateAccount = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setIsSubmitting(true);
    try {
      await completeOnboarding({ firstName, lastName, email, password, age, gender });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("register error", JSON.stringify(err));
      if (err?.error === "email_taken") {
        setErrors({ email: "An account with this email already exists." });
      } else if (err?.message) {
        setErrors({ email: `Error: ${err.message}` });
      } else {
        setErrors({ email: `Error: ${JSON.stringify(err)}` });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async () => {
    setSignInError("");
    if (!signInEmail.trim() || !signInPassword) {
      setSignInError("Please enter your email and password.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    const result = await signIn(signInEmail.trim(), signInPassword);
    if (result === "ok") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } else if (result === "wrong_password") {
      setSignInError("Incorrect password. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setSignInError("No account found with that email.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const inputBorder = (field: string) =>
    errors[field] ? colors.destructive : colors.border;

  // ── Full-screen sign-in form ─────────────────────────────────────────────
  if (showSignInForm) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.formScreen,
            { paddingTop: topPad + 20, paddingBottom: botPad + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => { setShowSignInForm(false); setSignInError(""); }} style={styles.backBtn}>
            <Text style={[styles.backBtnText, { color: colors.mutedForeground }]}>← Back</Text>
          </Pressable>

          <View style={styles.formHeader}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>Welcome back.</Text>
            <Text style={[styles.formSubtitle, { color: colors.mutedForeground }]}>
              Sign in to your Closetfy account.
            </Text>
          </View>

          <View style={styles.fields}>
            {/* Email */}
            <TextInput
              value={signInEmail}
              onChangeText={(v) => { setSignInEmail(v); setSignInError(""); }}
              placeholder="Email address"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: signInError ? colors.destructive : colors.border,
                  color: colors.foreground,
                  borderRadius: colors.radius,
                },
              ]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
              returnKeyType="next"
            />

            {/* Password */}
            <View
              style={[
                styles.input,
                styles.passwordWrap,
                {
                  backgroundColor: colors.card,
                  borderColor: signInError ? colors.destructive : colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <TextInput
                value={signInPassword}
                onChangeText={(v) => { setSignInPassword(v); setSignInError(""); }}
                placeholder="Password"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.passwordInput, { color: colors.foreground }]}
                secureTextEntry={!showSignInPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
              />
              <Pressable onPress={() => setShowSignInPassword((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
                <Text style={{ fontSize: 18, color: colors.mutedForeground }}>
                  {showSignInPassword ? "🙈" : "👁"}
                </Text>
              </Pressable>
            </View>

            {/* Error */}
            {signInError ? (
              <Text style={[styles.errMsg, { color: colors.destructive, fontSize: 14, marginTop: -4 }]}>
                {signInError}
              </Text>
            ) : null}
          </View>

          <View style={styles.formBottom}>
            <Pressable
              onPress={handleSignIn}
              style={({ pressed }) => [
                styles.createBtn,
                {
                  backgroundColor: colors.foreground,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.87 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>
                Sign in
              </Text>
            </Pressable>

            <Pressable onPress={() => { setShowSignInForm(false); setShowEmailForm(true); }}>
              <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
                Don't have an account?{" "}
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                  Sign up
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Full-screen email registration form ──────────────────────────────────
  if (showEmailForm) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.formScreen,
            {
              paddingTop: topPad + 20,
              paddingBottom: botPad + 32,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable
            onPress={() => setShowEmailForm(false)}
            style={styles.backBtn}
          >
            <Text style={[styles.backBtnText, { color: colors.mutedForeground }]}>
              ← Back
            </Text>
          </Pressable>

          {/* Header */}
          <View style={styles.formHeader}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>
              Create account
            </Text>
            <Text
              style={[styles.formSubtitle, { color: colors.mutedForeground }]}
            >
              Tell us a bit about yourself.
            </Text>
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            {/* First + Last name */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={firstName}
                  onChangeText={(v) => {
                    setFirstName(v);
                    setErrors((e) => ({ ...e, firstName: "" }));
                  }}
                  placeholder="First name"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: inputBorder("firstName"),
                      color: colors.foreground,
                      borderRadius: colors.radius,
                    },
                  ]}
                  autoFocus
                  returnKeyType="next"
                />
                {errors.firstName ? (
                  <Text
                    style={[styles.errMsg, { color: colors.destructive }]}
                  >
                    {errors.firstName}
                  </Text>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={lastName}
                  onChangeText={(v) => {
                    setLastName(v);
                    setErrors((e) => ({ ...e, lastName: "" }));
                  }}
                  placeholder="Last name"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: inputBorder("lastName"),
                      color: colors.foreground,
                      borderRadius: colors.radius,
                    },
                  ]}
                  returnKeyType="next"
                />
                {errors.lastName ? (
                  <Text
                    style={[styles.errMsg, { color: colors.destructive }]}
                  >
                    {errors.lastName}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Email */}
            <View>
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setErrors((e) => ({ ...e, email: "" }));
                }}
                placeholder="Email address"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: inputBorder("email"),
                    color: colors.foreground,
                    borderRadius: colors.radius,
                  },
                ]}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
              {errors.email ? (
                <Text style={[styles.errMsg, { color: colors.destructive }]}>
                  {errors.email}
                </Text>
              ) : null}
            </View>

            {/* Password */}
            <View>
              <View
                style={[
                  styles.input,
                  styles.passwordWrap,
                  {
                    backgroundColor: colors.card,
                    borderColor: inputBorder("password"),
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setErrors((e) => ({ ...e, password: "" }));
                  }}
                  placeholder="Password"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.passwordInput,
                    { color: colors.foreground },
                  ]}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                  style={styles.eyeBtn}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      color: colors.mutedForeground,
                    }}
                  >
                    {showPassword ? "🙈" : "👁"}
                  </Text>
                </Pressable>
              </View>
              {errors.password ? (
                <Text style={[styles.errMsg, { color: colors.destructive }]}>
                  {errors.password}
                </Text>
              ) : null}
            </View>

            {/* Age + Gender */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={age}
                  onChangeText={(v) => {
                    setAge(v.replace(/[^0-9]/g, ""));
                    setErrors((e) => ({ ...e, age: "" }));
                  }}
                  placeholder="Age"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: inputBorder("age"),
                      color: colors.foreground,
                      borderRadius: colors.radius,
                    },
                  ]}
                  keyboardType="number-pad"
                  maxLength={3}
                  returnKeyType="done"
                />
                {errors.age ? (
                  <Text
                    style={[styles.errMsg, { color: colors.destructive }]}
                  >
                    {errors.age}
                  </Text>
                ) : null}
              </View>
              <View style={{ flex: 1.5 }}>
                <GenderPicker
                  value={gender}
                  onSelect={(v) => {
                    setGender(v);
                    setErrors((e) => ({ ...e, gender: "" }));
                  }}
                  colors={colors}
                  hasError={!!errors.gender}
                />
                {errors.gender ? (
                  <Text
                    style={[styles.errMsg, { color: colors.destructive }]}
                  >
                    {errors.gender}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* CTA */}
          <View style={styles.formBottom}>
            <Pressable
              onPress={handleCreateAccount}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.createBtn,
                {
                  backgroundColor: colors.foreground,
                  borderRadius: colors.radius,
                  opacity: isSubmitting ? 0.6 : pressed ? 0.87 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text
                style={[styles.createBtnText, { color: colors.primaryForeground }]}
              >
                {isSubmitting ? "Creating account…" : "Create account"}
              </Text>
            </Pressable>

            <Text
              style={[styles.termsText, { color: colors.mutedForeground }]}
            >
              By continuing you agree to our Terms of Service and Privacy
              Policy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Normal onboarding flow ───────────────────────────────────────────────
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
                backgroundColor:
                  i <= step ? colors.foreground : colors.border,
                width: i === step ? 28 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Content */}
      <Animated.View style={[{ opacity: fadeAnim }, styles.contentWrap]}>
        {!isAuthStep ? (
          <View style={styles.slideContent}>
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
          </View>
        ) : (
          <View style={styles.authContent}>
            <Text style={[styles.authTitle, { color: colors.foreground }]}>
              {"Let's get\nstarted."}
            </Text>
            <Text
              style={[styles.authSubtitle, { color: colors.mutedForeground }]}
            >
              Create your account to save your wardrobe across devices.
            </Text>

            <View style={styles.authButtons}>
              {/* Google — coming soon */}
              <Pressable
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
                <Text style={[styles.socialIcon, { color: colors.mutedForeground }]}>G</Text>
                <Text style={[styles.socialBtnText, { color: colors.mutedForeground }]}>
                  Continue with Google
                </Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Soon</Text>
                </View>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Sign in — primary big button */}
              <Pressable
                onPress={() => setShowSignInForm(true)}
                style={({ pressed }) => [
                  styles.socialBtn,
                  {
                    backgroundColor: colors.foreground,
                    borderColor: colors.foreground,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <Text style={[styles.socialBtnText, { color: colors.primaryForeground, textAlign: "center" }]}>
                  Sign in
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Bottom */}
      {!isAuthStep && (
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
      )}

      {isAuthStep && (
        <View style={[styles.bottom, { paddingBottom: botPad + 24 }]}>
          <Pressable onPress={() => setShowEmailForm(true)} style={styles.signInLink}>
            <Text style={[styles.signInText, { color: colors.mutedForeground }]}>
              Don't have an account?{" "}
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                Sign up
              </Text>
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Onboarding flow ──
  container: { flex: 1 },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 28,
    marginBottom: 28,
  },
  dot: { height: 8, borderRadius: 4 },
  contentWrap: { flex: 1, paddingHorizontal: 28 },
  slideContent: { flex: 1, justifyContent: "center", gap: 16 },
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
  stepIcon: { fontSize: 52 },
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
  authContent: { flex: 1, justifyContent: "center", gap: 20 },
  authTitle: {
    fontSize: 38,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  authSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
  },
  authButtons: { gap: 12 },
  socialBtn: {
    height: 56,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
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
    flex: 1,
  },
  comingSoonBadge: {
    backgroundColor: "#E5DDD6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  comingSoonText: {
    fontSize: 11,
    color: "#78716C",
    fontFamily: "Inter_500Medium",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  bottom: { paddingHorizontal: 28 },
  nextBtn: { height: 58, alignItems: "center", justifyContent: "center" },
  nextText: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  signInLink: { alignItems: "center", paddingVertical: 12 },
  signInText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  // ── Full-screen form ──
  formScreen: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 0,
  },
  backBtn: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    marginBottom: 24,
  },
  backBtnText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  formHeader: {
    gap: 6,
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 34,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  fields: {
    flex: 1,
    gap: 14,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1.5,
    fontFamily: "Inter_400Regular",
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  eyeBtn: {
    paddingLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerBtnText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  errMsg: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    marginLeft: 2,
  },
  formBottom: {
    marginTop: 32,
    gap: 16,
  },
  createBtn: {
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  termsText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },

  // ── Gender modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 4,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  modalOptionText: { fontSize: 16 },
});
