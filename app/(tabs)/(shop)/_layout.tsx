import { Stack } from "expo-router";
import { theme } from "@/constants/theme";

export default function ShopLayout() {
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
          title: "Shop",
          headerTitleAlign: "center",
        }} 
      />
      <Stack.Screen 
        name="category/[id]" 
        options={{ 
          title: "Category",
        }} 
      />
      <Stack.Screen 
        name="product/[id]" 
        options={{ 
          title: "Product",
        }} 
      />
      <Stack.Screen 
        name="cart" 
        options={{ 
          title: "Cart",
        }} 
      />
      <Stack.Screen 
        name="checkout" 
        options={{ 
          title: "Checkout",
        }} 
      />
    </Stack>
  );
}