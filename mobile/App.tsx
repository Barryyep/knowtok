import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { Session } from "@supabase/supabase-js";
import { Fraunces_500Medium, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from "@expo-google-fonts/instrument-sans";
import { SpaceMono_400Regular, SpaceMono_700Bold } from "@expo-google-fonts/space-mono";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { systemLanguage, t } from "./src/i18n";
import { fetchRemotePersona } from "./src/lib/personaService";
import { loadProfile, saveProfile } from "./src/lib/storage";
import { supabase } from "./src/lib/supabase";
import type { Profile } from "./src/lib/types";
import { AuthScreen } from "./src/screens/AuthScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { TodayScreen } from "./src/screens/TodayScreen";
import { colors } from "./src/theme";

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.ink900,
    card: colors.ink800,
    border: colors.inkLine,
    primary: colors.persimmon,
    text: colors.inkText,
  },
};

type TabIcon = keyof typeof Ionicons.glyphMap;

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
    // 霞鹜文楷 Lite — the ZH hero font. Bundled TTFs (~13MB each).
    "LXGWWenKai-Regular": require("./assets/fonts/LXGWWenKaiLite-Regular.ttf"),
    "LXGWWenKai-Medium": require("./assets/fonts/LXGWWenKaiLite-Medium.ttf"),
  });

  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Once signed in, load the persona: local first, then the shared
  // user_personas row (so web-app profiles carry over).
  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    void (async () => {
      const local = await loadProfile();
      if (local) {
        setProfile(local);
        return;
      }
      const remote = await fetchRemotePersona();
      if (remote) {
        await saveProfile(remote);
        setProfile(remote);
      }
    })();
  }, [session]);

  const language = profile?.language ?? systemLanguage();
  const strings = t(language);

  // Stable per-screen renderers so the tab navigator doesn't see a new
  // function identity every render (would remount the screens). Keyed on
  // profile — the only value they close over.
  const renderToday = useCallback(
    () => (profile ? <TodayScreen profile={profile} /> : null),
    [profile],
  );
  const renderHistory = useCallback(
    () => (profile ? <HistoryScreen profile={profile} /> : null),
    [profile],
  );
  const renderSettings = useCallback(
    () =>
      profile ? (
        <SettingsScreen profile={profile} onEditProfile={() => setEditingProfile(true)} />
      ) : null,
    [profile],
  );

  // If a font fails to load, don't hang on the splash forever — log and render
  // with system fonts (treat as loaded).
  useEffect(() => {
    if (fontError) {
      console.error("Font loading failed — falling back to system fonts:", fontError);
    }
  }, [fontError]);

  // Plain dark desk while the fonts (and session) settle.
  if ((!fontsLoaded && !fontError) || booting) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.persimmon} size="large" />
      </View>
    );
  }

  let content: React.ReactNode;
  if (!session) {
    content = <AuthScreen language={language} />;
  } else if (!profile || editingProfile) {
    content = (
      <ProfileScreen
        initial={profile}
        isFirstRun={!profile}
        onSaved={(saved) => {
          setProfile(saved);
          setEditingProfile(false);
        }}
        onCancel={profile ? () => setEditingProfile(false) : undefined}
      />
    );
  } else {
    content = (
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: colors.ink800,
              borderTopColor: colors.inkLine,
            },
            tabBarActiveTintColor: colors.marigold,
            tabBarInactiveTintColor: colors.inkMuted,
            tabBarLabelStyle: { fontSize: 11 },
          }}
        >
          <Tab.Screen
            name="today"
            options={{
              title: strings.tabToday,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name={"mail-open-outline" as TabIcon} color={color} size={size} />
              ),
            }}
          >
            {renderToday}
          </Tab.Screen>
          <Tab.Screen
            name="history"
            options={{
              title: strings.tabHistory,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name={"albums-outline" as TabIcon} color={color} size={size} />
              ),
            }}
          >
            {renderHistory}
          </Tab.Screen>
          <Tab.Screen
            name="settings"
            options={{
              title: strings.tabSettings,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name={"settings-outline" as TabIcon} color={color} size={size} />
              ),
            }}
          >
            {renderSettings}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="light" />
        {content}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink900 },
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink900 },
});
