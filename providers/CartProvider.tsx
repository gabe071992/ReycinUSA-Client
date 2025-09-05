import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect } from "react";
import { ref, set, get, onValue } from "firebase/database";
import { database } from "@/config/firebase";
import { useAuth } from "@/providers/AuthProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
}

export const [CartProvider, useCart] = createContextHook(() => {
  const { user } = useAuth();
  const [items, setItems] = useState<Record<string, CartItem>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      // Load guest cart from AsyncStorage
      loadGuestCart();
      return;
    }

    // Sync with Firebase for authenticated users
    const cartRef = ref(database, `reycinUSA/cart/${user.uid}`);
    const unsubscribe = onValue(cartRef, (snapshot) => {
      if (snapshot.exists()) {
        const cartData = snapshot.val();
        setItems(cartData.items || {});
      }
    });

    return () => unsubscribe();
  }, [user]);

  const loadGuestCart = async () => {
    try {
      const stored = await AsyncStorage.getItem("guestCart");
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load guest cart:", error);
    }
  };

  const saveCart = async (newItems: Record<string, CartItem>) => {
    if (user) {
      // Save to Firebase
      const cartRef = ref(database, `reycinUSA/cart/${user.uid}`);
      await set(cartRef, {
        items: newItems,
        updatedAt: Date.now(),
      });
    } else {
      // Save to AsyncStorage for guests
      await AsyncStorage.setItem("guestCart", JSON.stringify(newItems));
    }
    setItems(newItems);
  };

  const addItem = async (product: any) => {
    const newItems = { ...items };
    const productId = product.id;
    
    if (newItems[productId]) {
      newItems[productId].quantity += 1;
    } else {
      newItems[productId] = {
        productId,
        quantity: 1,
        price: product.price,
        name: product.name,
        image: product.media?.[0],
      };
    }
    
    await saveCart(newItems);
  };

  const removeItem = async (productId: string) => {
    const newItems = { ...items };
    delete newItems[productId];
    await saveCart(newItems);
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(productId);
      return;
    }
    
    const newItems = { ...items };
    if (newItems[productId]) {
      newItems[productId].quantity = quantity;
      await saveCart(newItems);
    }
  };

  const clearCart = async () => {
    await saveCart({});
  };

  const getTotal = () => {
    return Object.values(items).reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  };

  const getItemCount = () => {
    return Object.values(items).reduce(
      (sum, item) => sum + item.quantity,
      0
    );
  };

  return {
    items,
    loading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount,
    isEmpty: Object.keys(items).length === 0,
  };
});