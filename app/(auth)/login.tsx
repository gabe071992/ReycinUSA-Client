import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { theme } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";

export default function LoginScreen() {
  const { signIn, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const glowAnim = new Animated.Value(0);

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) return;
    
    setLoading(true);
    try {
      await signIn(email, password, rememberMe);
      router.replace("/(tabs)/(home)");
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#000", "#0A0A0A", "#000"]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <View style={styles.logoContainer}>
          <Animated.View
            style={[
              styles.glowEffect,
              {
                opacity: glowAnim,
              },
            ]}
          />
          <Text style={styles.logo}>REYCIN</Text>
          <Text style={styles.tagline}>USA</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={theme.colors.textGray}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            testID="email-input"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.colors.textGray}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="password-input"
          />

          {error && (
            <Text style={styles.error}>{error}</Text>
          )}

          <TouchableOpacity
            style={styles.rememberMeContainer}
            onPress={() => setRememberMe(!rememberMe)}
            testID="remember-me-checkbox"
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.rememberMeText}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
            testID="login-button"
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.black} />
            ) : (
              <Text style={styles.buttonText}>SIGN IN</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/register")}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>
              New to Reycin? Create Account
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: theme.spacing.xl,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: theme.spacing.xxl,
    position: "relative",
  },
  logo: {
    fontSize: 56,
    fontWeight: "200",
    color: theme.colors.white,
    letterSpacing: 8,
  },
  tagline: {
    fontSize: 18,
    fontWeight: "300",
    color: theme.colors.textGray,
    letterSpacing: 4,
    marginTop: -8,
  },
  glowEffect: {
    position: "absolute",
    width: 200,
    height: 200,
    backgroundColor: theme.colors.white,
    borderRadius: 100,
    opacity: 0.05,
  },
  form: {
    width: "100%",
  },
  input: {
    height: 56,
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    color: theme.colors.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  button: {
    height: 56,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
  buttonText: {
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
  },
  linkButton: {
    marginTop: theme.spacing.lg,
    alignItems: "center",
  },
  linkText: {
    color: theme.colors.textGray,
    fontSize: 14,
  },
  error: {
    color: theme.colors.error,
    fontSize: 14,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: theme.colors.borderGray,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.white,
  },
  checkmark: {
    color: theme.colors.black,
    fontSize: 12,
    fontWeight: "bold",
  },
  rememberMeText: {
    color: theme.colors.textGray,
    fontSize: 14,
  },
});