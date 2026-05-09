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
  const lbBody         = document.getElementById("leaderboard");
  const toastEl        = document.getElementById("toast");
  const adminBtnWrap   = document.getElementById("admin-btn-wrap");

  // ── VISIBLE DEBUG PANEL ────────────────────────────────────────
  const dbg = document.createElement("div");
  dbg.id = "dbg-panel";
  dbg.style.cssText = "position:fixed;top:0;left:0;right:0;background:#1a0a0a;color:#ff0;font-size:12px;padding:6px 10px;z-index:9999;max-height:160px;overflow-y:auto;border-bottom:2px solid red;direction:ltr;font-family:monospace";
  document.body.prepend(dbg);

  function dbgLog(msg) {
    const line = document.createElement("div");
    line.textContent = new Date().toISOString().slice(11,19) + " " + msg;
    dbg.insertBefore(line, dbg.firstChild);
    console.log("[DBG]", msg);
  }

  dbgLog("script.js loaded");

  // ── Particles ─────────────────────────────────────────────────
  (function () {
    const c = document.getElementById("particles");
    if (!c) return;
    for (let i = 0; i < 25; i++) {
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

  // ── App tabs ───────────────────────────────────────────────────
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "leaderboard") loadLeaderboard();
      if (btn.dataset.tab === "profile")     loadProfile();
    });
  });

  // ── State ──────────────────────────────────────────────────────
  let currentUser = null;
  let userData    = null;
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });

  // ── Auth state ─────────────────────────────────────────────────
  dbgLog("registering onAuthStateChanged...");
  onAuthStateChanged(auth, async user => {
    dbgLog("onAuthStateChanged fired: user=" + (user ? user.email : "NULL"));
    loadingEl.style.display = "none";
    if (user) {
      currentUser = user;
      dbgLog("showing game for: " + user.email);
      authScreen.style.display    = "none";
      gameContainer.style.display = "flex";
      await ensureUserRecord(user);
      listenUserData(user.uid);
    } else {
      dbgLog("NO USER — showing auth screen");
      currentUser = null;
      userData    = null;
      gameContainer.style.display = "none";
      authScreen.style.display    = "flex";
      resetLoginBtn();
    }
  });

  // ── Google Login ───────────────────────────────────────────────
  googleLoginBtn.addEventListener("click", async () => {
    dbgLog("login button clicked");
    googleLoginBtn.disabled    = true;
    googleLoginBtn.textContent = "جار الدخول…";
    authErr.textContent = "";
    try {
      dbgLog("calling setPersistence...");
      await setPersistence(auth, browserLocalPersistence);
      dbgLog("calling signInWithPopup...");
      const result = await signInWithPopup(auth, googleProvider);
      dbgLog("signInWithPopup SUCCESS: " + result.user.email);
      // onAuthStateChanged will now fire with the user
    } catch (e) {
      dbgLog("signInWithPopup ERROR: " + e.code + " — " + e.message);
      authErr.textContent = getErrMsg(e);
      authErr.style.color = "red";
      authErr.style.fontSize = "14px";
      resetLoginBtn();
    }
  });

  function resetLoginBtn() {
    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML =
      `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width="24"/> الدخول بحساب Google`;
  }

  function getErrMsg(e) {
    return {
      "auth/popup-closed-by-user":    "أُغلقت نافذة الدخول",
      "auth/popup-blocked":           "المتصفح حجب النافذة",
      "auth/cancelled-popup-request": "تم إلغاء الطلب",
      "auth/network-request-failed":  "خطأ في الاتصال",
      "auth/user-disabled":           "الحساب معطّل",
      "auth/internal-error":          "خطأ Firebase داخلي",
      "auth/unauthorized-domain":     "الدومين غير مصرح في Firebase",
    }[e.code] || (e.code + ": " + e.message);
  }

  logoutBtn.addEventListener("click", () => signOut(auth));

  // ── Ensure user record ─────────────────────────────────────────
  async function ensureUserRecord(user) {
    dbgLog("ensureUserRecord for " + user.uid.slice(0,8));
    try {
      const snap = await get(ref(db, `users/${user.uid}`));
      if (!snap.exists()) {
        dbgLog("creating new user record...");
        const raw   = user.displayName || user.email || user.uid;
        const uname = raw.split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase().slice(0, 20);
        await set(ref(db, `users/${user.uid}`), {
          username: uname, email: user.email || "",
          photoURL: user.photoURL || "", phone: "",
          balance: 0, totalMined: 0,
          lastMineDate: "", dailyMineCount: 0,
          createdAt: Date.now()
        });
        dbgLog("user record created OK");
      } else {
        dbgLog("user record exists OK");
      }
    } catch(e) {
      dbgLog("ensureUserRecord ERROR: " + e.message);
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
    if (dailyC >= 50) { showToast("وصلت للحد اليومي", "err"); return; }
    const reward   = parseFloat((Math.random() * 0.9 + 0.1).toFixed(4));
    const newBal   = parseFloat(((userData.balance    || 0) + reward).toFixed(4));
    const newTotal = parseFloat(((userData.totalMined || 0) + reward).toFixed(4));
    try {
      await update(ref(db, `users/${currentUser.uid}`), {
        balance: newBal, totalMined: newTotal,
        lastMineDate: todayKey, dailyMineCount: dailyC + 1
      });
      spawnReward(`+α${reward.toFixed(4)}`);
      showToast(`+α${reward.toFixed(4)} تم التعدين!`);
    } catch (e) {
      showToast("خطأ: " + e.message, "err");
      mineBtn.disabled = false;
    }
  });

  function spawnReward(text) {
    const el = document.createElement("div");
    el.className = "float-reward";
    el.textContent = text;
    const r = mineBtn.getBoundingClientRect();
    el.style.left = r.left + r.width / 2 - 55 + "px";
    el.style.top  = r.top - 10 + "px";
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  // ── Coupon ─────────────────────────────────────────────────────
  redeemBtn.addEventListener("click", redeemCoupon);
  couponInp.addEventListener("keydown", e => { if (e.key === "Enter") redeemCoupon(); });

  async function redeemCoupon() {
    const code = couponInp.value.trim().toUpperCase();
    if (!code) { setCouponMsg("أدخل كود القسيمة", "err"); return; }
    if (!currentUser || !userData) return;
    redeemBtn.disabled = true;
    setCouponMsg("جار التحقق…", "");
    try {
      const cpSnap = await get(ref(db, `coupons/${code}`));
      if (!cpSnap.exists())  { setCouponMsg("غير موجودة", "err"); return; }
      const cp = cpSnap.val();
      if (!cp.isActive)      { setCouponMsg("غير نشطة", "err"); return; }
      const usedBy = cp.usedBy && typeof cp.usedBy === "object" ? cp.usedBy : {};
      if (usedBy[currentUser.uid]) { setCouponMsg("استخدمتها مسبقاً", "err"); return; }
      const newBal = parseFloat(((userData.balance || 0) + cp.rewardAmount).toFixed(4));
      await update(ref(db, `users/${currentUser.uid}`), { balance: newBal });
      await update(ref(db, `coupons/${code}/usedBy`), { [currentUser.uid]: true });
      setCouponMsg(`تم! +α${cp.rewardAmount} 🎉`, "ok");
      couponInp.value = "";
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

  async function loadLeaderboard() {
    lbBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:#555">جار التحميل…</td></tr>`;
    try {
      const snap = await get(ref(db, "users"));
      if (!snap.exists()) { lbBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:1rem;color:#555">لا يوجد مستخدمون</td></tr>`; return; }
      const users = [];
      snap.forEach(c => users.push({ uid: c.key, ...c.val() }));
      users.sort((a, b) => (b.balance || 0) - (a.balance || 0));
      lbBody.innerHTML = users.map((u, i) => {
        const rank = i + 1;
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
        const isYou = currentUser && u.uid === currentUser.uid;
        return `<tr class="${isYou?"lb-you":""}"><td><span class="lb-rank ${rank<=3?"r"+rank:""}">${medal}</span></td>
          <td>⚡ ${u.username||"مجهول"}${isYou?" <span style='color:var(--gold);font-size:.75rem'>(أنت)</span>":""}</td>
          <td><span class="lb-balance">α${(u.balance||0).toFixed(4)}</span></td>
          <td style="color:#888">α${(u.totalMined||0).toFixed(4)}</td></tr>`;
      }).join("");
    } catch (e) { lbBody.innerHTML = `<tr><td colspan="4" style="color:red;text-align:center">${e.message}</td></tr>`; }
  }

  async function loadProfile() {
    if (!currentUser || !userData) return;
    const photoEl = document.getElementById("profile-photo");
    const fallbackEl = document.getElementById("profile-avatar-fallback");
    if (userData.photoURL) { photoEl.src = userData.photoURL; photoEl.style.display = "block"; fallbackEl.style.display = "none"; }
    document.getElementById("profile-name").textContent    = userData.username || "";
    document.getElementById("profile-email").textContent   = userData.email || "";
    document.getElementById("profile-balance").textContent = (userData.balance||0).toFixed(4);
    document.getElementById("profile-total").textContent   = (userData.totalMined||0).toFixed(4);
    const count = userData.lastMineDate === todayStr() ? (userData.dailyMineCount||0) : 0;
    document.getElementById("profile-daily").textContent = `${count}/50`;
    try {
      const snap = await get(ref(db, "users"));
      if (snap.exists()) {
        const arr = []; snap.forEach(c => arr.push({ uid: c.key, bal: c.val().balance||0 }));
        arr.sort((a,b) => b.bal - a.bal);
        const idx = arr.findIndex(u => u.uid === currentUser.uid);
        document.getElementById("profile-rank").textContent = idx >= 0 ? `#${idx+1}` : "-";
      }
    } catch {}
  }
  