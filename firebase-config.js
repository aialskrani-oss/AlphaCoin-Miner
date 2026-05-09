import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDIsEEXCafhtSizdUHkM6BKaCuTdMH1KUQ",
  authDomain: "alphacoin-27d62.firebaseapp.com",
  databaseURL: "https://alphacoin-27d62-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "alphacoin-27d62",
  storageBucket: "alphacoin-27d62.firebasestorage.app",
  messagingSenderId: "264895286078",
  appId: "1:264895286078:web:bae0b3cf7096499637ba6f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getDatabase(app);
