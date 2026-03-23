import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { ref, push, set } from "firebase/database";
import { brgAuth, brgDatabase } from "@/config/firebase-brg";

export interface CartItemForInvoice {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
  selectedOptions?: Record<string, string>;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export const [BRGAuthProvider, useBRGAuth] = createContextHook(() => {
  const [brgUser, setBrgUser] = useState<User | null>(null);
  const [brgLoading, setBrgLoading] = useState(true);
  const [brgError, setBrgError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(brgAuth, (user) => {
      console.log("BRG auth state:", user?.email ?? "signed out");
      setBrgUser(user);
      setBrgLoading(false);
    });
    return unsubscribe;
  }, []);

  const parseBRGError = (message: string): string => {
    if (message.includes("user-not-found") || message.includes("invalid-credential")) {
      return "No account found with that email or password.";
    }
    if (message.includes("wrong-password")) return "Incorrect password.";
    if (message.includes("email-already-in-use")) return "An account with this email already exists.";
    if (message.includes("weak-password")) return "Password must be at least 6 characters.";
    if (message.includes("invalid-email")) return "Please enter a valid email address.";
    if (message.includes("too-many-requests")) return "Too many attempts. Please try again later.";
    return "Something went wrong. Please try again.";
  };

  const brgSignIn = useCallback(async (email: string, password: string) => {
    try {
      setBrgError(null);
      const credential = await signInWithEmailAndPassword(brgAuth, email, password);
      console.log("BRG signed in:", credential.user.email);
      return credential.user;
    } catch (err: any) {
      console.error("BRG sign in error:", err.message);
      const friendly = parseBRGError(err.message);
      setBrgError(friendly);
      throw new Error(friendly);
    }
  }, []);

  const brgSignUp = useCallback(async (email: string, password: string) => {
    try {
      setBrgError(null);
      const credential = await createUserWithEmailAndPassword(brgAuth, email, password);
      console.log("BRG account created:", credential.user.email);
      return credential.user;
    } catch (err: any) {
      console.error("BRG sign up error:", err.message);
      const friendly = parseBRGError(err.message);
      setBrgError(friendly);
      throw new Error(friendly);
    }
  }, []);

  const brgSignOutFn = useCallback(async () => {
    try {
      await firebaseSignOut(brgAuth);
      console.log("BRG signed out");
    } catch (err: any) {
      console.error("BRG sign out error:", err.message);
    }
  }, []);

  const submitInvoice = useCallback(
    async (
      items: Record<string, CartItemForInvoice>,
      totals: OrderTotals
    ): Promise<string> => {
      if (!brgUser) throw new Error("Not authenticated with BRG");

      const now = new Date().toISOString();
      const invoiceItems = Object.values(items).map((item) => ({
        id: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions ?? null,
      }));

      const orderDetails = {
        items: invoiceItems,
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        shippingProtection: 0,
        tax: totals.tax,
        total: totals.total,
        shippingAddress: "To be collected during admin approval",
        orderDate: now,
        status: "pending",
        date: now,
        transactionType: "cart-order",
      };

      const txnBaseRef = ref(
        brgDatabase,
        `Blackrock/public-ledger/transactions/${brgUser.uid}`
      );
      const newTxnRef = push(txnBaseRef);
      await set(newTxnRef, orderDetails);
      console.log("BRG transaction written:", newTxnRef.key);

      const invoiceBaseRef = ref(
        brgDatabase,
        `Blackrock/public-ledger/invoices/${brgUser.uid}`
      );
      const newInvoiceRef = push(invoiceBaseRef);
      const invoiceKey = newInvoiceRef.key ?? `inv_${Date.now()}`;

      const invoice = {
        id: invoiceKey,
        type: "order",
        details: orderDetails,
        status: "pending",
        createdAt: now,
        invoiceLink: null,
        isPaid: false,
        trackingInfo: {
          trackingNumber: null,
          carrier: null,
          status: "awaiting_shipment",
          estimatedDelivery: null,
          updates: [
            {
              timestamp: now,
              status: "Invoice Created",
              location: "Blackrock Resource Group",
            },
          ],
        },
      };

      await set(newInvoiceRef, invoice);
      console.log("BRG invoice written:", invoiceKey);
      return invoiceKey;
    },
    [brgUser]
  );

  return useMemo(
    () => ({
      brgUser,
      brgLoading,
      brgError,
      brgSignIn,
      brgSignUp,
      brgSignOut: brgSignOutFn,
      submitInvoice,
      isBRGAuthenticated: !!brgUser,
    }),
    [brgUser, brgLoading, brgError, brgSignIn, brgSignUp, brgSignOutFn, submitInvoice]
  );
});
