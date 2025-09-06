import { Tabs } from "expo-router";
import React from "react";
import { View, Text } from "react-native";
import { Home, ShoppingBag, Activity, Car, User } from "lucide-react-native";
import { theme } from "@/constants/theme";
import { useCart } from "@/providers/CartProvider";

function TabBarIcon({ icon: Icon, color, focused }: any) {
  return (
    <View style={{ alignItems: "center" }}>
      <Icon color={color} size={24} strokeWidth={focused ? 2 : 1.5} />
    </View>
  );
}

function CartTabIcon({ color, focused }: any) {
  const { getItemCount } = useCart();
  const count = getItemCount();
  
  return (
    <View style={{ alignItems: "center" }}>
      <ShoppingBag color={color} size={24} strokeWidth={focused ? 2 : 1.5} />
      {count > 0 && (
        <View style={{
          position: "absolute",
          top: -4,
          right: -8,
          backgroundColor: theme.colors.white,
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 4,
        }}>
          <Text style={{ 
            color: theme.colors.black, 
            fontSize: 11, 
            fontWeight: "600" 
          }}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.white,
        tabBarInactiveTintColor: theme.colors.textGray,
        tabBarStyle: {
          backgroundColor: theme.colors.black,
          borderTopColor: theme.colors.borderGray,
          borderTopWidth: 0.5,
          height: 88,
          paddingBottom: 34,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "F300",
          tabBarIcon: (props) => <TabBarIcon icon={Home} {...props} />,
        }}
      />
      <Tabs.Screen
        name="(shop)"
        options={{
          title: "Shop",
          tabBarIcon: CartTabIcon,
        }}
      />
      <Tabs.Screen
        name="(obd)"
        options={{
          title: "OBD",
          tabBarIcon: (props) => <TabBarIcon icon={Activity} {...props} />,
        }}
      />
      <Tabs.Screen
        name="(garage)"
        options={{
          title: "Garage",
          tabBarIcon: (props) => <TabBarIcon icon={Car} {...props} />,
        }}
      />
      <Tabs.Screen
        name="(account)"
        options={{
          title: "Account",
          tabBarIcon: (props) => <TabBarIcon icon={User} {...props} />,
        }}
      />
    </Tabs>
  );
}