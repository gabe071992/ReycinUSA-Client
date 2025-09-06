import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { theme } from "@/constants/theme";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center", 
        backgroundColor: theme.colors.black 
      }}>
        <ActivityIndicator size="large" color={theme.colors.white} />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)/(home)" />;
  }

  return <Redirect href="/(auth)/login" />;
}