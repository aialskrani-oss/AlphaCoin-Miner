import { auth, db } from "./firebase-config.js";
  import {
    GoogleAuthProvider,
    signInWithPopup,
    browserLocalPersistence,
    setPersistence,
    signOut,
    onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
  import {
    ref, get, set, update, onValue
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

  const ADMIN_EMAIL = "aialskrani@gmail.com";

  // Ã¢ÂÂÃ¢ÂÂ Upgrade configs Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const POWER_UPGRADES = [
    { level: 1, power: 1,  label: "1 ÃÂ±/ÃÂ³ÃÂ§ÃÂ¹ÃÂ©",  perSec: (1/3600),  cost: 0 },
    { level: 2, power: 2,  label: "2 ÃÂ±/ÃÂ³ÃÂ§ÃÂ¹ÃÂ©",  perSec: (2/3600),  cost: 100 },
    { level: 3, power: 3,  label: "3 ÃÂ±/ÃÂ³ÃÂ§ÃÂ¹ÃÂ©",  perSec: (3/3600),  cost: 300 },
    { level: 4, power: 5,  label: "5 ÃÂ±/ÃÂ³ÃÂ§ÃÂ¹ÃÂ©",  perSec: (5/3600),  cost: 800 },
    { level: 5, power: 8,  label: "8 ÃÂ±/ÃÂ³ÃÂ§ÃÂ¹ÃÂ©",  perSec: (8/3600),  cost: 2000 }
  ];
  const DURATION_UPGRADES = [
    { level: 1, hours: 3,  label: "3 ÃÂ³ÃÂ§ÃÂ¹ÃÂ§ÃÂª",  cost: 0 },
    { level: 2, hours: 6,  label: "6 ÃÂ³ÃÂ§ÃÂ¹ÃÂ§ÃÂª",  cost: 200 },
    { level: 3, hours: 12, label: "12 ÃÂ³ÃÂ§ÃÂ¹ÃÂ©",  cost: 600 },
    { level: 4, hours: 24, label: "24 ÃÂ³ÃÂ§ÃÂ¹ÃÂ©",  cost: 1500 }
  ];

  // Ã¢ÂÂÃ¢ÂÂ DOM refs Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const $ = id => document.getElementById(id);
  const loadingEl      = $("loading");
  const authScreen     = $("auth-screen");
  const gameContainer  = $("game-container");
  const googleLoginBtn = $("google-login-btn");
  const authErr        = $("auth-err");
  const userNameEl     = $("user-name");
  const userPhotoEl    = $("user-photo");
  const logoutBtn      = $("logout-btn");
  const balanceEl      = $("balance");
  const totalMinedEl   = $("total-mined");
  const toastEl        = $("toast");
  const adminBtnWrap   = $("admin-btn-wrap");
  const claimBtn       = $("claim-btn");
  const couponInp      = $("coupon-code");
  const redeemBtn      = $("redeem-btn");
  const couponMsgEl    = $("coupon-msg");

  // Ã¢ÂÂÃ¢ÂÂ Particles Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  (function () {
    const c = $("particles");
    for (let i = 0; i < 26; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const s = Math.random() * 3 + 1;
      p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;top:${Math.random()*100+100}%;animation-duration:${Math.random()*18+10}s;animation-delay:${Math.random()*14}s;`;
      c.appendChild(p);
    }
  })();

  // Ã¢ÂÂÃ¢ÂÂ Toast Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  let toastTimer;
  function showToast(msg, type = "ok") {
    toastEl.textContent = msg;
    toastEl.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.className = "toast"), 3000);
  }

  // Ã¢ÂÂÃ¢ÂÂ Tabs Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const tabEl = $("tab-" + btn.dataset.tab);
      if (tabEl) tabEl.classList.add("active");
      if (btn.dataset.tab === "profile")  loadProfile();
      if (btn.dataset.tab === "upgrades") renderUpgrades();
    });
  });

  // Ã¢ÂÂÃ¢ÂÂ State Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  let currentUser  = null;
  let userData     = null;
  let miningTimer  = null;
  let isClaiming   = false;
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });

  // Ã¢ÂÂÃ¢ÂÂ Auth Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  onAuthStateChanged(auth, async user => {
    loadingEl.style.display = "none";
    if (user) {
      currentUser = user;
      authScreen.style.display    = "none";
      gameContainer.style.display = "flex";
      await ensureUserRecord(user);
      listenUserData(user.uid);
      startCardsListener();
    } else {
      currentUser = null;
      userData    = null;
      stopMiningTimer();
      clearCards();
      gameContainer.style.display = "none";
      authScreen.style.display    = "flex";
      resetLoginBtn();
    }
  });

  googleLoginBtn.addEventListener("click", async () => {
    googleLoginBtn.disabled = true;
    googleLoginBtn.textContent = "ÃÂ¬ÃÂ§ÃÂ± ÃÂ§ÃÂÃÂ¯ÃÂ®ÃÂÃÂÃ¢ÂÂ¦";
    authErr.textContent = "";
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      authErr.textContent = getErrMsg(e);
      resetLoginBtn();
    }
  });

  function resetLoginBtn() {
    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML = `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width="22"/> ÃÂ§ÃÂÃÂ¯ÃÂ®ÃÂÃÂ ÃÂ¨ÃÂ­ÃÂ³ÃÂ§ÃÂ¨ Google`;
  }

  function getErrMsg(e) {
    return ({
      "auth/popup-closed-by-user":    "ÃÂ£ÃÂÃÂºÃÂÃÂÃÂª ÃÂÃÂ§ÃÂÃÂ°ÃÂ© ÃÂ§ÃÂÃÂ¯ÃÂ®ÃÂÃÂ Ã¢ÂÂ ÃÂ­ÃÂ§ÃÂÃÂ ÃÂÃÂ±ÃÂ© ÃÂ£ÃÂ®ÃÂ±ÃÂ",
      "auth/popup-blocked":           "ÃÂ§ÃÂÃÂÃÂªÃÂµÃÂÃÂ­ ÃÂ­ÃÂ¬ÃÂ¨ ÃÂ§ÃÂÃÂÃÂ§ÃÂÃÂ°ÃÂ© Ã¢ÂÂ ÃÂ§ÃÂ³ÃÂÃÂ­ ÃÂ¨ÃÂ§ÃÂÃÂÃÂÃÂ§ÃÂÃÂ° ÃÂÃÂÃÂÃÂÃÂÃÂ¹",
      "auth/cancelled-popup-request": "ÃÂªÃÂ ÃÂ¥ÃÂÃÂºÃÂ§ÃÂ¡ ÃÂ§ÃÂÃÂ·ÃÂÃÂ¨",
      "auth/network-request-failed":  "ÃÂ®ÃÂ·ÃÂ£ ÃÂÃÂ ÃÂ§ÃÂÃÂ§ÃÂªÃÂµÃÂ§ÃÂ ÃÂ¨ÃÂ§ÃÂÃÂ¥ÃÂÃÂªÃÂ±ÃÂÃÂª",
      "auth/user-disabled":           "ÃÂÃÂ°ÃÂ§ ÃÂ§ÃÂÃÂ­ÃÂ³ÃÂ§ÃÂ¨ ÃÂÃÂ¹ÃÂ·ÃÂÃÂ",
    })[e.code] || ("ÃÂ®ÃÂ·ÃÂ£: " + (e.message || e.code));
  }

  logoutBtn.addEventListener("click", () => signOut(auth));

  // Ã¢ÂÂÃ¢ÂÂ Ensure user record Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  async function ensureUserRecord(user) {
    const snap = await get(ref(db, `users/${user.uid}`));
    const now  = Date.now();
    if (!snap.exists()) {
      const raw   = user.displayName || user.email || user.uid;
      const uname = raw.split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase().slice(0, 20);
      await set(ref(db, `users/${user.uid}`), {
        username: uname,
        email: user.email || "",
        photoURL: user.photoURL || "",
        balance: 0,
        totalMined: 0,
        miningPower: 1,
        maxMiningDuration: 3,
        miningPowerLevel: 1,
        miningDurationLevel: 1,
        miningStartTime: now,
        lastClaimTime: now,
        createdAt: now
      });
    } else {
      // Patch missing fields for existing users
      const d = snap.val();
      const patch = {};
      if (d.miningPower         == null) patch.miningPower         = 1;
      if (d.maxMiningDuration   == null) patch.maxMiningDuration   = 3;
      if (d.miningPowerLevel    == null) patch.miningPowerLevel    = 1;
      if (d.miningDurationLevel == null) patch.miningDurationLevel = 1;
      if (d.miningStartTime     == null) patch.miningStartTime     = now;
      if (d.lastClaimTime       == null) patch.lastClaimTime       = now;
      if (Object.keys(patch).length > 0) {
        await update(ref(db, `users/${user.uid}`), patch);
      }
    }
  }

  // Ã¢ÂÂÃ¢ÂÂ Live listener Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function listenUserData(uid) {
    onValue(ref(db, `users/${uid}`), snap => {
      if (!snap.exists()) return;
      userData = snap.val();
      updateStaticUI();
      startMiningTimer();
    });
  }

  // Ã¢ÂÂÃ¢ÂÂ Static UI updates (from DB data) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function updateStaticUI() {
    if (!userData) return;
    const bal   = userData.balance    || 0;
    const total = userData.totalMined || 0;
    const power = userData.miningPower || 1;

    balanceEl.textContent    = bal.toFixed(6);
    totalMinedEl.textContent = total.toFixed(6);
    userNameEl.textContent   = userData.username || "";

    if (userData.photoURL) {
      userPhotoEl.src = userData.photoURL;
      userPhotoEl.style.display = "block";
    }
    if (adminBtnWrap)
      adminBtnWrap.style.display = (currentUser?.email === ADMIN_EMAIL) ? "block" : "none";

    $("mining-power-display").textContent = power;
    $("upgrade-balance").textContent = bal.toFixed(6);
  }

  // Ã¢ÂÂÃ¢ÂÂ Mining calculations Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function calcMining() {
    if (!userData) return { pending: 0, elapsedHours: 0, maxHours: 3, isActive: false, remainingSec: 0, perSec: 0 };

    const now       = Date.now();
    const lastClaim = userData.lastClaimTime     || now;
    const power     = userData.miningPower       || 1;
    const maxHours  = userData.maxMiningDuration || 3;

    const elapsedMs   = now - lastClaim;
    const maxMs       = maxHours * 3600 * 1000;
    const effectiveMs = Math.min(elapsedMs, maxMs);

    const elapsedHours = effectiveMs / 3_600_000;
    const pending      = elapsedHours * power;
    const isActive     = elapsedMs < maxMs;
    const remainingSec = isActive ? Math.ceil((maxMs - elapsedMs) / 1000) : 0;
    const perSec       = power / 3600;

    return { pending, elapsedHours, maxHours, isActive, remainingSec, elapsedMs, maxMs, perSec };
  }

  // Ã¢ÂÂÃ¢ÂÂ Timer Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function stopMiningTimer() {
    if (miningTimer) { clearInterval(miningTimer); miningTimer = null; }
  }

  function startMiningTimer() {
    stopMiningTimer();
    updateMiningUI();
    miningTimer = setInterval(updateMiningUI, 100); // update every 100ms for smooth display
  }

  function formatCountdown(sec) {
    if (sec <= 0) return "00:00:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }

  function updateMiningUI() {
    const { pending, elapsedHours, maxHours, isActive, remainingSec, perSec } = calcMining();
    const pct = Math.min(100, (elapsedHours / maxHours) * 100);

    // Live pending display Ã¢ÂÂ 6 decimal places for real-time feel
    $("pending-earnings").textContent = pending.toFixed(6);
    $("mine-progress-fill").style.width = pct.toFixed(3) + "%";
    $("mine-time-text").textContent = elapsedHours.toFixed(4) + " / " + maxHours + " ÃÂ³ÃÂ§ÃÂ¹ÃÂ§ÃÂª";
    $("mine-rate").textContent = (userData?.miningPower || 1) + " ÃÂ±/ÃÂ³ÃÂ§ÃÂ¹ÃÂ©";

    // Per-second rate
    const perSecEl = $("per-sec-rate");
    if (perSecEl) perSecEl.textContent = "+" + perSec.toFixed(8) + " ÃÂ±/ÃÂ«ÃÂ§ÃÂÃÂÃÂ©";

    if (isActive) {
      $("mine-status-title").textContent = "ÃÂ§ÃÂÃÂªÃÂ¹ÃÂ¯ÃÂÃÂ ÃÂÃÂ´ÃÂ· Ã¢ÂÂ";
      $("mine-status-sub").textContent   = "ÃÂÃÂªÃÂ ÃÂªÃÂ¹ÃÂ¯ÃÂÃÂ ÃÂ§ÃÂÃÂ¹ÃÂÃÂÃÂ§ÃÂª ÃÂªÃÂÃÂÃÂ§ÃÂ¦ÃÂÃÂ§ÃÂ ÃÂ§ÃÂÃÂ¢ÃÂ";
      $("mine-badge").textContent        = "Ã¢ÂÂ ÃÂÃÂ´ÃÂ·";
      $("mine-badge").className          = "auto-mine-badge active";
      $("time-remaining").textContent    = formatCountdown(remainingSec);
      claimBtn.disabled = isClaiming;
      claimBtn.className = "btn-claim";
    } else {
      $("mine-status-title").textContent = "ÃÂ§ÃÂÃÂªÃÂÃÂ ÃÂ§ÃÂÃÂªÃÂ¹ÃÂ¯ÃÂÃÂ Ã¢ÂÂ";
      $("mine-status-sub").textContent   = "ÃÂ§ÃÂ¬ÃÂÃÂ ÃÂ§ÃÂÃÂ£ÃÂ±ÃÂ¨ÃÂ§ÃÂ­ ÃÂÃÂ¥ÃÂ¹ÃÂ§ÃÂ¯ÃÂ© ÃÂªÃÂ´ÃÂºÃÂÃÂ ÃÂ§ÃÂÃÂªÃÂ¹ÃÂ¯ÃÂÃÂ";
      $("mine-badge").textContent        = "Ã¢ÂÂ¸ ÃÂÃÂÃÂªÃÂÃÂ";
      $("mine-badge").className          = "auto-mine-badge stopped";
      $("time-remaining").textContent    = "00:00:00";
      claimBtn.disabled = isClaiming || pending <= 0;
      claimBtn.className = "btn-claim ready";
    }
  }

  // Ã¢ÂÂÃ¢ÂÂ Claim Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  claimBtn.addEventListener("click", async () => {
    if (!currentUser || !userData || isClaiming) return;
    const { pending } = calcMining();
    if (pending < 0.000001) { showToast("ÃÂÃÂ§ ÃÂªÃÂÃÂ¬ÃÂ¯ ÃÂ£ÃÂ±ÃÂ¨ÃÂ§ÃÂ­ ÃÂÃÂ§ÃÂÃÂÃÂ© ÃÂ¨ÃÂ¹ÃÂ¯", "err"); return; }

    isClaiming = true;
    claimBtn.disabled = true;
    claimBtn.innerHTML = `<span class="claim-spinner"></span> ÃÂ¬ÃÂ§ÃÂ± ÃÂ§ÃÂÃÂ¬ÃÂÃÂÃ¢ÂÂ¦`;

    const now      = Date.now();
    const earned   = Math.floor(pending * 1_000_000) / 1_000_000; // floor to 6dp
    const newBal   = Math.round(((userData.balance   || 0) + earned) * 1_000_000) / 1_000_000;
    const newTotal = Math.round(((userData.totalMined || 0) + earned) * 1_000_000) / 1_000_000;

    try {
      await update(ref(db, `users/${currentUser.uid}`), {
        balance:        newBal,
        totalMined:     newTotal,
        lastClaimTime:  now,
        miningStartTime: now
      });
      claimBtn.innerHTML = `<span>Ã°ÂÂÂ° ÃÂ§ÃÂ¬ÃÂÃÂ ÃÂ§ÃÂÃÂ£ÃÂ±ÃÂ¨ÃÂ§ÃÂ­</span>`;
      showToast(`+ÃÂ±${earned.toFixed(6)} ÃÂªÃÂ ÃÂ§ÃÂÃÂ¬ÃÂÃÂ! Ã°ÂÂÂ°`);
      spawnRewardBurst(earned);
    } catch (e) {
      showToast("ÃÂ®ÃÂ·ÃÂ£: " + e.message, "err");
      claimBtn.innerHTML = `<span>Ã°ÂÂÂ° ÃÂ§ÃÂ¬ÃÂÃÂ ÃÂ§ÃÂÃÂ£ÃÂ±ÃÂ¨ÃÂ§ÃÂ­</span>`;
    } finally {
      isClaiming = false;
    }
  });

  // Ã¢ÂÂÃ¢ÂÂ Reward burst animation Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function spawnRewardBurst(amount) {
    const colors = ["#f0b429","#00d4ff","#22c55e","#a855f7","#fff"];
    for (let i = 0; i < 18; i++) {
      const el = document.createElement("div");
      el.className = "burst-particle";
      const angle  = (i / 18) * 360;
      const dist   = 60 + Math.random() * 80;
      const rad    = (angle * Math.PI) / 180;
      const tx     = Math.cos(rad) * dist;
      const ty     = Math.sin(rad) * dist;
      el.style.cssText = `
        position:fixed;
        left:50%;top:50%;
        width:8px;height:8px;
        border-radius:50%;
        background:${colors[i % colors.length]};
        transform:translate(-50%,-50%);
        pointer-events:none;
        z-index:9999;
        animation:burst .8s ease-out forwards;
        --tx:${tx}px;--ty:${ty}px;
      `;
      document.body.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
    }
    const label = document.createElement("div");
    label.className   = "float-reward";
    label.textContent = `+ÃÂ±${amount.toFixed(6)}`;
    label.style.cssText = "left:50%;top:42%;transform:translateX(-50%);position:fixed;z-index:9999;";
    document.body.appendChild(label);
    label.addEventListener("animationend", () => label.remove());
  }

  // Ã¢ÂÂÃ¢ÂÂ Coupon Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  redeemBtn.addEventListener("click", redeemCoupon);
  couponInp.addEventListener("keydown", e => { if (e.key === "Enter") redeemCoupon(); });

  async function redeemCoupon() {
    const code = couponInp.value.trim().toUpperCase();
    if (!code)             { setCouponMsg("ÃÂ£ÃÂ¯ÃÂ®ÃÂ ÃÂÃÂÃÂ¯ ÃÂ§ÃÂÃÂÃÂ³ÃÂÃÂÃÂ© ÃÂ£ÃÂÃÂÃÂ§ÃÂ", "err"); return; }
    if (!currentUser || !userData) return;
    redeemBtn.disabled = true;
    setCouponMsg("ÃÂ¬ÃÂ§ÃÂ± ÃÂ§ÃÂÃÂªÃÂ­ÃÂÃÂÃ¢ÂÂ¦", "");
    try {
      const cpSnap = await get(ref(db, `coupons/${code}`));
      if (!cpSnap.exists()) { setCouponMsg("Ã¢ÂÂ ÃÂ§ÃÂÃÂÃÂ³ÃÂÃÂÃÂ© ÃÂºÃÂÃÂ± ÃÂÃÂÃÂ¬ÃÂÃÂ¯ÃÂ©", "err"); return; }
      const cp = cpSnap.val();
      if (!cp.isActive)     { setCouponMsg("Ã¢ÂÂ ÃÂ§ÃÂÃÂÃÂ³ÃÂÃÂÃÂ© ÃÂºÃÂÃÂ± ÃÂÃÂ´ÃÂ·ÃÂ©", "err"); return; }
      const usedBy = cp.usedBy && typeof cp.usedBy === "object" ? cp.usedBy : {};
      if (usedBy[currentUser.uid]) { setCouponMsg("Ã¢ÂÂ ÃÂ§ÃÂ³ÃÂªÃÂ®ÃÂ¯ÃÂÃÂª ÃÂÃÂ°ÃÂ ÃÂ§ÃÂÃÂÃÂ³ÃÂÃÂÃÂ© ÃÂÃÂ ÃÂÃÂ¨ÃÂ", "err"); return; }
      const newBal = Math.round(((userData.balance || 0) + cp.rewardAmount) * 1_000_000) / 1_000_000;
      await update(ref(db, `users/${currentUser.uid}`), { balance: newBal });
      await update(ref(db, `coupons/${code}/usedBy`), { [currentUser.uid]: true });
      setCouponMsg(`Ã¢ÂÂ ÃÂªÃÂ! +ÃÂ±${cp.rewardAmount}`, "ok");
      couponInp.value = "";
      showToast(`+ÃÂ±${cp.rewardAmount} ÃÂªÃÂ ÃÂ§ÃÂ³ÃÂªÃÂ¨ÃÂ¯ÃÂ§ÃÂ ÃÂ§ÃÂÃÂÃÂ³ÃÂÃÂÃÂ©! Ã°ÂÂÂ`);
    } catch (e) {
      setCouponMsg("ÃÂ®ÃÂ·ÃÂ£: " + e.message, "err");
    } finally {
      redeemBtn.disabled = false;
    }
  }

  function setCouponMsg(m, t) {
    couponMsgEl.textContent = m;
    couponMsgEl.className   = "coupon-msg " + t;
  }

  // Ã¢ÂÂÃ¢ÂÂ Upgrades Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function renderUpgrades() {
    if (!userData) return;
    const curPL  = userData.miningPowerLevel    || 1;
    const curDL  = userData.miningDurationLevel || 1;
    const bal    = userData.balance || 0;

    $("upgrade-balance").textContent = bal.toFixed(6);

    // Power
    const pc = $("power-upgrades");
    pc.innerHTML = "";
    POWER_UPGRADES.forEach(u => {
      const isOwned   = curPL >  u.level;
      const isCurrent = curPL === u.level;
      const isNext    = curPL === u.level - 1;
      const canAfford = bal >= u.cost;
      const card = document.createElement("div");
      card.className = "upgrade-card" + (isCurrent ? " current" : isOwned ? " owned" : "");
      card.innerHTML = `
        <div class="uc-badge">${isOwned ? "Ã¢ÂÂ" : isCurrent ? "Ã¢ÂÂ¡" : "Ã°ÂÂÂ"}</div>
        <div class="uc-level">ÃÂ§ÃÂÃÂÃÂ³ÃÂªÃÂÃÂ ${u.level}</div>
        <div class="uc-value">${u.label}</div>
        <div class="uc-subsub">+${u.perSec.toFixed(6)} ÃÂ±/ÃÂ«</div>
        <div class="uc-cost">${u.cost === 0 ? "ÃÂÃÂ¬ÃÂ§ÃÂÃÂ" : u.cost + " ÃÂ±"}</div>
        <button class="uc-btn ${isCurrent ? "is-current" : isOwned ? "is-owned" : isNext && canAfford ? "buy" : isNext ? "no-funds" : "locked"}"
          data-type="power" data-level="${u.level}"
          ${!isNext || !canAfford || isCurrent || isOwned ? "disabled" : ""}>
          ${isCurrent ? "ÃÂ§ÃÂÃÂ­ÃÂ§ÃÂÃÂ Ã¢ÂÂ" : isOwned ? "ÃÂÃÂÃÂÃÂÃÂ" : isNext ? (canAfford ? "ÃÂªÃÂ±ÃÂÃÂÃÂ© Ã°ÂÂÂ" : "ÃÂ±ÃÂµÃÂÃÂ¯ ÃÂºÃÂÃÂ± ÃÂÃÂ§ÃÂÃÂ") : "Ã°ÂÂÂ ÃÂÃÂÃÂÃÂ"}
        </button>`;
      pc.appendChild(card);
    });

    // Duration
    const dc = $("duration-upgrades");
    dc.innerHTML = "";
    DURATION_UPGRADES.forEach(u => {
      const isOwned   = curDL >  u.level;
      const isCurrent = curDL === u.level;
      const isNext    = curDL === u.level - 1;
      const canAfford = bal >= u.cost;
      const card = document.createElement("div");
      card.className = "upgrade-card" + (isCurrent ? " current" : isOwned ? " owned" : "");
      card.innerHTML = `
        <div class="uc-badge">${isOwned ? "Ã¢ÂÂ" : isCurrent ? "Ã¢ÂÂ±" : "Ã°ÂÂÂ"}</div>
        <div class="uc-level">ÃÂ§ÃÂÃÂÃÂ³ÃÂªÃÂÃÂ ${u.level}</div>
        <div class="uc-value">${u.label}</div>
        <div class="uc-subsub">${u.hours * 60} ÃÂ¯ÃÂÃÂÃÂÃÂ© ÃÂÃÂ³ÃÂªÃÂÃÂ±ÃÂ©</div>
        <div class="uc-cost">${u.cost === 0 ? "ÃÂÃÂ¬ÃÂ§ÃÂÃÂ" : u.cost + " ÃÂ±"}</div>
        <button class="uc-btn ${isCurrent ? "is-current" : isOwned ? "is-owned" : isNext && canAfford ? "buy" : isNext ? "no-funds" : "locked"}"
          data-type="duration" data-level="${u.level}"
          ${!isNext || !canAfford || isCurrent || isOwned ? "disabled" : ""}>
          ${isCurrent ? "ÃÂ§ÃÂÃÂ­ÃÂ§ÃÂÃÂ Ã¢ÂÂ" : isOwned ? "ÃÂÃÂÃÂÃÂÃÂ" : isNext ? (canAfford ? "ÃÂªÃÂ±ÃÂÃÂÃÂ© Ã°ÂÂÂ" : "ÃÂ±ÃÂµÃÂÃÂ¯ ÃÂºÃÂÃÂ± ÃÂÃÂ§ÃÂÃÂ") : "Ã°ÂÂÂ ÃÂÃÂÃÂÃÂ"}
        </button>`;
      dc.appendChild(card);
    });

    document.querySelectorAll(".uc-btn.buy").forEach(btn => {
      btn.addEventListener("click", () => purchaseUpgrade(btn.dataset.type, parseInt(btn.dataset.level)));
    });
  }

  async function purchaseUpgrade(type, level) {
    if (!currentUser || !userData) return;
    const list    = type === "power" ? POWER_UPGRADES : DURATION_UPGRADES;
    const upgrade = list.find(u => u.level === level);
    if (!upgrade) return;
    const bal = userData.balance || 0;
    if (bal < upgrade.cost) { showToast("ÃÂ±ÃÂµÃÂÃÂ¯ ÃÂºÃÂÃÂ± ÃÂÃÂ§ÃÂÃÂ Ã¢ÂÂ", "err"); return; }
    const newBal = Math.round((bal - upgrade.cost) * 1_000_000) / 1_000_000;
    const upd = { balance: newBal };
    if (type === "power") {
      upd.miningPower      = upgrade.power;
      upd.miningPowerLevel = level;
    } else {
      upd.maxMiningDuration      = upgrade.hours;
      upd.miningDurationLevel    = level;
    }
    try {
      await update(ref(db, `users/${currentUser.uid}`), upd);
      showToast(`Ã¢ÂÂ ÃÂªÃÂÃÂª ÃÂ§ÃÂÃÂªÃÂ±ÃÂÃÂÃÂ© ÃÂ¥ÃÂÃÂ ÃÂ§ÃÂÃÂÃÂ³ÃÂªÃÂÃÂ ${level}!`);
      renderUpgrades();
    } catch (e) {
      showToast("ÃÂ®ÃÂ·ÃÂ£: " + e.message, "err");
    }
  }

  // Ã¢ÂÂÃ¢ÂÂ Profile Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function loadProfile() {
    if (!currentUser || !userData) return;
    const set = (id, val) => { const el = $(id); if(el) el.textContent = val; };
    const setS = (id, s)  => { const el = $(id); if(el) el.src = s; };
    setS("profile-photo", userData.photoURL || "");
    set("profile-username",  userData.username || "");
    set("profile-email",     currentUser.email || "");
    set("profile-balance",   (userData.balance    || 0).toFixed(6) + " ÃÂ±");
    set("profile-total",     (userData.totalMined || 0).toFixed(6) + " ÃÂ±");
    set("profile-power",     (userData.miningPower || 1) + " ÃÂ±/ÃÂ³ÃÂ§ÃÂ¹ÃÂ©");
    set("profile-duration",  (userData.maxMiningDuration || 3) + " ÃÂ³ÃÂ§ÃÂ¹ÃÂ§ÃÂª");
    set("profile-power-level",  "ÃÂ§ÃÂÃÂÃÂ³ÃÂªÃÂÃÂ " + (userData.miningPowerLevel    || 1));
    set("profile-dur-level",    "ÃÂ§ÃÂÃÂÃÂ³ÃÂªÃÂÃÂ " + (userData.miningDurationLevel || 1));
    const lc = userData.lastClaimTime;
    set("profile-last-claim", lc ? new Date(lc).toLocaleString("ar-SA") : "Ã¢ÂÂ");
    const { perSec } = calcMining();
    set("profile-per-sec", "+" + perSec.toFixed(8) + " ÃÂ±/ÃÂ«");
  }
  

  // ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PRICE CARDS â user side
  // ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  const CARD_COLORS_USER = {
    gold:   { bg:"linear-gradient(135deg,#1a1505,#2a2008)", border:"#f0b429", accent:"#f0b429" },
    blue:   { bg:"linear-gradient(135deg,#050d1a,#08163a)", border:"#00d4ff", accent:"#00d4ff" },
    green:  { bg:"linear-gradient(135deg,#051a0d,#072a12)", border:"#22c55e", accent:"#22c55e" },
    purple: { bg:"linear-gradient(135deg,#120518,#1c0830)", border:"#a855f7", accent:"#a855f7" },
    red:    { bg:"linear-gradient(135deg,#1a0505,#2a0808)", border:"#ef4444", accent:"#ef4444" },
  };

  let allCardsData = {};
  let cardTimers   = {};

  // Listen to cards in Firebase
  function listenCards() {
    const { onValue: ov, ref: r } = window.__fbImports || {};
    if (!ov) return;
    ov(r(db, "cards"), snap => {
      allCardsData = {};
      if (snap.exists()) snap.forEach(c => { allCardsData[c.key] = c.val(); });
      renderUserCards();
    });
  }

  function renderUserCards() {
    if (!currentUser) return;
    const now     = Date.now();
    const uid     = currentUser.uid;
    const section = document.getElementById("cards-section");
    const list    = document.getElementById("active-cards-list");
    if (!section || !list) return;

    const activeCards = Object.entries(allCardsData).filter(([, c]) => {
      const uses  = c.claimedBy ? Object.keys(c.claimedBy).length : 0;
      const maxU  = c.maxUses || 0;
      return c.isActive &&
             (c.startTime || 0) <= now &&
             (c.endTime   || Infinity) >= now &&
             (maxU === 0 || uses < maxU);
    });

    if (!activeCards.length) { section.style.display = "none"; return; }
    section.style.display = "block";

    // Clear old timers
    Object.values(cardTimers).forEach(t => clearInterval(t));
    cardTimers = {};

    list.innerHTML = `<div class="cards-grid">${activeCards.map(([id, c]) => {
      const col      = CARD_COLORS_USER[c.color || "gold"];
      const claimed  = c.claimedBy && c.claimedBy[uid];
      const uses     = c.claimedBy ? Object.keys(c.claimedBy).length : 0;
      const maxU     = c.maxUses || 0;
      const full     = maxU > 0 && uses >= maxU;
      return `<div class="price-card ${claimed?"claimed":full?"inactive":"live"}"
        style="background:${col.bg};border-color:${col.border}">
        <div class="pc-glow" style="background:radial-gradient(circle,${col.accent}18,transparent 70%)"></div>
        <div class="pc-header">
          <span class="pc-icon">${c.icon||"ð"}</span>
          <span class="pc-status ${claimed?"claimed-badge":full?"off":"live"}">${claimed?"â ÙÙØ³ØªÙÙØ©":full?"ð ÙÙØªÙÙØ©":"â ÙØªØ§Ø­Ø©"}</span>
        </div>
        <div class="pc-title" style="color:${col.accent}">${c.title||"Ø¨Ø·Ø§ÙØ© Ø¹Ø±Ø¶"}</div>
        <div class="pc-desc">${c.description||""}</div>
        <div class="pc-reward" style="color:${col.accent}">+Î± ${(c.reward||0).toFixed(4)}</div>
        <div class="pc-timer" id="card-timer-${id}" style="color:${col.accent}88">â³ Ø¬Ø§Ø± Ø§ÙØªØ­ÙÙÙâ¦</div>
        <button class="pc-claim-btn ${claimed?"claimed":full?"full":""}"
          id="claim-card-${id}"
          onclick="claimCard('${id}')"
          ${claimed || full ? "disabled" : ""}>
          ${claimed?"â ØªÙ Ø§ÙØ§Ø³ØªÙØ§Ù":full?"ð Ø§ÙØªÙØª":"ð Ø§Ø­ØµÙ Ø¹ÙÙÙØ§ Ø§ÙØ¢Ù"}
        </button>
      </div>`;
    }).join("")}</div>`;

    // Start countdown timers for each active card
    activeCards.forEach(([id, c]) => {
      updateCardTimer(id, c.endTime);
      cardTimers[id] = setInterval(() => updateCardTimer(id, c.endTime), 1000);
    });
  }

  function updateCardTimer(id, endTime) {
    const el  = document.getElementById(`card-timer-${id}`);
    if (!el) { clearInterval(cardTimers[id]); return; }
    const rem = endTime - Date.now();
    if (rem <= 0) {
      el.textContent = "â Ø§ÙØªÙÙ Ø§ÙØ¹Ø±Ø¶";
      clearInterval(cardTimers[id]);
      renderUserCards();
      return;
    }
    const d = Math.floor(rem / 86400000);
    const h = Math.floor((rem % 86400000) / 3600000);
    const m = Math.floor((rem % 3600000)  / 60000);
    const s = Math.floor((rem % 60000)    / 1000);
    el.textContent = d > 0
      ? `â³ ${d} ÙÙÙ ${h} Ø³Ø§Ø¹Ø©`
      : `â³ ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }

  // Claim card
  window.claimCard = async (cardId) => {
    if (!currentUser || !userData) return;
    const card = allCardsData[cardId];
    if (!card) return;

    const btn    = document.getElementById(`claim-card-${cardId}`);
    const now    = Date.now();
    const uses   = card.claimedBy ? Object.keys(card.claimedBy).length : 0;
    const maxU   = card.maxUses || 0;
    const uid    = currentUser.uid;

    if (card.claimedBy && card.claimedBy[uid]) { showToast("Ø§Ø³ØªÙÙØª ÙØ°Ù Ø§ÙØ¨Ø·Ø§ÙØ© ÙÙ ÙØ¨Ù â","err"); return; }
    if (!card.isActive || now < (card.startTime||0) || now > (card.endTime||Infinity))
      { showToast("ÙØ°Ù Ø§ÙØ¨Ø·Ø§ÙØ© ØºÙØ± ÙØªØ§Ø­Ø© Ø§ÙØ¢Ù","err"); return; }
    if (maxU > 0 && uses >= maxU) { showToast("Ø§ÙØªÙØª ÙØ°Ù Ø§ÙØ¨Ø·Ø§ÙØ© ð","err"); return; }

    if (btn) { btn.disabled = true; btn.textContent = "Ø¬Ø§Ø± Ø§ÙØ§Ø³ØªÙØ§Ùâ¦"; }

    const newBal = Math.round(((userData.balance||0) + card.reward) * 1e6) / 1e6;
    try {
      await Promise.all([
        update(ref(db, `users/${uid}`), { balance: newBal }),
        update(ref(db, `cards/${cardId}/claimedBy`), { [uid]: true })
      ]);
      showToast(`+Î±${card.reward.toFixed(4)} ØªÙ Ø§Ø³ØªÙØ§Ù Ø§ÙØ¨Ø·Ø§ÙØ©! ð`);
      spawnRewardBurst(card.reward);
      if (btn) { btn.textContent = "â ØªÙ Ø§ÙØ§Ø³ØªÙØ§Ù"; btn.classList.add("claimed"); }
    } catch(e) {
      showToast("Ø®Ø·Ø£: "+e.message,"err");
      if (btn) { btn.disabled = false; btn.textContent = "ð Ø§Ø­ØµÙ Ø¹ÙÙÙØ§ Ø§ÙØ¢Ù"; }
    }
  };

  
    // Cards listener — triggered from existing onAuthStateChanged
    function startCardsListener() {
      onValue(ref(db, "cards"), snap => {
        allCardsData = {};
        if (snap.exists()) snap.forEach(c => { allCardsData[c.key] = c.val(); });
        renderUserCards();
      });
    }
    function clearCards() {
      Object.values(cardTimers).forEach(t => clearInterval(t));
      cardTimers = {};
      allCardsData = {};
      const section = document.getElementById("cards-section");
      if (section) section.style.display = "none";
    }
      