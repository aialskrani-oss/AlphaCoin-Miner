import { auth, db, ADMIN_USERNAME } from "./firebase-config.js";
  import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
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

  // ── Particles ─────────────────────────────────────────────────
  (function () {
    const c = document.getElementById("particles");
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

  function isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  // ── INIT: resolve redirect result first, then listen for auth ──
  async function init() {
    // Step 1: Check for a pending redirect result.
    // This MUST complete before we react to onAuthStateChanged,
    // otherwise we may see null-user briefly after a redirect login.
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        // Redirect sign-in succeeded — onAuthStateChanged will fire next
        console.log("Redirect OK:", result.user.email);
      }
    } catch (e) {
      console.error("Redirect error:", e.code, e.message);
      // Only show error when it's a real failure (not a fresh load)
      if (e.code && e.code !== "auth/no-redirect-operation") {
        loadingEl.style.display = "none";
        authScreen.style.display = "flex";
        authErr.textContent = getAuthErrMsg(e);
        resetLoginBtn();
      }
      return; // Stop here — auth will not proceed
    }

    // Step 2: Now listen for auth state changes
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
  }

  init();

  // ── Login button ───────────────────────────────────────────────
  googleLoginBtn.addEventListener("click", async () => {
    googleLoginBtn.disabled   = true;
    googleLoginBtn.textContent = "جار الدخول…";
    authErr.textContent = "";
    try {
      if (isMobile()) {
        // On mobile redirect is more reliable than popup
        await signInWithRedirect(auth, googleProvider);
        // Page will reload — nothing after this line runs
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (e) {
      console.error("Login error:", e.code, e.message);
      if (e.code === "auth/popup-blocked") {
        // Popup blocked → fall back to redirect
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      authErr.textContent = getAuthErrMsg(e);
      resetLoginBtn();
    }
  });

  function resetLoginBtn() {
    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML =
      `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width="24"/> الدخول بحساب Google`;
  }

  function getAuthErrMsg(e) {
    const map = {
      "auth/popup-closed-by-user":    "أُغلقت نافذة الدخول",
      "auth/cancelled-popup-request": "تم إلغاء الطلب",
      "auth/network-request-failed":  "خطأ في الاتصال",
      "auth/user-disabled":           "هذا الحساب معطّل",
      "auth/internal-error":          "خطأ داخلي — تحقق من إعدادات Firebase",
    };
    return map[e.code] || ("خطأ: " + (e.message || e.code));
  }

  logoutBtn.addEventListener("click", () => signOut(auth));

  // ── Ensure user record ─────────────────────────────────────────
  async function ensureUserRecord(user) {
    const snap = await get(ref(db, `users/${user.uid}`));
    if (!snap.exists()) {
      const raw   = user.displayName || user.email || user.uid;
      const uname = raw.split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase().slice(0, 20);
      await set(ref(db, `users/${user.uid}`), {
        username:       uname,
        email:          user.email    || "",
        photoURL:       user.photoURL || "",
        phone:          "",
        balance:        0,
        totalMined:     0,
        lastMineDate:   "",
        dailyMineCount: 0,
        createdAt:      Date.now()
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
        userPhotoEl.src           = userData.photoURL;
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

  // ── Date helper ────────────────────────────────────────────────
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
        balance:        newBal,
        totalMined:     newTotal,
        lastMineDate:   todayKey,
        dailyMineCount: dailyC + 1
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
    el.className   = "float-reward";
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
      if (!cpSnap.exists())  { setCouponMsg("القسيمة غير موجودة", "err"); return; }
      const cp = cpSnap.val();
      if (!cp.isActive)      { setCouponMsg("القسيمة غير نشطة", "err"); return; }
      const usedBy = cp.usedBy && typeof cp.usedBy === "object" ? cp.usedBy : {};
      if (usedBy[currentUser.uid]) { setCouponMsg("استخدمت هذه القسيمة من قبل", "err"); return; }
      const newBal = parseFloat(((userData.balance || 0) + cp.rewardAmount).toFixed(4));
      await update(ref(db, `users/${currentUser.uid}`), { balance: newBal });
      await update(ref(db, `coupons/${code}/usedBy`), { [currentUser.uid]: true });
      setCouponMsg(`تم! +α${cp.rewardAmount} 🎉`, "ok");
      couponInp.value = "";
      showToast(`+α${cp.rewardAmount} تم استبدال القسيمة!`);
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

  // ── loadLeaderboard() ──────────────────────────────────────────
  async function loadLeaderboard() {
    lbBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:#555">جار التحميل…</td></tr>`;
    try {
      const snap = await get(ref(db, "users"));
      if (!snap.exists()) {
        lbBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:#555">لا يوجد مستخدمون بعد</td></tr>`;
        return;
      }
      const users = [];
      snap.forEach(c => users.push({ uid: c.key, ...c.val() }));
      users.sort((a, b) => (b.balance || 0) - (a.balance || 0));
      lbBody.innerHTML = users.map((u, i) => {
        const rank  = i + 1;
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
        const cls   = rank <= 3 ? `r${rank}` : "";
        const isYou = currentUser && u.uid === currentUser.uid;
        return `<tr class="${isYou ? "lb-you" : ""}">
          <td><span class="lb-rank ${cls}">${medal}</span></td>
          <td><div class="lb-name-cell">⚡ ${u.username || "مجهول"}${isYou ? " <span style='color:var(--gold);font-size:.75rem'>(أنت)</span>" : ""}</div></td>
          <td><span class="lb-balance">α${(u.balance || 0).toFixed(4)}</span></td>
          <td style="color:#888">α${(u.totalMined || 0).toFixed(4)}</td>
        </tr>`;
      }).join("");
    } catch (e) {
      lbBody.innerHTML = `<tr><td colspan="4" style="color:var(--danger);text-align:center;padding:1rem">${e.message}</td></tr>`;
    }
  }

  // ── loadProfile() ──────────────────────────────────────────────
  async function loadProfile() {
    if (!currentUser || !userData) return;
    const photoEl    = document.getElementById("profile-photo");
    const fallbackEl = document.getElementById("profile-avatar-fallback");
    if (userData.photoURL) {
      photoEl.src              = userData.photoURL;
      photoEl.style.display    = "block";
      fallbackEl.style.display = "none";
    }
    document.getElementById("profile-name").textContent    = userData.username || currentUser.displayName || "";
    document.getElementById("profile-email").textContent   = userData.email    || currentUser.email       || "";
    document.getElementById("profile-balance").textContent = (userData.balance    || 0).toFixed(4);
    document.getElementById("profile-total").textContent   = (userData.totalMined || 0).toFixed(4);
    const count = userData.lastMineDate === todayStr() ? (userData.dailyMineCount || 0) : 0;
    document.getElementById("profile-daily").textContent = `${count}/50`;
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
  