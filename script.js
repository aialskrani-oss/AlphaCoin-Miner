import { auth, db, ADMIN_USERNAME } from "./firebase-config.js";
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

  // ── DOM ────────────────────────────────────────────────────────
  const loadingEl      = document.getElementById("loading");
  const authScreen     = document.getElementById("auth-screen");
  const gameContainer  = document.getElementById("game-container");
  const googleLoginBtn = document.getElementById("google-login-btn");
  const authErr        = document.getElementById("auth-err");
  const userNameEl     = document.getElementById("user-name");
  const userPhotoEl    = document.getElementById("user-photo");
  const logoutBtn      = document.getElementById("logout-btn");
  const balanceEl      = document.getElementById("balance");
  const totalMinedEl   = document.getElementById("total-mined");
  const dailyCountEl   = document.getElementById("daily-count");
  const minesLeftEl    = document.getElementById("mines-left");
  const mineBtn        = document.getElementById("mine-btn");
  const couponInp      = document.getElementById("coupon-code");
  const redeemBtn      = document.getElementById("redeem-btn");
  const couponMsgEl    = document.getElementById("coupon-msg");
  const toastEl        = document.getElementById("toast");
  const adminBtnWrap   = document.getElementById("admin-btn-wrap");

  // ── Particles ─────────────────────────────────────────────────
  (function () {
    const c = document.getElementById("particles");
    for (let i = 0; i < 22; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const s = Math.random() * 3 + 1;
      p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;top:${Math.random()*100+100}%;animation-duration:${Math.random()*15+10}s;animation-delay:${Math.random()*12}s;`;
      c.appendChild(p);
    }
  })();

  // ── Toast ──────────────────────────────────────────────────────
  let toastTimer;
  function showToast(msg, type = "ok") {
    toastEl.textContent = msg;
    toastEl.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.className = "toast"), 2800);
  }

  // ── Tabs ───────────────────────────────────────────────────────
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "profile") loadProfile();
    });
  });

  // ── State ──────────────────────────────────────────────────────
  let currentUser = null;
  let userData    = null;
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });

  // ── Auth state ─────────────────────────────────────────────────
  onAuthStateChanged(auth, async user => {
    loadingEl.style.display = "none";
    if (user) {
      currentUser = user;
      authScreen.style.display    = "none";
      gameContainer.style.display = "flex";
      await ensureUserRecord(user);
      listenUserData(user.uid);
    } else {
      currentUser = null;
      userData    = null;
      gameContainer.style.display = "none";
      authScreen.style.display    = "flex";
      resetLoginBtn();
    }
  });

  // ── Google Login ───────────────────────────────────────────────
  googleLoginBtn.addEventListener("click", async () => {
    googleLoginBtn.disabled    = true;
    googleLoginBtn.textContent = "جار الدخول…";
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
    googleLoginBtn.innerHTML =
      `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width="22"/> الدخول بحساب Google`;
  }

  function getErrMsg(e) {
    return ({
      "auth/popup-closed-by-user":    "أُغلقت نافذة الدخول — حاول مرة أخرى",
      "auth/popup-blocked":           "المتصفح حجب النافذة — اسمح بالنوافذ للموقع",
      "auth/cancelled-popup-request": "تم إلغاء الطلب",
      "auth/network-request-failed":  "خطأ في الاتصال بالإنترنت",
      "auth/user-disabled":           "هذا الحساب معطّل",
    })[e.code] || ("خطأ: " + (e.message || e.code));
  }

  logoutBtn.addEventListener("click", () => signOut(auth));

  // ── Ensure user record ─────────────────────────────────────────
  async function ensureUserRecord(user) {
    const snap = await get(ref(db, `users/${user.uid}`));
    if (!snap.exists()) {
      const raw   = user.displayName || user.email || user.uid;
      const uname = raw.split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase().slice(0, 20);
      await set(ref(db, `users/${user.uid}`), {
        username: uname, email: user.email || "",
        photoURL: user.photoURL || "", phone: "",
        balance: 0, totalMined: 0,
        lastMineDate: "", dailyMineCount: 0,
        createdAt: Date.now()
      });
    }
  }

  // ── Live user data ─────────────────────────────────────────────
  function listenUserData(uid) {
    onValue(ref(db, `users/${uid}`), snap => {
      if (!snap.exists()) return;
      userData = snap.val();
      updateBalanceUI();
      userNameEl.textContent = userData.username || "";
      if (userData.photoURL) {
        userPhotoEl.src = userData.photoURL;
        userPhotoEl.style.display = "block";
      }
      if (adminBtnWrap)
        adminBtnWrap.style.display =
          (currentUser?.email === ADMIN_EMAIL || userData.username === ADMIN_USERNAME)
            ? "block" : "none";
    });
  }

  // ── updateBalanceUI(newBalance?) ───────────────────────────────
  function updateBalanceUI(newBalance) {
    if (!userData) return;
    if (newBalance !== undefined) userData.balance = newBalance;
    const todayKey = todayStr();
    const sameDay  = userData.lastMineDate === todayKey;
    const count    = sameDay ? (userData.dailyMineCount || 0) : 0;
    const left     = Math.max(0, 50 - count);
    balanceEl.textContent    = (userData.balance    || 0).toFixed(4);
    totalMinedEl.textContent = (userData.totalMined || 0).toFixed(4);
    dailyCountEl.textContent = count;
    minesLeftEl.textContent  = left;
    mineBtn.disabled         = left <= 0;
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  // ── Mining ─────────────────────────────────────────────────────
  mineBtn.addEventListener("click", async () => {
    if (!currentUser || !userData) return;
    mineBtn.disabled = true;
    const todayKey = todayStr();
    const sameDay  = userData.lastMineDate === todayKey;
    const dailyC   = sameDay ? (userData.dailyMineCount || 0) : 0;
    if (dailyC >= 50) { showToast("وصلت للحد اليومي (50 عملية)", "err"); return; }
    const reward   = parseFloat((Math.random() * 0.9 + 0.1).toFixed(4));
    const newBal   = parseFloat(((userData.balance    || 0) + reward).toFixed(4));
    const newTotal = parseFloat(((userData.totalMined || 0) + reward).toFixed(4));
    try {
      await update(ref(db, `users/${currentUser.uid}`), {
        balance: newBal, totalMined: newTotal,
        lastMineDate: todayKey, dailyMineCount: dailyC + 1
      });
      spawnReward(`+α${reward.toFixed(4)}`);
      showToast(`+α${reward.toFixed(4)} تم التعدين! 🔥`);
    } catch (e) {
      showToast("خطأ: " + e.message, "err");
      mineBtn.disabled = false;
    }
  });

  function spawnReward(text) {
    const el = document.createElement("div");
    el.className   = "float-reward";
    el.textContent = text;
    const r = mineBtn.getBoundingClientRect();
    el.style.left  = r.left + r.width  / 2 - 60 + "px";
    el.style.top   = r.top  - 10 + "px";
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  // ── Coupon ─────────────────────────────────────────────────────
  redeemBtn.addEventListener("click", redeemCoupon);
  couponInp.addEventListener("keydown", e => { if (e.key === "Enter") redeemCoupon(); });

  async function redeemCoupon() {
    const code = couponInp.value.trim().toUpperCase();
    if (!code) { setCouponMsg("أدخل كود القسيمة أولاً", "err"); return; }
    if (!currentUser || !userData) return;
    redeemBtn.disabled = true;
    setCouponMsg("جار التحقق…", "");
    try {
      const cpSnap = await get(ref(db, `coupons/${code}`));
      if (!cpSnap.exists())  { setCouponMsg("❌ القسيمة غير موجودة", "err"); return; }
      const cp = cpSnap.val();
      if (!cp.isActive)      { setCouponMsg("❌ القسيمة غير نشطة", "err"); return; }
      const usedBy = cp.usedBy && typeof cp.usedBy === "object" ? cp.usedBy : {};
      if (usedBy[currentUser.uid]) { setCouponMsg("❌ استخدمت هذه القسيمة من قبل", "err"); return; }
      const newBal = parseFloat(((userData.balance || 0) + cp.rewardAmount).toFixed(4));
      await update(ref(db, `users/${currentUser.uid}`), { balance: newBal });
      await update(ref(db, `coupons/${code}/usedBy`), { [currentUser.uid]: true });
      setCouponMsg(`✅ تم! +α${cp.rewardAmount}`, "ok");
      couponInp.value = "";
      showToast(`+α${cp.rewardAmount} تم استبدال القسيمة! 🎉`);
    } catch (e) {
      setCouponMsg("خطأ: " + e.message, "err");
    } finally {
      redeemBtn.disabled = false;
    }
  }

  function setCouponMsg(m, t) {
    couponMsgEl.textContent = m;
    couponMsgEl.className   = "coupon-msg " + t;
  }

  // ── loadProfile() ──────────────────────────────────────────────
  async function loadProfile() {
    if (!currentUser || !userData) return;
    const photoEl    = document.getElementById("profile-photo");
    const fallbackEl = document.getElementById("profile-avatar-fallback");
    if (userData.photoURL) {
      photoEl.src = userData.photoURL;
      photoEl.style.display    = "block";
      fallbackEl.style.display = "none";
    }
    document.getElementById("profile-name").textContent    = userData.username || currentUser.displayName || "";
    document.getElementById("profile-email").textContent   = userData.email    || currentUser.email       || "";
    document.getElementById("profile-balance").textContent = (userData.balance    || 0).toFixed(4);
    document.getElementById("profile-total").textContent   = (userData.totalMined || 0).toFixed(4);
    const count = userData.lastMineDate === todayStr() ? (userData.dailyMineCount || 0) : 0;
    document.getElementById("profile-daily").textContent   = `${count}/50`;
    try {
      const snap = await get(ref(db, "users"));
      if (snap.exists()) {
        const arr = [];
        snap.forEach(c => arr.push({ uid: c.key, bal: c.val().balance || 0 }));
        arr.sort((a, b) => b.bal - a.bal);
        const idx = arr.findIndex(u => u.uid === currentUser.uid);
        document.getElementById("profile-rank").textContent = idx >= 0 ? `#${idx + 1}` : "-";
      }
    } catch {}
  }
  