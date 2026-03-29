import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  User
} from 'firebase/auth';
import { getDatabase, ref, set, get } from 'firebase/database';
import { app } from '@/config/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);
  const database = getDatabase(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Check if user profile exists in database
        const userRef = ref(database, `reycinUSA/users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
          // Create user profile if it doesn't exist
          await set(userRef, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'User',
            role: 'user',
            createdAt: Date.now(),
            vehicles: {},
            addresses: {},
          });
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, database]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Create user profile in database
    await set(ref(database, `reycinUSA/users/${firebaseUser.uid}`), {
      email: firebaseUser.email,
      displayName,
      role: 'user',
      createdAt: Date.now(),
      vehicles: {},
      addresses: {},
    });
    
    // Send verification email
    await sendEmailVerification(firebaseUser);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const sendVerificationEmail = async () => {
    if (user && !user.emailVerified) {
      await sendEmailVerification(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        logout,
        sendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}