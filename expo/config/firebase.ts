import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with React Native persistence so Remember Me can survive app restarts.
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const database = getDatabase(app);

export { app, auth, database };