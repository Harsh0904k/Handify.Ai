import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, logEvent } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBZuub090HiyMGGc_OA8sMi6_EsfX6CCww",
  authDomain: "handify-ai.firebaseapp.com",
  projectId: "handify-ai",
  storageBucket: "handify-ai.firebasestorage.app",
  messagingSenderId: "980518786767",
  appId: "1:980518786767:web:76f3e9a0050da3097489ba",
  measurementId: "G-3GC4P59VK9"
};

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Analytics
let analytics: any = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export const logAnalyticsEvent = (eventName: string, eventParams?: any) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
  }
};

export default app;
