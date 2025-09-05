import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyCWsh5wSHSIBwndmcSqhh5c9jwGZeIwlDQ",
  authDomain: "xappstore-533b8.firebaseapp.com",
  databaseURL: "https://xappstore-533b8-default-rtdb.firebaseio.com",
  projectId: "xappstore-533b8",
  storageBucket: "xappstore-533b8.appspot.com",
  messagingSenderId: "996074459120",
  appId: "1:996074459120:web:bb2ef275f6dc308eb89735",
  measurementId: "G-8WFEMSLBWS"
};

export const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence for React Native
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  // For React Native, we'll use the default persistence which works with AsyncStorage
  auth = getAuth(app);
}

export { auth };
export const database = getDatabase(app);