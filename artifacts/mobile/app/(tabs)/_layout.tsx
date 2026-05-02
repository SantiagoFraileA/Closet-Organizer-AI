import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "tshirt", selected: "tshirt.fill" }} />
        <Label>Closet</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="outfits">
        <Icon sf={{ default: "shuffle", selected: "shuffle" }} />
        <Label>Outfits</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="add">
        <Icon sf={{ default: "plus.circle", selected: "plus.circle.fill" }} />
        <Label>Add</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Icon sf={{ default: "sparkles", selected: "sparkles" }} />
        <Label>Explore</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 68,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
          marginBottom: isWeb ? 0 : 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Closet",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="tshirt" tintColor={color} size={22} />
            ) : (
              <Feather name="layers" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="outfits"
        options={{
          title: "Outfits",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="shuffle" tintColor={color} size={22} />
            ) : (
              <Feather name="shuffle" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "Add",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "plus.circle.fill" : "plus.circle"}
                tintColor={focused ? colors.accent : color}
                size={28}
              />
            ) : (
              <Feather
                name="plus-circle"
                size={24}
                color={focused ? colors.accent : color}
              />
            ),
          tabBarActiveTintColor: colors.accent,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="sparkles" tintColor={color} size={22} />
            ) : (
              <Feather name="zap" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={22} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  addIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
