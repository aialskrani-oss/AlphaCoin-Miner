import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDU1VlmzIYRqCjrH-kr-qg10pU4dfx7bfs",
  authDomain: "aiph-acon.firebaseapp.com",
  databaseURL: "https://aiph-acon-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aiph-acon",
  storageBucket: "aiph-acon.firebasestorage.app",
  messagingSenderId: "260450986761",
  appId: "1:260450986761:web:6a33ade232f9831a30a768"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getDatabase(app);

// اسم مستخدم الأدمن — تغييره حسب ما تريد
export const ADMIN_USERNAME = "alpha_admin";
