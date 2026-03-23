import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  sendEmailVerification,
  updatePassword
} from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { auth, database } from "@/config/firebase";
import { brgAuth } from "@/config/firebase-brg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export interface EngineConfig {
  type: string;
  displacement?: string;
  hp?: number;
  torque?: number;
  tuner?: string;
  fuelType?: string;
  notes?: string;
}

export interface RepairEntry {
  date: number;
  type: "repair" | "upgrade" | "maintenance";
  title: string;
  description?: string;
  mileage?: number;
  cost?: number;
  shop?: string;
}

export interface DamageReport {
  date: number;
  title: string;
  description?: string;
  severity: "minor" | "moderate" | "severe";
  repaired: boolean;
}

export interface Booking {
  date: number;
  type: "service" | "track";
  title: string;
  location?: string;
  notes?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
}

export interface Vehicle {
  productId: string;
  model: string;
  color?: string;
  package?: string;
  year?: number;
  vin?: string;
  image?: string;
  specs?: Record<string, any>;
  addedAt: number;
  nickname?: string;
  mileage?: number;
  notes?: string;
  manualUrl?: string;
  engineConfig?: EngineConfig;
  repairs?: Record<string, RepairEntry>;
  damages?: Record<string, DamageReport>;
  bookings?: Record<string, Booking>;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  role: "user" | "owner" | "tech" | "engineer";
  createdAt: number;
  vehicles?: Record<string, Vehicle>;
  addresses?: Record<string, Address>;
}

interface Address {
  line1: string;
  city: string;
  country: string;
  postal: string;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const shouldRemember = await AsyncStorage.getItem("rememberMe");
        setRememberMe(shouldRemember === "true");
        if (shouldRemember !== "true") {
          await AsyncStorage.removeItem("authUser");
        }
      } catch (e) {
        console.error("Error initializing auth:", e);
      }
    };

    void initializeAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const profileRef = ref(database, `reycinUSA/users/${firebaseUser.uid}`);
        const snapshot = await get(profileRef);

        if (snapshot.exists()) {
          setProfile(snapshot.val());
        } else {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || "Driver",
            role: "user",
            createdAt: Date.now(),
          };
          await set(profileRef, newProfile);
          setProfile(newProfile);
        }

        const shouldRemember = await AsyncStorage.getItem("rememberMe");
        if (shouldRemember === "true") {
          await AsyncStorage.setItem("authUser", JSON.stringify(firebaseUser.uid));
        }
      } else {
        setProfile(null);
        const shouldRemember = await AsyncStorage.getItem("rememberMe");
        if (shouldRemember !== "true") {
          await AsyncStorage.removeItem("authUser");
        }
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string, remember: boolean = false) => {
    try {
      setError(null);
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await AsyncStorage.setItem("rememberMe", remember.toString());
      setRememberMe(remember);
      if (remember) {
        await AsyncStorage.setItem("authUser", JSON.stringify(credential.user.uid));
      } else {
        await AsyncStorage.removeItem("authUser");
      }
      return credential.user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      setError(null);
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(credential.user);
      const profileRef = ref(database, `reycinUSA/users/${credential.user.uid}`);
      const newProfile: UserProfile = {
        uid: credential.user.uid,
        email,
        displayName,
        role: "user",
        createdAt: Date.now(),
      };
      await set(profileRef, newProfile);
      try {
        await createUserWithEmailAndPassword(brgAuth, email, password);
        console.log("BRG invoice account created alongside primary account");
      } catch (brgErr: any) {
        console.log("BRG parallel account note:", brgErr.code);
      }
      return credential.user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      await AsyncStorage.removeItem("rememberMe");
      await AsyncStorage.removeItem("authUser");
      setRememberMe(false);
      router.replace("/(auth)/login");
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    try {
      const profileRef = ref(database, `reycinUSA/users/${user.uid}`);
      const updated = { ...profile, ...updates };
      await set(profileRef, updated);
      setProfile(updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [user, profile]);

  const addVehicle = useCallback(async (vehicle: Omit<Vehicle, 'addedAt'>) => {
    if (!user || !profile) return;
    try {
      const vehicleId = `${vehicle.productId}_${Date.now()}`;
      const newVehicle: Vehicle = { ...vehicle, addedAt: Date.now() };
      const existing = profile.vehicles || {};
      const updated = { ...profile, vehicles: { ...existing, [vehicleId]: newVehicle } };
      const profileRef = ref(database, `reycinUSA/users/${user.uid}`);
      await set(profileRef, updated);
      setProfile(updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [user, profile]);

  const updateVehicle = useCallback(async (vehicleId: string, updates: Partial<Vehicle>) => {
    if (!user || !profile) return;
    try {
      const existing = profile.vehicles || {};
      const currentVehicle = existing[vehicleId];
      if (!currentVehicle) return;
      const updatedVehicle: Vehicle = { ...currentVehicle, ...updates };
      const updated: UserProfile = {
        ...profile,
        vehicles: { ...existing, [vehicleId]: updatedVehicle },
      };
      const profileRef = ref(database, `reycinUSA/users/${user.uid}`);
      await set(profileRef, updated);
      setProfile(updated);
      console.log("Vehicle updated:", vehicleId);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [user, profile]);

  const removeVehicle = useCallback(async (vehicleId: string) => {
    if (!user || !profile) return;
    try {
      const existing = { ...(profile.vehicles || {}) };
      delete existing[vehicleId];
      const updated: UserProfile = { ...profile, vehicles: existing };
      const profileRef = ref(database, `reycinUSA/users/${user.uid}`);
      await set(profileRef, updated);
      setProfile(updated);
      console.log("Vehicle removed:", vehicleId);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [user, profile]);

  const changePassword = useCallback(async (newPassword: string) => {
    if (!user) return;
    try {
      await updatePassword(user, newPassword);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  const hasRole = useCallback((role: string) => profile?.role === role, [profile]);

  return useMemo(() => ({
    user,
    profile,
    loading,
    error,
    rememberMe,
    signIn,
    signUp,
    signOut,
    updateProfile,
    addVehicle,
    updateVehicle,
    removeVehicle,
    changePassword,
    isAuthenticated: !!user,
    isEmailVerified: user?.emailVerified || false,
    hasRole,
  }), [user, profile, loading, error, rememberMe, signIn, signUp, signOut, updateProfile, addVehicle, updateVehicle, removeVehicle, changePassword, hasRole]);
});
