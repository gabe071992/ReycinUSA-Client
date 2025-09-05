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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { getDatabase, ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { app } from '@/config/firebase';

interface Product {
  category: string;
  name: string;
  subtitle?: string;
  media?: string[];
  price: number;
  currency: string;
  active: boolean;
  stock?: number;
  compat?: string[];
}

export default function CategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    const database = getDatabase(app);
    
    // Fetch category name
    const categoryRef = ref(database, `reycinUSA/catalog/categories/${category}`);
    onValue(categoryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCategoryName(data.name);
      }
    });

    // Fetch products for this category
    const productsRef = ref(database, 'reycinUSA/catalog/products');
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      console.log('All products data:', data);
      
      if (data) {
        // Filter products by category
        const filteredProducts: Record<string, Product> = {};
        Object.entries(data).forEach(([key, product]) => {
          const prod = product as Product;
          if (prod.category === category && prod.active !== false) {
            filteredProducts[key] = prod;
          }
        });
        console.log('Filtered products for category', category, ':', filteredProducts);
        setProducts(filteredProducts);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [category]);

  const handleProductPress = (productId: string) => {
    console.log('Navigating to product:', productId);
    // Use relative path within the same route group
    router.push(`/product/${productId}`);
  };

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Contact for pricing';
    return `${currency === 'USD' ? '$' : currency}${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: categoryName || 'Loading...' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </View>
    );
  }

  const productEntries = Object.entries(products);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: categoryName || 'Category' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {productEntries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products available</Text>
            <Text style={styles.emptySubtext}>Check back later for updates</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
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
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  {product.subtitle && (
                    <Text style={styles.productSubtitle} numberOfLines={1}>
                      {product.subtitle}
                    </Text>
                  )}
                  <Text style={styles.productPrice}>
                    {formatPrice(product.price, product.currency)}
                  </Text>
                  {product.stock !== undefined && (
                    <Text style={styles.stockText}>
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#666666',
    fontSize: 14,
    marginTop: 5,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: 150,
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
    fontSize: 16,
    fontWeight: '700',
  },
  stockText: {
    color: '#666666',
    fontSize: 11,
    marginTop: 4,
  },
});