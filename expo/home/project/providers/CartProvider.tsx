import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { app } from '@/config/firebase';
import { useAuth } from './AuthProvider';

interface CartItem {
  quantity: number;
  productId: string;
}

interface CartContextType {
  items: Record<string, CartItem>;
  loading: boolean;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  isEmpty: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Record<string, CartItem>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setItems({});
      return;
    }

    const database = getDatabase(app);
    const cartRef = ref(database, `reycinUSA/cart/${user.uid}`);

    const unsubscribe = onValue(cartRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.items) {
        const cartItems: Record<string, CartItem> = {};
        Object.entries(data.items).forEach(([productId, quantity]) => {
          cartItems[productId] = {
            productId,
            quantity: quantity as number,
          };
        });
        setItems(cartItems);
      } else {
        setItems({});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addToCart = async (productId: string, quantity: number) => {
    if (!user) throw new Error('User not authenticated');

    const database = getDatabase(app);
    const newItems = { ...items };
    
    if (newItems[productId]) {
      newItems[productId].quantity += quantity;
    } else {
      newItems[productId] = { productId, quantity };
    }

    const cartData = {
      items: Object.fromEntries(
        Object.entries(newItems).map(([id, item]) => [id, item.quantity])
      ),
      updatedAt: Date.now(),
    };

    await set(ref(database, `reycinUSA/cart/${user.uid}`), cartData);
    setItems(newItems);
  };

  const removeItem = async (productId: string) => {
    if (!user) throw new Error('User not authenticated');

    const database = getDatabase(app);
    const newItems = { ...items };
    delete newItems[productId];

    const cartData = {
      items: Object.fromEntries(
        Object.entries(newItems).map(([id, item]) => [id, item.quantity])
      ),
      updatedAt: Date.now(),
    };

    await set(ref(database, `reycinUSA/cart/${user.uid}`), cartData);
    setItems(newItems);
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!user) throw new Error('User not authenticated');

    const database = getDatabase(app);
    const newItems = { ...items };
    
    if (quantity <= 0) {
      delete newItems[productId];
    } else {
      newItems[productId] = { productId, quantity };
    }

    const cartData = {
      items: Object.fromEntries(
        Object.entries(newItems).map(([id, item]) => [id, item.quantity])
      ),
      updatedAt: Date.now(),
    };

    await set(ref(database, `reycinUSA/cart/${user.uid}`), cartData);
    setItems(newItems);
  };

  const clearCart = async () => {
    if (!user) throw new Error('User not authenticated');

    const database = getDatabase(app);
    await set(ref(database, `reycinUSA/cart/${user.uid}`), {
      items: {},
      updatedAt: Date.now(),
    });
    setItems({});
  };

  const itemCount = Object.values(items).reduce((sum, item) => sum + item.quantity, 0);
  const isEmpty = itemCount === 0;

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        addToCart,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        isEmpty,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}