import { Stack } from "expo-router";
import { theme } from "@/constants/theme";

export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.black,
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="addresses" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}