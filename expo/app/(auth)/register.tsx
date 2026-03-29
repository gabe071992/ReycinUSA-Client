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
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { theme } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft } from "lucide-react-native";

export default function RegisterScreen() {
  const { signUp, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  const handleRegister = async () => {
    setValidationError("");
    
    if (!email || !password || !displayName) {
      setValidationError("All fields are required");
      return;
    }
    
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    try {
      await signUp(email, password, displayName);
      router.replace("/(auth)/verify-email");
    } catch (err) {
      console.error("Registration failed:", err);
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
      
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft color={theme.colors.white} size={24} />
        </TouchableOpacity>
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the Reycin community</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Display Name"
              placeholderTextColor={theme.colors.textGray}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={theme.colors.textGray}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={theme.colors.textGray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={theme.colors.textGray}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            {(error || validationError) && (
              <Text style={styles.error}>{error || validationError}</Text>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.black} />
              ) : (
                <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.terms}>
              By creating an account, you agree to Reycin's Terms of Service
              and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
  },
  titleContainer: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textGray,
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
  error: {
    color: theme.colors.error,
    fontSize: 14,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  terms: {
    color: theme.colors.textGray,
    fontSize: 12,
    textAlign: "center",
    marginTop: theme.spacing.lg,
    lineHeight: 18,
  },
});