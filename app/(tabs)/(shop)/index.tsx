import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { theme } from "@/constants/theme";
import { ShoppingBag, Car, Wrench, Shield, FileText, CreditCard } from "lucide-react-native";
import { router } from "expo-router";
import { useCart } from "@/providers/CartProvider";

const categories = [
  { id: "vehicles", name: "Vehicles", icon: Car, color: "#FF6B6B" },
  { id: "parts", name: "Parts", icon: Wrench, color: "#4ECDC4" },
  { id: "services", name: "Services", icon: ShoppingBag, color: "#45B7D1" },
  { id: "warranties", name: "Warranties", icon: Shield, color: "#96CEB4" },
  { id: "insurance", name: "Insurance", icon: FileText, color: "#FFEAA7" },
];

export default function ShopScreen() {
  const { getItemCount } = useCart();
  const cartCount = getItemCount();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Cart Banner */}
      {cartCount > 0 && (
        <TouchableOpacity 
          style={styles.cartBanner}
          onPress={() => {}}
        >
          <View style={styles.cartBannerContent}>
            <ShoppingBag size={20} color={theme.colors.black} />
            <Text style={styles.cartBannerText}>
              {cartCount} {cartCount === 1 ? "item" : "items"} in cart
            </Text>
          </View>
          <Text style={styles.cartBannerAction}>View Cart →</Text>
        </TouchableOpacity>
      )}

      {/* Categories Grid */}
      <View style={styles.categoriesSection}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoriesGrid}>
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => {}}
              >
                <View style={[styles.categoryIcon, { backgroundColor: theme.colors.darkGray }]}>
                  <Icon size={32} color={theme.colors.white} strokeWidth={1.5} />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Featured Section */}
      <View style={styles.featuredSection}>
        <Text style={styles.sectionTitle}>Featured</Text>
        
        <TouchableOpacity 
          style={styles.featuredCard}
          onPress={() => {}}
        >
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&h=600&fit=crop" }}
            style={styles.featuredImage}
          />
          <View style={styles.featuredContent}>
            <Text style={styles.featuredTag}>NEW RELEASE</Text>
            <Text style={styles.featuredTitle}>Reycin F300</Text>
            <Text style={styles.featuredDescription}>
              Experience pure racing performance with our flagship single-seater
            </Text>
            <TouchableOpacity style={styles.featuredButton}>
              <Text style={styles.featuredButtonText}>LEARN MORE</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>

      {/* Promotions */}
      <View style={styles.promotionsSection}>
        <Text style={styles.sectionTitle}>Special Offers</Text>
        
        <View style={styles.promotionCard}>
          <View style={styles.promotionBadge}>
            <Text style={styles.promotionBadgeText}>20% OFF</Text>
          </View>
          <Text style={styles.promotionTitle}>Track Day Package</Text>
          <Text style={styles.promotionDescription}>
            Complete track support with telemetry and crew
          </Text>
        </View>
        
        <View style={styles.promotionCard}>
          <View style={styles.promotionBadge}>
            <Text style={styles.promotionBadgeText}>LIMITED</Text>
          </View>
          <Text style={styles.promotionTitle}>Extended Warranty</Text>
          <Text style={styles.promotionDescription}>
            Protect your investment with comprehensive coverage
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  cartBanner: {
    backgroundColor: theme.colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  cartBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cartBannerText: {
    color: theme.colors.black,
    fontSize: 14,
    fontWeight: "600",
  },
  cartBannerAction: {
    color: theme.colors.black,
    fontSize: 14,
    fontWeight: "500",
  },
  categoriesSection: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: theme.spacing.md,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  categoryCard: {
    width: "30%",
    alignItems: "center",
  },
  categoryIcon: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  categoryName: {
    fontSize: 14,
    color: theme.colors.white,
    fontWeight: "500",
  },
  featuredSection: {
    padding: theme.spacing.lg,
  },
  featuredCard: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  featuredImage: {
    width: "100%",
    height: 200,
  },
  featuredContent: {
    padding: theme.spacing.lg,
  },
  featuredTag: {
    fontSize: 12,
    color: theme.colors.textGray,
    letterSpacing: 1,
    marginBottom: 8,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: 8,
  },
  featuredDescription: {
    fontSize: 14,
    color: theme.colors.textGray,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  featuredButton: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignSelf: "flex-start",
  },
  featuredButtonText: {
    color: theme.colors.black,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  promotionsSection: {
    padding: theme.spacing.lg,
  },
  promotionCard: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  promotionBadge: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  promotionBadgeText: {
    color: theme.colors.black,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: 4,
  },
  promotionDescription: {
    fontSize: 14,
    color: theme.colors.textGray,
    lineHeight: 20,
  },
});