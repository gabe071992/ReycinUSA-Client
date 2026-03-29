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
    </Stack>
  );
}