import { Stack } from 'expo-router';

export default function HomeLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Reycin USA' }} />
    </Stack>
  );
}