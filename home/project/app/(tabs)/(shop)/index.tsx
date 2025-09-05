import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '@/config/firebase';
import { Package, Car, Wrench, Shield, FileText } from 'lucide-react-native';

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
    console.log('Navigating to category:', categoryKey);
    // Use the correct route path for nested navigation within (shop) group
    router.push(`/(tabs)/(shop)/category/${categoryKey}`);
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
});