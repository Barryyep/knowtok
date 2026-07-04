import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";

import { t } from "../i18n";
import { supabase } from "../lib/supabase";
import type { AppLanguage } from "../lib/types";
import { colors, fonts, heroFont, radius, spacing, uiFont } from "../theme";

interface Props {
  language: AppLanguage;
}

// Google needs OAuth client IDs that only the founder can mint in Google Cloud
// Console. The Web client id is the one Supabase verifies id-tokens against, so
// without it the Google button is meaningless — hide it until env is present.
// See mobile/README.md → 第三方登录.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const googleEnabled = Boolean(GOOGLE_WEB_CLIENT_ID);

if (googleEnabled) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
}

export function AuthScreen({ language }: Props) {
  const strings = t(language);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
    }
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signIn") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        // Success: onAuthStateChange in App.tsx flips to the main app.
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (!data.session) setNotice(strings.checkEmail);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const signInWithApple = async () => {
    setError(null);
    setNotice(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error("Apple did not return an identity token.");
      }
      const { error: err } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (err) throw err;
      // Success → onAuthStateChange in App.tsx swaps in the main app.
    } catch (err) {
      // User taps Cancel → the library throws with code ERR_REQUEST_CANCELED.
      if ((err as { code?: string })?.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    setNotice(null);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) {
        return; // user cancelled
      }
      const idToken = response.data.idToken;
      if (!idToken) {
        throw new Error("Google did not return an id token.");
      }
      const { error: err } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      if (err) throw err;
      // Success → onAuthStateChange in App.tsx swaps in the main app.
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const showSocial = (Platform.OS === "ios" && appleAvailable) || googleEnabled;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Image source={require("../../assets/icon.png")} style={styles.logo} />
        <Text style={styles.eyebrow}>OHLO · DAILY DISPATCH</Text>
        <Text style={[styles.title, { fontFamily: heroFont(language) }]}>{strings.welcomeTitle}</Text>
        <Text style={[styles.subtitle, { fontFamily: uiFont(language) }]}>
          {strings.welcomeSubtitle}
        </Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder={strings.email}
          placeholderTextColor={colors.inkMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={strings.password}
          placeholderTextColor={colors.inkMuted}
          secureTextEntry
          textContentType="password"
        />

        {error && <Text style={[styles.error, { fontFamily: uiFont(language) }]}>{error}</Text>}
        {notice && <Text style={[styles.notice, { fontFamily: uiFont(language) }]}>{notice}</Text>}

        <Pressable style={styles.primaryButton} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.paper0} />
          ) : (
            <Text style={[styles.primaryButtonText, { fontFamily: uiFont(language, "semibold") }]}>
              {mode === "signIn" ? strings.signIn : strings.signUp}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
          hitSlop={8}
          style={styles.switchLink}
        >
          <Text style={[styles.switchLinkText, { fontFamily: uiFont(language) }]}>
            {mode === "signIn" ? strings.switchToSignUp : strings.switchToSignIn}
          </Text>
        </Pressable>

        {showSocial && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={[styles.dividerText, { fontFamily: uiFont(language) }]}>
                {strings.orDivider}
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {Platform.OS === "ios" && appleAvailable && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={radius.pill}
                style={styles.appleButton}
                onPress={signInWithApple}
              />
            )}

            {googleEnabled && (
              <Pressable style={styles.googleButton} onPress={signInWithGoogle}>
                <Text
                  style={[styles.googleButtonText, { fontFamily: uiFont(language, "semibold") }]}
                >
                  {strings.continueWithGoogle}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink900 },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl * 3, flexGrow: 1 },
  logo: { width: 60, height: 60, borderRadius: 14, marginBottom: spacing.lg },
  eyebrow: {
    color: colors.marigold,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  title: { color: colors.inkText, fontSize: 34, lineHeight: 44 },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: colors.ink800,
    borderColor: colors.inkLine,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.inkText,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    marginBottom: spacing.md,
  },
  error: { color: colors.persimmon, marginBottom: spacing.md },
  notice: { color: colors.marigold, marginBottom: spacing.md },
  primaryButton: {
    backgroundColor: colors.persimmon,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryButtonText: { color: colors.paper0, fontSize: 16 },
  switchLink: { alignItems: "center", marginTop: spacing.lg },
  switchLinkText: { color: colors.marigold, fontSize: 14 },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.inkLine },
  dividerText: {
    color: colors.inkMuted,
    fontSize: 13,
    marginHorizontal: spacing.md,
  },
  appleButton: { height: 50, width: "100%", marginBottom: spacing.md },
  googleButton: {
    backgroundColor: colors.paper0,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: "center",
  },
  googleButtonText: { color: colors.ink900, fontSize: 16 },
});
