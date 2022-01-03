import { initializeApp } from "firebase/app";
import {getFirestore} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDVbKP4hA0khAyAv4GxbKnIIqlKKqbeI30",
  authDomain: "house-marketplace-app-87872.firebaseapp.com",
  projectId: "house-marketplace-app-87872",
  storageBucket: "house-marketplace-app-87872.appspot.com",
  messagingSenderId: "194135877112",
  appId: "1:194135877112:web:402525e05dd42ccc14e20d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore()