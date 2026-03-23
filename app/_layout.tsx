import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/providers/AuthProvider";
import { CartProvider } from "@/providers/CartProvider";
import { OBDProvider } from "@/providers/OBDProvider";
import { BRGAuthProvider } from "@/providers/BRGAuthProvider";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      animation: "fade",
      contentStyle: { backgroundColor: "#000" }
    }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="f300-explorer" options={{ animation: "slide_from_right", headerShown: false }} />
      <Stack.Screen name="cart" options={{ animation: "slide_from_bottom", headerShown: false }} />
      <Stack.Screen name="brg-auth" options={{ animation: "slide_from_bottom", headerShown: false }} />
      <Stack.Screen name="orders" options={{ animation: "slide_from_right", headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    setTimeout(() => {
      void SplashScreen.hideAsync();
    }, 1500);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
        <AuthProvider>
          <BRGAuthProvider>
            <CartProvider>
              <OBDProvider>
                <RootLayoutNav />
              </OBDProvider>
            </CartProvider>
          </BRGAuthProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
