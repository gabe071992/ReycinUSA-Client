import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "@/providers/CartProvider";
import { theme } from "@/constants/theme";
import { X, Minus, Plus, ShoppingBag, ArrowRight, Trash2 } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";

const SHIPPING_RATE = 12.99;
const TAX_RATE = 0.06;

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, updateQuantity, removeItem, clearCart, getTotal, isEmpty } = useCart();

  const subtotal = getTotal();
  const shipping = isEmpty ? 0 : SHIPPING_RATE;
  const tax = (subtotal + shipping) * TAX_RATE;
  const total = subtotal + shipping + tax;

  const clearMutation = useMutation({
    mutationFn: async () => {
      await clearCart();
    },
  });

  const handleCheckout = useCallback(() => {
    router.push("/brg-auth" as any);
  }, []);

  const formatPrice = (amount: number) =>
    `$${amount.toFixed(2)}`;

  if (isEmpty) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <X size={22} color={theme.colors.white} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={styles.closeBtn} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <ShoppingBag size={48} color={theme.colors.textGray} strokeWidth={1} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add items from the shop to get started</Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.shopBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <X size={22} color={theme.colors.white} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart</Text>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => clearMutation.mutate()}
          activeOpacity={0.7}
        >
          <Trash2 size={19} color={theme.colors.textGray} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 220 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.itemsSection}>
          {Object.entries(items).map(([cartKey, item]) => (
            <View key={cartKey} style={styles.itemCard}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <ShoppingBag size={20} color={theme.colors.textGray} strokeWidth={1.5} />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                  <View style={styles.optionTags}>
                    {Object.entries(item.selectedOptions).map(([k, v]) => (
                      <View key={k} style={styles.optionTag}>
                        <Text style={styles.optionTagText}>{v}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.itemPrice}>${(item.price * item.quantity).toLocaleString()}</Text>
                <View style={styles.itemActions}>
                  <View style={styles.qtyControl}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(cartKey, item.quantity - 1)}
                      activeOpacity={0.7}
                    >
                      <Minus size={14} color={theme.colors.white} strokeWidth={2} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(cartKey, item.quantity + 1)}
                      activeOpacity={0.7}
                    >
                      <Plus size={14} color={theme.colors.white} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeItem(cartKey)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={17} color={theme.colors.textGray} strokeWidth={1.8} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
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

        <View style={styles.shippingNote}>
          <Text style={styles.shippingNoteText}>
            Shipping address will be collected during order approval. All orders are reviewed by our team before invoicing.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.totalPreview}>
          <Text style={styles.totalPreviewLabel}>Order Total</Text>
          <Text style={styles.totalPreviewAmount}>{formatPrice(total)}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={handleCheckout}
          activeOpacity={0.85}
          testID="checkout-btn"
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <ArrowRight size={18} color={theme.colors.black} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
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
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  itemsSection: {
    gap: 12,
    marginBottom: 24,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.darkGray,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    overflow: "hidden",
  },
  itemImage: {
    width: 90,
    height: 90,
    resizeMode: "cover",
  },
  itemImagePlaceholder: {
    backgroundColor: theme.colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.white,
    lineHeight: 20,
  },
  optionTags: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  optionTag: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  optionTagText: {
    fontSize: 11,
    color: theme.colors.textGray,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.white,
    marginTop: 4,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.white,
    minWidth: 24,
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 20,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textGray,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
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
    marginVertical: 12,
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
  shippingNote: {
    paddingHorizontal: 4,
  },
  shippingNoteText: {
    fontSize: 12,
    color: theme.colors.textGray,
    lineHeight: 18,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.black,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGray,
    padding: 20,
    paddingTop: 16,
    gap: 12,
  },
  totalPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalPreviewLabel: {
    fontSize: 13,
    color: theme.colors.textGray,
    fontWeight: "500",
  },
  totalPreviewAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.white,
    letterSpacing: -0.5,
  },
  checkoutBtn: {
    backgroundColor: theme.colors.white,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  checkoutBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.black,
    letterSpacing: -0.2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.darkGray,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textGray,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  shopBtn: {
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
  },
  shopBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.white,
  },
});
