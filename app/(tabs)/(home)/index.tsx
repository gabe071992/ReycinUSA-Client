import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { ChevronRight, Calendar, Tag } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { ref, get } from "firebase/database";
import { database } from "@/config/firebase";
import { useRouter } from "expo-router";

const { width: screenWidth } = Dimensions.get("window");

export default function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const { data: announcements } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const snapshot = await get(ref(database, "reycinUSA/announcements"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.entries(data)
          .map(([id, item]: [string, any]) => ({ id, ...item }))
          .filter((item) => item.visible)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 5);
      }
      return [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const snapshot = await get(ref(database, "reycinUSA/catalog/products"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.entries(data)
          .map(([id, item]: [string, any]) => ({ id, ...item }))
          .filter((item) => item.category === "vehicles" && item.active)
          .slice(0, 3);
      }
      return [];
    },
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
            style={styles.heroGradient}
          />
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&h=800&fit=crop" }}
            style={styles.heroImage}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>REYCIN F300</Text>
            <Text style={styles.heroSubtitle}>Pure Performance Redefined</Text>
            <TouchableOpacity 
              style={styles.heroButton}
              onPress={() => router.push('/f300-explorer')}
            >
              <Text style={styles.heroButtonText}>EXPLORE</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Announcements */}
        {announcements && announcements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Latest News</Text>
            {announcements.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={styles.announcementCard}
                onPress={() => {}}
              >
                <View style={styles.announcementContent}>
                  <View style={styles.announcementMeta}>
                    <Tag size={14} color={theme.colors.textGray} />
                    <Text style={styles.announcementTag}>{item.tag}</Text>
                    <Calendar size={14} color={theme.colors.textGray} />
                    <Text style={styles.announcementDate}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.announcementTitle}>{item.title}</Text>
                </View>
                <ChevronRight size={20} color={theme.colors.textGray} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Featured Products */}
        {products && products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Vehicles</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsScroll}
            >
              {products.map((product: any) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => {}}
                >
                  <Image
                    source={{ uri: product.media?.[0] || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop" }}
                    style={styles.productImage}
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.8)"]}
                    style={styles.productGradient}
                  />
                  <View style={styles.productContent}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productSubtitle}>{product.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => {}}
            >
              <Text style={styles.actionIcon}>🔧</Text>
              <Text style={styles.actionTitle}>Diagnostics</Text>
              <Text style={styles.actionDescription}>Connect to OBD</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => {}}
            >
              <Text style={styles.actionIcon}>🏁</Text>
              <Text style={styles.actionTitle}>Track Support</Text>
              <Text style={styles.actionDescription}>Book Service</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => {}}
            >
              <Text style={styles.actionIcon}>🛒</Text>
              <Text style={styles.actionTitle}>Parts</Text>
              <Text style={styles.actionDescription}>Shop Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => {}}
            >
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.actionTitle}>Warranty</Text>
              <Text style={styles.actionDescription}>View Plans</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  scrollView: {
    flex: 1,
  },
  hero: {
    height: 400,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  heroContent: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
    zIndex: 2,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "200",
    color: theme.colors.white,
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: theme.colors.offWhite,
    opacity: 0.9,
    marginBottom: 24,
  },
  heroButton: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    alignSelf: "flex-start",
  },
  heroButtonText: {
    color: theme.colors.black,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: theme.spacing.md,
  },
  announcementCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  announcementContent: {
    flex: 1,
  },
  announcementMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  announcementTag: {
    fontSize: 12,
    color: theme.colors.textGray,
    marginRight: 12,
  },
  announcementDate: {
    fontSize: 12,
    color: theme.colors.textGray,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.white,
  },
  productsScroll: {
    paddingRight: theme.spacing.lg,
  },
  productCard: {
    width: screenWidth * 0.7,
    height: 200,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  productContent: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  productName: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: 4,
  },
  productSubtitle: {
    fontSize: 14,
    color: theme.colors.offWhite,
    opacity: 0.9,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  actionCard: {
    width: (screenWidth - theme.spacing.lg * 2 - theme.spacing.md) / 2,
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: theme.colors.textGray,
  },
});