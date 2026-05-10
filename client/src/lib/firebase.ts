import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAeTqVqJ8JUfWd5KIXcy0Fu80hTK9xDvEU",
  authDomain: "tisggo-news.firebaseapp.com",
  projectId: "tisggo-news",
  storageBucket: "tisggo-news.firebasestorage.app",
  messagingSenderId: "700029482147",
  appId: "1:700029482147:web:87bc624fe027247ec93b16",
  measurementId: "G-Z9G2018YD9"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);
const db = getFirestore(app);
let analytics;

if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.error("Firebase analytics failed to initialize", error);
  }
}

export { app, storage, auth, db, analytics };
