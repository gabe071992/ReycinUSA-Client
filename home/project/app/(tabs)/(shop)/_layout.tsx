import { Stack } from 'expo-router';

export default function ShopLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Shop' }} />
      <Stack.Screen name="category/[category]" options={{ title: 'Category' }} />
      <Stack.Screen name="product/[productId]" options={{ title: 'Product Details' }} />
      <Stack.Screen name="cart" options={{ title: 'Cart' }} />
    </Stack>
  );
}