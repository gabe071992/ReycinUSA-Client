import { Tabs } from 'expo-router';
import { Home, ShoppingBag, Activity, Wrench, User } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#666666',
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(shop)"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <ShoppingBag size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(obd)"
        options={{
          title: 'OBD',
          tabBarIcon: ({ color }) => <Activity size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(garage)"
        options={{
          title: 'Garage',
          tabBarIcon: ({ color }) => <Wrench size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(account)"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#000000',
    borderTopColor: '#1E1E1E',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});