import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBRGAuth } from "@/providers/BRGAuthProvider";
import { useCart } from "@/providers/CartProvider";
import { useAuth } from "@/providers/AuthProvider";
import { theme } from "@/constants/theme";
import { ShieldCheck, LogOut, ArrowRight, ChevronLeft } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";

const SHIPPING_RATE = 12.99;
const TAX_RATE = 0.06;

export default function BRGAuthScreen() {
  const insets = useSafeAreaInsets();
  const { brgUser, brgLoading, brgSignIn, brgSignUp, brgSignOut, submitInvoice } = useBRGAuth();
  const { items, getTotal, clearCart, isEmpty } = useCart();
  const { profile } = useAuth();

  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  const subtotal = getTotal();
  const shipping = isEmpty ? 0 : SHIPPING_RATE;
  const tax = (subtotal + shipping) * TAX_RATE;
  const total = subtotal + shipping + tax;

  const authMutation = useMutation({
    mutationFn: async () => {
      setFormError("");
      if (!email.trim()) throw new Error("Email is required.");
      if (!password) throw new Error("Password is required.");
      if (mode === "create") {
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        await brgSignUp(email.trim(), password);
      } else {
        await brgSignIn(email.trim(), password);
      }
    },
    onError: (err: any) => {
      setFormError(err.message);
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!brgUser) throw new Error("Not authenticated with BRG.");
      if (isEmpty) throw new Error("Your cart is empty.");
      const totals = { subtotal, shipping, tax, total };
      await submitInvoice(items, totals);
      await clearCart();
    },
    onSuccess: () => {
      router.replace("/orders" as any);
    },
    onError: (err: any) => {
      Alert.alert("Checkout Failed", err.message ?? "Please try again.");
    },
  });

  const handleSignOut = useCallback(async () => {
    await brgSignOut();
    setPassword("");
    setConfirmPassword("");
    setFormError("");
  }, [brgSignOut]);

  const formatPrice = (n: number) => `$${n.toFixed(2)}`;

  if (brgLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={theme.colors.white} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={theme.colors.white} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brgBadge}>
          <ShieldCheck size={22} color="#60A5FA" strokeWidth={1.8} />
          <View style={styles.brgBadgeText}>
            <Text style={styles.brgBadgeTitle}>BRG Invoice Account</Text>
            <Text style={styles.brgBadgeSubtitle}>Blackrock Resource Group</Text>
          </View>
        </View>

        <View style={styles.orderSummaryCard}>
          <Text style={styles.orderSummaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>{formatPrice(shipping)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (6%)</Text>
            <Text style={styles.summaryValue}>{formatPrice(tax)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </View>

        {brgUser ? (
          <View style={styles.authenticatedSection}>
            <View style={styles.signedInCard}>
              <View style={styles.signedInDot} />
              <View style={styles.signedInInfo}>
                <Text style={styles.signedInLabel}>Signed in as</Text>
                <Text style={styles.signedInEmail} numberOfLines={1}>{brgUser.email}</Text>
              </View>
              <TouchableOpacity onPress={handleSignOut} activeOpacity={0.7}>
                <LogOut size={18} color={theme.colors.textGray} strokeWidth={1.8} />
              </TouchableOpacity>
            </View>

            <Text style={styles.invoiceNote}>
              Your cart will be submitted as an invoice to Blackrock Resource Group. Our team will review your order, confirm availability, and send you a Stripe payment link.
            </Text>

            <TouchableOpacity
              style={[styles.submitBtn, checkoutMutation.isPending && styles.btnDisabled]}
              onPress={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending || isEmpty}
              activeOpacity={0.85}
              testID="submit-order-btn"
            >
              {checkoutMutation.isPending ? (
                <ActivityIndicator size="small" color={theme.colors.black} />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Submit Order</Text>
                  <ArrowRight size={18} color={theme.colors.black} strokeWidth={2} />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.authSection}>
            <Text style={styles.authExplain}>
              To complete your purchase, you need a BRG Invoice Account. This is separate from your Reycin account and is used exclusively for order invoicing and tracking.
            </Text>

            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, mode === "signin" && styles.modeTabActive]}
                onPress={() => { setMode("signin"); setFormError(""); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeTabText, mode === "signin" && styles.modeTabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, mode === "create" && styles.modeTabActive]}
                onPress={() => { setMode("create"); setFormError(""); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeTabText, mode === "create" && styles.modeTabTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setFormError(""); }}
                  placeholder="your@email.com"
                  placeholderTextColor={theme.colors.textGray}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="brg-email-input"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setFormError(""); }}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.textGray}
                  secureTextEntry
                  testID="brg-password-input"
                />
              </View>
              {mode === "create" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); setFormError(""); }}
                    placeholder="••••••••"
                    placeholderTextColor={theme.colors.textGray}
                    secureTextEntry
                    testID="brg-confirm-password-input"
                  />
                </View>
              )}

              {!!formError && (
                <Text style={styles.errorText}>{formError}</Text>
              )}

              <TouchableOpacity
                style={[styles.authBtn, authMutation.isPending && styles.btnDisabled]}
                onPress={() => authMutation.mutate()}
                disabled={authMutation.isPending}
                activeOpacity={0.85}
                testID="brg-auth-btn"
              >
                {authMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.black} />
                ) : (
                  <Text style={styles.authBtnText}>
                    {mode === "signin" ? "Sign In to BRG" : "Create BRG Account"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGray,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.white,
    letterSpacing: -0.3,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  brgBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(96,165,250,0.08)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.2)",
    borderRadius: 14,
    padding: 16,
  },
  brgBadgeText: {
    flex: 1,
  },
  brgBadgeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#60A5FA",
    letterSpacing: -0.2,
  },
  brgBadgeSubtitle: {
    fontSize: 12,
    color: "rgba(96,165,250,0.6)",
    marginTop: 1,
  },
  orderSummaryCard: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 18,
  },
  orderSummaryTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textGray,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textGray,
  },
  summaryValue: {
    fontSize: 14,
    color: theme.colors.white,
    fontWeight: "500",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: theme.colors.borderGray,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.white,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.white,
    letterSpacing: -0.5,
  },
  authenticatedSection: {
    gap: 16,
  },
  signedInCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(52,199,89,0.08)",
    borderWidth: 1,
    borderColor: "rgba(52,199,89,0.25)",
    borderRadius: 14,
    padding: 14,
  },
  signedInDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  signedInInfo: {
    flex: 1,
  },
  signedInLabel: {
    fontSize: 11,
    color: theme.colors.textGray,
    marginBottom: 2,
  },
  signedInEmail: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.white,
  },
  invoiceNote: {
    fontSize: 13,
    color: theme.colors.textGray,
    lineHeight: 20,
    textAlign: "center",
  },
  submitBtn: {
    backgroundColor: theme.colors.white,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.black,
    letterSpacing: -0.2,
  },
  authSection: {
    gap: 20,
  },
  authExplain: {
    fontSize: 13,
    color: theme.colors.textGray,
    lineHeight: 20,
    textAlign: "center",
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: theme.colors.darkGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 9,
  },
  modeTabActive: {
    backgroundColor: theme.colors.white,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textGray,
  },
  modeTabTextActive: {
    color: theme.colors.black,
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textGray,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.white,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.error,
    textAlign: "center",
  },
  authBtn: {
    backgroundColor: "#60A5FA",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  authBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    letterSpacing: -0.2,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
