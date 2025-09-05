import { Stack } from "expo-router";
import { theme } from "@/constants/theme";

export default function GarageLayout() {
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
      <Stack.Screen name="vehicle/[id]" />
      <Stack.Screen name="service-booking" />
    </Stack>
  );
}