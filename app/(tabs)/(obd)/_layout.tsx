import { Stack } from "expo-router";
import { theme } from "@/constants/theme";

export default function OBDLayout() {
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
      <Stack.Screen name="connect" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="dtcs" />
      <Stack.Screen name="actuations" />
    </Stack>
  );
}