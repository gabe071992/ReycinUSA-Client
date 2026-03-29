import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useCallback, useMemo } from "react";
import { ref, set, onValue } from "firebase/database";
import { database } from "@/config/firebase";
import { useAuth } from "@/providers/AuthProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
  selectedOptions?: Record<string, string>;
}

export const [CartProvider, useCart] = createContextHook(() => {
  const { user } = useAuth();
  const [items, setItems] = useState<Record<string, CartItem>>({});

  useEffect(() => {
    if (!user) {
      void loadGuestCart();
      return;
    }

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

  const saveCart = useCallback(async (newItems: Record<string, CartItem>) => {
    if (user) {
      const cartRef = ref(database, `reycinUSA/cart/${user.uid}`);
      await set(cartRef, {
        items: newItems,
        updatedAt: Date.now(),
      });
    } else {
      await AsyncStorage.setItem("guestCart", JSON.stringify(newItems));
    }
    setItems(newItems);
  }, [user]);

  const addItem = useCallback(async (product: any, selectedOptions?: Record<string, string>) => {
    const newItems = { ...items };
    const optionsSuffix = selectedOptions ? `_${Object.values(selectedOptions).join('_')}` : '';
    const cartKey = `${product.id}${optionsSuffix}`;

    if (newItems[cartKey]) {
      newItems[cartKey].quantity += 1;
    } else {
      newItems[cartKey] = {
        productId: product.id,
        quantity: 1,
        price: product.price,
        name: product.name,
        image: product.media?.[0],
        selectedOptions,
      };
    }

    await saveCart(newItems);
  }, [items, saveCart]);

  const removeItem = useCallback(async (cartKey: string) => {
    const newItems = { ...items };
    delete newItems[cartKey];
    await saveCart(newItems);
  }, [items, saveCart]);

  const updateQuantity = useCallback(async (cartKey: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(cartKey);
      return;
    }

    const newItems = { ...items };
    if (newItems[cartKey]) {
      newItems[cartKey].quantity = quantity;
      await saveCart(newItems);
    }
  }, [items, saveCart, removeItem]);

  const clearCart = useCallback(async () => {
    await saveCart({});
  }, [saveCart]);

  const getTotal = useCallback(() => {
    return Object.values(items).reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [items]);

  const getItemCount = useCallback(() => {
    return Object.values(items).reduce(
      (sum, item) => sum + item.quantity,
      0
    );
  }, [items]);

  return useMemo(() => ({
    items,
    loading: false,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount,
    isEmpty: Object.keys(items).length === 0,
  }), [items, addItem, removeItem, updateQuantity, clearCart, getTotal, getItemCount]);
});
