import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { app } from '@/config/firebase';
import { useAuth } from '@/providers/AuthProvider';
import { useCart } from '@/providers/CartProvider';
import { ShoppingCart, Check } from 'lucide-react-native';

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
  specs?: Record<string, any>;
  options?: Record<string, string[]>;
  description?: string;
}

export default function ProductDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    const database = getDatabase(app);
    const productRef = ref(database, `reycinUSA/catalog/products/${productId}`);
    
    const unsubscribe = onValue(productRef, (snapshot) => {
      const data = snapshot.val();
      console.log('Product data:', data);
      if (data) {
        setProduct(data);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching product:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [productId]);

  const handleAddToCart = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to add items to cart');
      return;
    }

    if (!product) return;

    setAddingToCart(true);
    try {
      await addToCart(productId as string, 1);
      Alert.alert('Success', 'Item added to cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Contact for pricing';
    return `${currency === 'USD' ? '$' : currency}${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Product Not Found' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {product.media && product.media[0] ? (
          <Image source={{ uri: product.media[0] }} style={styles.heroImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>No Image Available</Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.subtitle && (
            <Text style={styles.productSubtitle}>{product.subtitle}</Text>
          )}

          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {formatPrice(product.price, product.currency)}
            </Text>
            {product.stock !== undefined && (
              <Text style={styles.stockText}>
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </Text>
            )}
          </View>

          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {product.specs && Object.keys(product.specs).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              {Object.entries(product.specs).map(([key, value]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specLabel}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                  <Text style={styles.specValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
          )}

          {product.compat && product.compat.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Compatible With</Text>
              <View style={styles.compatList}>
                {product.compat.map((model) => (
                  <View key={model} style={styles.compatBadge}>
                    <Text style={styles.compatText}>{model}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {product.options && Object.keys(product.options).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Options</Text>
              {Object.entries(product.options).map(([optionKey, optionValues]) => (
                <View key={optionKey} style={styles.optionGroup}>
                  <Text style={styles.optionLabel}>
                    {optionKey.replace(/\b\w/g, l => l.toUpperCase())}:
                  </Text>
                  <View style={styles.optionValues}>
                    {optionValues.map((value) => (
                      <View key={value} style={styles.optionBadge}>
                        <Text style={styles.optionText}>{value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.addToCartButton, addingToCart && styles.buttonDisabled]}
          onPress={handleAddToCart}
          disabled={addingToCart || product.stock === 0}
          activeOpacity={0.8}
        >
          {addingToCart ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <>
              <ShoppingCart size={20} color="#000000" />
              <Text style={styles.buttonText}>
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  heroImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666666',
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  productName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  productSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stockText: {
    fontSize: 14,
    color: '#666666',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 22,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  specLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  specValue: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'right',
  },
  compatList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compatBadge: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  compatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  optionGroup: {
    marginBottom: 15,
  },
  optionLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  optionValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionBadge: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    padding: 20,
  },
  addToCartButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});