import { Tabs, router } from "expo-router";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Home, ShoppingBag, Flag, Car, User } from "lucide-react-native";
import { theme } from "@/constants/theme";
import { useCart } from "@/providers/CartProvider";

const GOLD = "#C9A84C";
const DEEP_BLACK = "#0A0A0A";

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
            fontWeight: "600",
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
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: "rgba(255,255,255,0.3)",
        tabBarStyle: {
          backgroundColor: DEEP_BLACK,
          borderTopColor: "rgba(201,168,76,0.15)",
          borderTopWidth: 0.5,
          height: 88,
          paddingBottom: 34,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          letterSpacing: 1.2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "F300",
          tabBarIcon: (props) => <TabBarIcon icon={Home} {...props} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shop",
          tabBarIcon: CartTabIcon,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.replace("/shop");
          },
        }}
      />
      <Tabs.Screen
        name="race"
        options={{
          title: "Race",
          tabBarIcon: (props) => <TabBarIcon icon={Flag} {...props} />,
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: "Garage",
          tabBarIcon: (props) => <TabBarIcon icon={Car} {...props} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: (props) => <TabBarIcon icon={User} {...props} />,
        }}
      />
      <Tabs.Screen
        name="obd"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
