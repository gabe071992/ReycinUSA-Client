import { Stack } from "expo-router";
import { theme } from "@/constants/theme";

export default function AccountLayout() {
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
          title: "Account",
          headerTitleAlign: "center",
        }} 
      />
      <Stack.Screen 
        name="orders" 
        options={{ 
          title: "Orders",
        }} 
      />
      <Stack.Screen 
        name="addresses" 
        options={{ 
          title: "Addresses",
        }} 
      />
      <Stack.Screen 
        name="settings" 
        options={{ 
          title: "Settings",
        }} 
      />
    </Stack>
  );
}