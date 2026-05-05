import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { theme } from '@/constants/theme';
import { ShoppingBag, Car, Wrench, Shield, FileText, Package, Hammer, Route, CircleDot } from 'lucide-react-native';
import { tick } from '@/utils/tick';
import { router } from 'expo-router';
import { useCart } from '@/providers/CartProvider';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '@/config/firebase';

const W = theme.colors.watch;

interface Category {
  name: string;
  order: number;
}

interface Categories {
  vehicles: Category;
  parts: Category;
  services: Category;
  warranties: Category;
  insurance: Category;
  tools: Category;
  tracks: Category;
}

const categoryIcons = {
  vehicles: Car,
  parts: Package,
  services: Wrench,
  warranties: Shield,
  insurance: FileText,
  tools: Hammer,
  tracks: Route,
};

export default function ShopScreen() {
  const { getItemCount } = useCart();
  const cartCount = getItemCount();
  const [categories, setCategories] = useState<Categories | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const database = getDatabase(app);
    const productsRef = ref(database, 'reycinUSA/catalog/products');

    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      console.log('Products data from Firebase:', data);
      
      if (data) {
        const foundCategories = new Set<string>();
        Object.values(data).forEach((product: any) => {
          if (product.category) {
            foundCategories.add(product.category);
          }
        });
        
        const categoryData: Categories = {
          vehicles: { name: 'Vehicles', order: 1 },
          parts: { name: 'Parts', order: 2 },
          services: { name: 'Services', order: 3 },
          warranties: { name: 'Warranties', order: 4 },
          insurance: { name: 'Insurance', order: 5 },
          tools: { name: 'Tools', order: 6 },
          tracks: { name: 'Tracks', order: 7 },
        };
        
        console.log('Found categories in products:', Array.from(foundCategories));
        setCategories(categoryData);
      } else {
        console.log('No products found in database');
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCategoryPress = (categoryKey: string) => {
    tick();
    console.log('Button pressed for category:', categoryKey);
    router.push(`/(tabs)/shop/category/${categoryKey}` as any);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {cartCount > 0 && (
        <TouchableOpacity 
          style={styles.cartBanner}
          onPress={() => router.push('/cart' as any)}
        >
          <View style={styles.cartBannerContent}>
            <ShoppingBag size={20} color={W.deepBlack} />
            <Text style={styles.cartBannerText}>
              {cartCount} {cartCount === 1 ? "item" : "items"} in cart
            </Text>
          </View>
          <Text style={styles.cartBannerAction}>View Cart →</Text>
        </TouchableOpacity>
      )}

      <View style={styles.shopHero}>
        <CircleDot size={26} color={W.gold} strokeWidth={1.2} />
        <Text style={styles.heroEyebrow}>Reycin Shop</Text>
        <Text style={styles.heroTitle}>Precision On Demand</Text>
        <Text style={styles.heroCopy}>Vehicles, hardware, tools, and track support provided by ReycinUSA or through it's partners.</Text>
      </View>

      <View style={styles.categoriesSection}>
        <Text style={styles.sectionTitle}>Categories</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={W.gold} />
            <Text style={styles.loadingText}>Loading catalog...</Text>
          </View>
        ) : !categories ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No categories available</Text>
            <Text style={styles.errorSubtext}>Please check your connection</Text>
          </View>
        ) : (
          <View style={styles.categoriesGrid}>
            {Object.entries(categories)
              .sort(([, a], [, b]) => a.order - b.order)
              .map(([key, category]) => {
                const Icon = categoryIcons[key as keyof typeof categoryIcons] || Package;
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.categoryCard}
                    onPress={() => handleCategoryPress(key)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.categoryIcon}>
                      <Icon size={32} color={W.gold} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        )}
      </View>

      <View style={styles.featuredSection}>
        <Text style={styles.sectionTitle}>Featured</Text>
        
        <TouchableOpacity 
          style={styles.featuredCard}
          onPress={() => {}}
        >
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800" }}
            style={styles.featuredImage}
          />
          <View style={styles.featuredContent}>
            <Text style={styles.featuredTag}>NEW RELEASE</Text>
            <Text style={styles.featuredTitle}>Reycin F300</Text>
            <Text style={styles.featuredDescription}>
              Experience pure racing performance with our flagship single-seater
            </Text>
            <TouchableOpacity 
              style={styles.featuredButton}
              onPress={() => router.push('/f300-explorer')}
            >
              <Text style={styles.featuredButtonText}>LEARN MORE</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: W.deepBlack,
  },
  shopHero: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: W.plate,
    borderWidth: 1,
    borderColor: W.goldBorder,
    gap: 8,
  },
  heroEyebrow: {
    color: W.gold,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: theme.colors.white,
    fontSize: 34,
    fontWeight: "300",
    letterSpacing: -0.8,
  },
  heroCopy: {
    color: W.champagne,
    opacity: 0.72,
    fontSize: 13,
    lineHeight: 19,
  },
  cartBanner: {
    backgroundColor: W.champagne,
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
    color: W.deepBlack,
    fontSize: 14,
    fontWeight: "600",
  },
  cartBannerAction: {
    color: W.deepBlack,
    fontSize: 14,
    fontWeight: "500",
  },
  categoriesSection: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: W.gold,
    marginBottom: theme.spacing.md,
    letterSpacing: 2.5,
    textTransform: "uppercase",
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
    borderRadius: 40,
    backgroundColor: W.plate,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: W.goldBorder,
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
    backgroundColor: W.plate,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: W.goldBorder,
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
    color: W.gold,
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
    color: W.champagne,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  featuredButton: {
    backgroundColor: W.champagne,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    alignSelf: "flex-start",
  },
  featuredButtonText: {
    color: W.deepBlack,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: theme.colors.white,
    marginTop: 10,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  errorSubtext: {
    color: theme.colors.textGray,
    fontSize: 14,
    marginTop: 5,
  },
});
