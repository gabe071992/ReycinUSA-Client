import { Stack } from "expo-router";
import { theme } from "@/constants/theme";

export default function OBDLayout() {
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
          title: "OBD Diagnostics",
          headerTitleAlign: "center",
        }} 
      />
      <Stack.Screen 
        name="connect" 
        options={{ 
          title: "Connect Device",
        }} 
      />
      <Stack.Screen 
        name="dashboard" 
        options={{ 
          title: "Live Data",
        }} 
      />
      <Stack.Screen 
        name="dtcs" 
        options={{ 
          title: "Fault Codes",
        }} 
      />
      <Stack.Screen 
        name="actuations" 
        options={{ 
          title: "Actuations",
        }} 
      />
    </Stack>
  );
}