import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAiSuhH-P_TaaKun4PZscfjn3qDFtFBpy0',
  authDomain: 'cookoff-cde78.firebaseapp.com',
  databaseURL: 'https://cookoff-cde78-default-rtdb.firebaseio.com',
  projectId: 'cookoff-cde78',
  storageBucket: 'cookoff-cde78.firebasestorage.app',
  messagingSenderId: '149035212939',
  appId: '1:149035212939:web:02081281390463S739b48e',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
