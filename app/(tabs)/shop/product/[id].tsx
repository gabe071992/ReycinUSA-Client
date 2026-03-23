import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Animated,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '@/config/firebase';
import { useAuth } from '@/providers/AuthProvider';
import { useCart } from '@/providers/CartProvider';
import { ShoppingCart, Car, Check, Zap, Weight, Settings2 } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useMutation } from '@tanstack/react-query';

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
  options?: {
    color?: string[];
    packages?: string[];
    [key: string]: string[] | undefined;
  };
  description?: string;
}

const SPEC_ICONS: Record<string, any> = {
  engine: Settings2,
  hp: Zap,
  weight_lbs: Weight,
};

export default function ProductDetailScreen() {
  const { id: productId } = useLocalSearchParams<{ id: string }>();
  const { user, addVehicle } = useAuth();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [addedToGarage, setAddedToGarage] = useState(false);
  const successScale = new Animated.Value(1);

  useEffect(() => {
    const database = getDatabase(app);
    const productRef = ref(database, `reycinUSA/catalog/products/${productId}`);

    const unsubscribe = onValue(productRef, (snapshot) => {
      const data = snapshot.val();
      console.log('Product data:', data);
      if (data) {
        setProduct(data);
        if (data.options?.color?.[0]) setSelectedColor(data.options.color[0]);
        if (data.options?.packages?.[0]) setSelectedPackage(data.options.packages[0]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching product:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [productId]);

  const isVehicle = product?.category === 'vehicles';

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('auth');
      if (!product) throw new Error('no-product');
      const selectedOptions: Record<string, string> = {};
      if (selectedColor) selectedOptions.color = selectedColor;
      if (selectedPackage) selectedOptions.package = selectedPackage;
      await addItem(
        { id: productId, name: product.name, price: product.price, media: product.media },
        Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
      );
    },
    onSuccess: () => {
      Alert.alert('Added to Cart', `${product?.name} has been added to your cart.`);
    },
    onError: (err: any) => {
      if (err.message === 'auth') {
        Alert.alert('Sign In Required', 'Please sign in to add items to cart');
      } else {
        Alert.alert('Error', 'Failed to add item to cart');
      }
    },
  });

  const addToGarageMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('auth');
      if (!product) throw new Error('no-product');
      await addVehicle({
        productId,
        model: product.name,
        color: selectedColor || undefined,
        package: selectedPackage || undefined,
        image: product.media?.[0],
        specs: product.specs,
      });
    },
    onSuccess: () => {
      setAddedToGarage(true);
      Animated.sequence([
        Animated.spring(successScale, { toValue: 1.08, useNativeDriver: true }),
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    },
    onError: (err: any) => {
      if (err.message === 'auth') {
        Alert.alert('Sign In Required', 'Please sign in to add vehicles to your garage');
      } else {
        Alert.alert('Error', 'Failed to add vehicle to garage');
      }
    },
  });

  const formatPrice = useCallback((price: number, currency: string) => {
    if (price === 0) return 'Contact for pricing';
    return `${currency === 'USD' ? '$' : currency}${price.toLocaleString()}`;
  }, []);

  const formatSpecLabel = useCallback((key: string) => {
    const labels: Record<string, string> = {
      engine: 'Engine',
      hp: 'Horsepower',
      weight_lbs: 'Weight',
    };
    return labels[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }, []);

  const formatSpecValue = useCallback((key: string, value: any) => {
    if (key === 'hp') return `${value} hp`;
    if (key === 'weight_lbs') return `${value} lbs`;
    return String(value);
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.white} />
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <View style={styles.center}>
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      </View>
    );
  }

  const hasOptions = product.options && Object.keys(product.options).length > 0;
  const hasColors = (product.options?.color?.length ?? 0) > 0;
  const hasPackages = (product.options?.packages?.length ?? 0) > 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroContainer}>
          {product.media && product.media[0] ? (
            <Image source={{ uri: product.media[0] }} style={styles.heroImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Car size={64} color={theme.colors.textGray} strokeWidth={1} />
            </View>
          )}
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.productCategory}>{product.category.toUpperCase()}</Text>
            <Text style={styles.productName}>{product.name}</Text>
            {product.subtitle && (
              <Text style={styles.productSubtitle}>{product.subtitle}</Text>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {formatPrice(product.price, product.currency)}
            </Text>
            {product.stock !== undefined && (
              <View style={[styles.stockBadge, product.stock === 0 && styles.stockBadgeOut]}>
                <Text style={[styles.stockBadgeText, product.stock === 0 && styles.stockBadgeTextOut]}>
                  {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </Text>
              </View>
            )}
          </View>

          {product.specs && Object.keys(product.specs).length > 0 && (
            <View style={styles.specsRow}>
              {Object.entries(product.specs).map(([key, value]) => {
                const Icon = SPEC_ICONS[key];
                return (
                  <View key={key} style={styles.specChip}>
                    {Icon && <Icon size={14} color={theme.colors.textGray} strokeWidth={1.5} />}
                    <Text style={styles.specChipValue}>{formatSpecValue(key, value)}</Text>
                    <Text style={styles.specChipLabel}>{formatSpecLabel(key)}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {hasOptions && (
            <View style={styles.optionsSection}>
              {hasColors && (
                <View style={styles.optionGroup}>
                  <Text style={styles.optionLabel}>COLOR</Text>
                  <View style={styles.optionChips}>
                    {product.options!.color!.map((color) => {
                      const isSelected = selectedColor === color;
                      return (
                        <TouchableOpacity
                          key={color}
                          style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                          onPress={() => setSelectedColor(color)}
                          activeOpacity={0.7}
                        >
                          {isSelected && (
                            <Check size={12} color={theme.colors.black} strokeWidth={2.5} />
                          )}
                          <Text style={[styles.optionChipText, isSelected && styles.optionChipTextSelected]}>
                            {color}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {hasPackages && (
                <View style={styles.optionGroup}>
                  <Text style={styles.optionLabel}>PACKAGE</Text>
                  <View style={styles.packageList}>
                    {product.options!.packages!.map((pkg) => {
                      const isSelected = selectedPackage === pkg;
                      return (
                        <TouchableOpacity
                          key={pkg}
                          style={[styles.packageRow, isSelected && styles.packageRowSelected]}
                          onPress={() => setSelectedPackage(pkg)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.packageRadio, isSelected && styles.packageRadioSelected]}>
                            {isSelected && <View style={styles.packageRadioDot} />}
                          </View>
                          <Text style={[styles.packageName, isSelected && styles.packageNameSelected]}>
                            {pkg}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}

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
                  <Text style={styles.specLabel}>{formatSpecLabel(key)}</Text>
                  <Text style={styles.specValue}>{formatSpecValue(key, value)}</Text>
                </View>
              ))}
            </View>
          )}

          {isVehicle && selectedColor && selectedPackage && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Your Configuration</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Model</Text>
                <Text style={styles.summaryVal}>{product.name}</Text>
              </View>
              {selectedColor && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Color</Text>
                  <Text style={styles.summaryVal}>{selectedColor}</Text>
                </View>
              )}
              {selectedPackage && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Package</Text>
                  <Text style={styles.summaryVal}>{selectedPackage}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {isVehicle ? (
          <View style={styles.vehicleActions}>
            <Animated.View style={[styles.garageButtonWrap, { transform: [{ scale: successScale }] }]}>
              <TouchableOpacity
                style={[
                  styles.garageButton,
                  addedToGarage && styles.garageButtonDone,
                  addToGarageMutation.isPending && styles.buttonDisabled,
                ]}
                onPress={() => addToGarageMutation.mutate()}
                disabled={addToGarageMutation.isPending || addedToGarage}
                activeOpacity={0.8}
                testID="add-to-garage-btn"
              >
                {addToGarageMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : addedToGarage ? (
                  <>
                    <Check size={18} color={theme.colors.white} strokeWidth={2.5} />
                    <Text style={styles.garageButtonText}>Added to Garage</Text>
                  </>
                ) : (
                  <>
                    <Car size={18} color={theme.colors.white} strokeWidth={1.8} />
                    <Text style={styles.garageButtonText}>Add to Garage</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity
              style={[styles.cartButton, addToCartMutation.isPending && styles.buttonDisabled]}
              onPress={() => addToCartMutation.mutate()}
              disabled={addToCartMutation.isPending || product.stock === 0}
              activeOpacity={0.8}
              testID="add-to-cart-btn"
            >
              {addToCartMutation.isPending ? (
                <ActivityIndicator size="small" color={theme.colors.black} />
              ) : (
                <ShoppingCart size={20} color={theme.colors.black} strokeWidth={1.8} />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addToCartButton, addToCartMutation.isPending && styles.buttonDisabled]}
            onPress={() => addToCartMutation.mutate()}
            disabled={addToCartMutation.isPending || product.stock === 0}
            activeOpacity={0.8}
            testID="add-to-cart-btn"
          >
            {addToCartMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.black} />
            ) : (
              <>
                <ShoppingCart size={20} color={theme.colors.black} />
                <Text style={styles.buttonText}>
                  {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.white,
    fontSize: 18,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  heroContainer: {
    width: '100%',
    height: 320,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'transparent',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  productCategory: {
    fontSize: 11,
    color: theme.colors.textGray,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 6,
  },
  productName: {
    fontSize: 30,
    fontWeight: '700',
    color: theme.colors.white,
    letterSpacing: -0.5,
  },
  productSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  content: {
    padding: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  price: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.colors.white,
    letterSpacing: -1,
  },
  stockBadge: {
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderWidth: 1,
    borderColor: theme.colors.success,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  stockBadgeOut: {
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderColor: theme.colors.error,
  },
  stockBadgeText: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  stockBadgeTextOut: {
    color: theme.colors.error,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
    flexWrap: 'wrap',
  },
  specChip: {
    flex: 1,
    minWidth: 90,
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  specChipValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.white,
    marginTop: 4,
  },
  specChipLabel: {
    fontSize: 10,
    color: theme.colors.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsSection: {
    marginBottom: 28,
    gap: 24,
  },
  optionGroup: {},
  optionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textGray,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  optionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    backgroundColor: theme.colors.darkGray,
  },
  optionChipSelected: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.white,
  },
  optionChipText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  optionChipTextSelected: {
    color: theme.colors.black,
    fontWeight: '700',
  },
  packageList: {
    gap: 10,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    backgroundColor: theme.colors.darkGray,
  },
  packageRowSelected: {
    borderColor: theme.colors.white,
    backgroundColor: theme.colors.lightGray,
  },
  packageRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.borderGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageRadioSelected: {
    borderColor: theme.colors.white,
  },
  packageRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.colors.white,
  },
  packageName: {
    fontSize: 15,
    color: theme.colors.textGray,
    fontWeight: '500',
  },
  packageNameSelected: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  summaryBox: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 16,
    marginBottom: 28,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textGray,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryKey: {
    fontSize: 14,
    color: theme.colors.textGray,
  },
  summaryVal: {
    fontSize: 14,
    color: theme.colors.white,
    fontWeight: '600',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textGray,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textGray,
    lineHeight: 22,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGray,
  },
  specLabel: {
    fontSize: 14,
    color: theme.colors.textGray,
  },
  specValue: {
    fontSize: 14,
    color: theme.colors.white,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.black,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGray,
    padding: 16,
    paddingBottom: 24,
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  garageButtonWrap: {
    flex: 1,
  },
  garageButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.lightGray,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    gap: 8,
  },
  garageButtonDone: {
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderColor: theme.colors.success,
  },
  garageButtonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  cartButton: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartButton: {
    backgroundColor: theme.colors.white,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: '700',
  },
});
