import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const BRG_APP_NAME = "BlackrockResourceGroup";

const brgConfig = {
  apiKey: "AIzaSyCRGrf2PkCB5igl3uNYzyY4ULI8jkv7Ie8",
  authDomain: "calchub-73bab.firebaseapp.com",
  databaseURL: "https://calchub-73bab-default-rtdb.firebaseio.com",
  projectId: "calchub-73bab",
  storageBucket: "calchub-73bab.firebasestorage.app",
  messagingSenderId: "743518759791",
  appId: "1:743518759791:web:caffedd3e28be15bbe969a",
  measurementId: "G-STQ7R7D1DC",
};

const brgApp = getApps().find((a) => a.name === BRG_APP_NAME)
  ? getApp(BRG_APP_NAME)
  : initializeApp(brgConfig, BRG_APP_NAME);

const brgAuth = getAuth(brgApp);
const brgDatabase = getDatabase(brgApp);

export { brgApp, brgAuth, brgDatabase };
