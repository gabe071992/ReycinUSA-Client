import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { theme } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Mail } from "lucide-react-native";

export default function VerifyEmailScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#000", "#0A0A0A", "#000"]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Mail color={theme.colors.white} size={64} />
        </View>
        
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.description}>
          We've sent a verification link to your email address. 
          Please check your inbox and click the link to verify your account.
        </Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.buttonText}>CONTINUE TO LOGIN</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.darkGray,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: 16,
    color: theme.colors.textGray,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  button: {
    height: 56,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  buttonText: {
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
  },
});