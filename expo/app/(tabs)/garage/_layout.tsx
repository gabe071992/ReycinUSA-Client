import { Stack } from "expo-router";
import { theme } from "@/constants/theme";

export default function GarageLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.black,
        },
        headerTintColor: theme.colors.white,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.colors.black,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "My Garage",
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Vehicle",
          headerTitleAlign: "center",
          headerBackTitle: "Garage",
        }}
      />
      <Stack.Screen
        name="obd"
        options={{
          title: "OBD Diagnostics",
          headerTitleAlign: "center",
          headerBackTitle: "Vehicle",
        }}
      />
    </Stack>
  );
}
