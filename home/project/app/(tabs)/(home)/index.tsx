import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '@/config/firebase';
import { Calendar, Star, ArrowRight } from 'lucide-react-native';

interface Announcement {
  title: string;
  tag: string;
  heroImage?: string;
  bodyMd?: string;
  createdAt: number;
  visible: boolean;
}

interface Product {
  category: string;
  name: string;
  subtitle?: string;
  media?: string[];
  price: number;
  currency: string;
  active: boolean;
}

export default function HomeScreen() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Record<string, Announcement>>({});
  const [newProducts, setNewProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const database = getDatabase(app);
    
    // Fetch announcements
    const announcementsRef = ref(database, 'reycinUSA/announcements');
    const unsubscribeAnnouncements = onValue(announcementsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Filter visible announcements
        const visibleAnnouncements: Record<string, Announcement> = {};
        Object.entries(data).forEach(([key, announcement]) => {
          const ann = announcement as Announcement;
          if (ann.visible) {
            visibleAnnouncements[key] = ann;
          }
        });
        setAnnouncements(visibleAnnouncements);
      }
    });

    // Fetch new products (vehicles category)
    const productsRef = ref(database, 'reycinUSA/catalog/products');
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Filter active products from vehicles category
        const vehicleProducts: Record<string, Product> = {};
        Object.entries(data).forEach(([key, product]) => {
          const prod = product as Product;
          if (prod.active && prod.category === 'vehicles') {
            vehicleProducts[key] = prod;
          }
        });
        setNewProducts(vehicleProducts);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAnnouncements();
      unsubscribeProducts();
    };
  }, []);

  const handleAnnouncementPress = (announcementId: string) => {
    console.log('Announcement pressed:', announcementId);
    // TODO: Navigate to announcement detail
  };

  const handleProductPress = (productId: string) => {
    console.log('Product pressed:', productId);
    router.push(`/product/${productId}` as any);
  };

  const handleExploreF300 = () => {
    router.push('/product/veh_f300' as any);
  };

  const handleShopPress = () => {
    router.push('/(tabs)/(shop)' as any);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const sortedAnnouncements = Object.entries(announcements)
    .sort(([, a], [, b]) => b.createdAt - a.createdAt)
    .slice(0, 3); // Show only latest 3

  const productEntries = Object.entries(newProducts).slice(0, 4); // Show only 4 products

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <ImageBackground 
          source={{ uri: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80' }}
          style={styles.heroSection}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroOverlay}>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Reycin USA</Text>
              <Text style={styles.heroSubtitle}>Precision Engineering for Racing Excellence</Text>
              <TouchableOpacity style={styles.heroButton} onPress={handleExploreF300}>
                <Text style={styles.heroButtonText}>Explore F300</Text>
                <ArrowRight size={16} color="#000000" />
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>

        {/* Announcements Section */}
        {sortedAnnouncements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Latest News</Text>
            {sortedAnnouncements.map(([key, announcement]) => (
              <TouchableOpacity
                key={key}
                style={styles.announcementCard}
                onPress={() => handleAnnouncementPress(key)}
                activeOpacity={0.8}
              >
                <View style={styles.announcementHeader}>
                  <View style={styles.tagContainer}>
                    <Text style={styles.tag}>{announcement.tag}</Text>
                  </View>
                  <Text style={styles.date}>
                    {new Date(announcement.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.announcementTitle}>{announcement.title}</Text>
                {announcement.heroImage && (
                  <Image source={{ uri: announcement.heroImage }} style={styles.announcementImage} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* New Products Section */}
        {productEntries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Our Vehicles</Text>
              <TouchableOpacity onPress={handleShopPress}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productsScroll}>
              {productEntries.map(([productId, product]) => (
                <TouchableOpacity
                  key={productId}
                  style={styles.productCard}
                  onPress={() => handleProductPress(productId)}
                  activeOpacity={0.8}
                >
                  {product.media && product.media[0] ? (
                    <Image source={{ uri: product.media[0] }} style={styles.productImage} />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Text style={styles.placeholderText}>No Image</Text>
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    {product.subtitle && (
                      <Text style={styles.productSubtitle} numberOfLines={1}>
                        {product.subtitle}
                      </Text>
                    )}
                    <Text style={styles.productPrice}>
                      {product.price === 0 ? 'Contact for pricing' : `$${product.price.toLocaleString()}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* CTA Tiles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.ctaGrid}>
            <TouchableOpacity style={styles.ctaTile} onPress={handleExploreF300}>
              <Star size={24} color="#FFFFFF" />
              <Text style={styles.ctaTitle}>Explore F300</Text>
              <Text style={styles.ctaSubtitle}>Single-seater excellence</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctaTile} onPress={handleShopPress}>
              <Calendar size={24} color="#FFFFFF" />
              <Text style={styles.ctaTitle}>Browse Shop</Text>
              <Text style={styles.ctaSubtitle}>Parts & accessories</Text>
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
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 14,
  },
  heroSection: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  heroImage: {
    resizeMode: 'cover',
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 30,
  },
  heroButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  heroButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  seeAllText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
  },
  announcementCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagContainer: {
    backgroundColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tag: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  date: {
    color: '#666666',
    fontSize: 12,
  },
  announcementTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  announcementImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  productsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  productCard: {
    width: 200,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666666',
    fontSize: 12,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productSubtitle: {
    color: '#666666',
    fontSize: 12,
    marginBottom: 8,
  },
  productPrice: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  ctaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ctaTile: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  ctaTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  ctaSubtitle: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
  },
});