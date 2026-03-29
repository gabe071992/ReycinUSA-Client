import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '@/config/firebase';
import { Package, Car, Wrench, Shield, FileText, ArrowRight } from 'lucide-react-native';

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
}

const categoryIcons = {
  vehicles: Car,
  parts: Package,
  services: Wrench,
  warranties: Shield,
  insurance: FileText,
};

export default function ShopScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Categories | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const database = getDatabase(app);
    const categoriesRef = ref(database, 'reycinUSA/catalog/categories');

    const unsubscribe = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      console.log('Categories data from Firebase:', data);
      if (data) {
        setCategories(data);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching categories:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCategoryPress = (categoryKey: string) => {
    console.log('Button pressed for category:', categoryKey);
    
    // Use relative path within the shop route group
    router.push(`/(tabs)/(shop)/category/${categoryKey}` as any);
  };

  const handleF300Press = () => {
    router.push('/f300-explorer' as any);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading catalog...</Text>
        </View>
      </View>
    );
  }

  if (!categories) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No categories available</Text>
          <Text style={styles.errorSubtext}>Please check your connection</Text>
        </View>
      </View>
    );
  }

  const sortedCategories = Object.entries(categories).sort(
    ([, a], [, b]) => a.order - b.order
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Shop</Text>
        <Text style={styles.subtitle}>Browse our catalog</Text>
        
        {/* Categories Grid */}
        <View style={styles.grid}>
          {sortedCategories.map(([key, category]) => {
            const Icon = categoryIcons[key as keyof typeof categoryIcons] || Package;
            return (
              <TouchableOpacity
                key={key}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(key)}
                activeOpacity={0.8}
              >
                <View style={styles.iconContainer}>
                  <Icon size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Featured F300 Section */}
        <View style={styles.featuredSection}>
          <Text style={styles.featuredTitle}>Featured Vehicle</Text>
          <TouchableOpacity 
            style={styles.featuredCard}
            onPress={handleF300Press}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kfku1i2xeh9bppcwlar2j' }}
              style={styles.featuredImage}
            />
            <View style={styles.featuredOverlay}>
              <View style={styles.featuredContent}>
                <Text style={styles.featuredVehicleTitle}>Reycin F300</Text>
                <Text style={styles.featuredSlogan}>&ldquo;Four cylinders never sounded this good&rdquo;</Text>
                <Text style={styles.featuredDescription}>High-performance track kart designed for both track and light street use</Text>
                <View style={styles.featuredButton}>
                  <Text style={styles.featuredButtonText}>Learn More</Text>
                  <ArrowRight size={16} color="#000000" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
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
    padding: 20,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  errorSubtext: {
    color: '#666666',
    fontSize: 14,
    marginTop: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 30,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  featuredSection: {
    marginTop: 30,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  featuredCard: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 300,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  featuredContent: {
    alignItems: 'flex-start',
  },
  featuredVehicleTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  featuredSlogan: {
    fontSize: 16,
    color: '#FFFFFF',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  featuredDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 20,
    lineHeight: 20,
  },
  featuredButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  featuredButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});