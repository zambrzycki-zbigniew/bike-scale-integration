import { initializeApp } from 'firebase/app';
import { getFirestore }  from 'firebase/firestore';
import { getAuth }       from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA_c91H9hA2dROsxoRtJ4LWidyXHQ8Fn4U",
  authDomain: "bike-scale-integration.firebaseapp.com",
  projectId: "bike-scale-integration",
  storageBucket: "bike-scale-integration.firebasestorage.app",
  messagingSenderId: "504294436171",
  appId: "1:504294436171:web:6ab7d0bc89ee0868bcccce"
};

export const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);