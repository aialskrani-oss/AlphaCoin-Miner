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

  // Mining Power Upgrades config
  const POWER_UPGRADES = [
    { level: 1, power: 1,  label: "1 α/ساعة",  cost: 0 },
    { level: 2, power: 2,  label: "2 α/ساعة",  cost: 100 },
    { level: 3, power: 3,  label: "3 α/ساعة",  cost: 300 },
    { level: 4, power: 5,  label: "5 α/ساعة",  cost: 800 },
    { level: 5, power: 8,  label: "8 α/ساعة",  cost: 2000 }
  ];

  // Duration Upgrades config
  const DURATION_UPGRADES = [
    { level: 1, hours: 3,  label: "3 ساعات",  cost: 0 },
    { level: 2, hours: 6,  label: "6 ساعات",  cost: 200 },
    { level: 3, hours: 12, label: "12 ساعة",  cost: 600 },
    { level: 4, hours: 24, label: "24 ساعة",  cost: 1500 }
  ];

  // DOM
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
  const toastEl        = document.getElementById("toast");
  const adminBtnWrap   = document.getElementById("admin-btn-wrap");
  const claimBtn       = document.getElementById("claim-btn");
  const couponInp      = document.getElementById("coupon-code");
  const redeemBtn      = document.getElementById("redeem-btn");
  const couponMsgEl    = document.getElementById("coupon-msg");

  // Particles
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

  // Toast
  let toastTimer;
  function showToast(msg, type = "ok") {
    toastEl.textContent = msg;
    toastEl.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.className = "toast"), 2800);
  }

  // Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "profile") loadProfile();
      if (btn.dataset.tab === "upgrades") renderUpgrades();
    });
  });

  // State
  let currentUser = null;
  let userData    = null;
  let miningTimer = null;
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });

  // Auth
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
      stopMiningTimer();
      gameContainer.style.display = "none";
      authScreen.style.display    = "flex";
      resetLoginBtn();
    }
  });

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

  // Ensure user record
  async function ensureUserRecord(user) {
    const snap = await get(ref(db, `users/${user.uid}`));
    const now  = Date.now();
    if (!snap.exists()) {
      const raw   = user.displayName || user.email || user.uid;
      const uname = raw.split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase().slice(0, 20);
      await set(ref(db, `users/${user.uid}`), {
        username: uname, email: user.email || "",
        photoURL: user.photoURL || "", phone: "",
        balance: 0, totalMined: 0,
        miningPower: 1, maxMiningDuration: 3,
        miningPowerLevel: 1, miningDurationLevel: 1,
        miningStartTime: now, lastClaimTime: now,
        createdAt: now
      });
    } else {
      // Patch missing mining fields for existing users
      const d = snap.val();
      const patch = {};
      if (d.miningPower        == null) patch.miningPower        = 1;
      if (d.maxMiningDuration  == null) patch.maxMiningDuration  = 3;
      if (d.miningPowerLevel   == null) patch.miningPowerLevel   = 1;
      if (d.miningDurationLevel == null) patch.miningDurationLevel = 1;
      if (d.miningStartTime    == null) patch.miningStartTime    = now;
      if (d.lastClaimTime      == null) patch.lastClaimTime      = now;
      if (Object.keys(patch).length > 0) {
        await update(ref(db, `users/${user.uid}`), patch);
      }
    }
  }

  // Live user data listener
  function listenUserData(uid) {
    onValue(ref(db, `users/${uid}`), snap => {
      if (!snap.exists()) return;
      userData = snap.val();
      updateMainUI();
      userNameEl.textContent = userData.username || "";
      if (userData.photoURL) {
        userPhotoEl.src = userData.photoURL;
        userPhotoEl.style.display = "block";
      }
      if (adminBtnWrap)
        adminBtnWrap.style.display = (currentUser?.email === ADMIN_EMAIL) ? "block" : "none";
      startMiningTimer();
    });
  }

  // Update main balance UI
  function updateMainUI() {
    if (!userData) return;
    balanceEl.textContent    = (userData.balance    || 0).toFixed(4);
    totalMinedEl.textContent = (userData.totalMined || 0).toFixed(4);
    const power = userData.miningPower || 1;
    document.getElementById("mining-power-display").textContent = power;
    document.getElementById("mine-rate").textContent = power + " α/ساعة";
    document.getElementById("upgrade-balance").textContent = (userData.balance || 0).toFixed(4);
  }

  // ─── Auto-Mining Timer ────────────────────────────────────────
  function stopMiningTimer() {
    if (miningTimer) { clearInterval(miningTimer); miningTimer = null; }
  }

  function startMiningTimer() {
    stopMiningTimer();
    updateMiningUI();
    miningTimer = setInterval(updateMiningUI, 1000);
  }

  function calcMining() {
    if (!userData) return { pending: 0, elapsedHours: 0, maxHours: 3, isActive: false, remainingSec: 0 };
    const now       = Date.now();
    const lastClaim = userData.lastClaimTime  || now;
    const power     = userData.miningPower    || 1;
    const maxHours  = userData.maxMiningDuration || 3;
    const elapsedMs = now - lastClaim;
    const maxMs     = maxHours * 3600 * 1000;
    const effectiveMs = Math.min(elapsedMs, maxMs);
    const elapsedHours = effectiveMs / 3600000;
    const pending   = parseFloat((elapsedHours * power).toFixed(4));
    const isActive  = elapsedMs < maxMs;
    const remainingSec = isActive ? Math.floor((maxMs - elapsedMs) / 1000) : 0;
    return { pending, elapsedHours, maxHours, isActive, remainingSec, elapsedMs, maxMs };
  }

  function formatTime(sec) {
    if (sec <= 0) return "00:00:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }

  function updateMiningUI() {
    const { pending, elapsedHours, maxHours, isActive, remainingSec } = calcMining();
    const pct = Math.min(100, (elapsedHours / maxHours) * 100);

    document.getElementById("pending-earnings").textContent = pending.toFixed(4);
    document.getElementById("mine-progress-fill").style.width = pct + "%";
    document.getElementById("mine-time-text").textContent =
      elapsedHours.toFixed(2) + " / " + maxHours + " ساعات";

    if (isActive) {
      document.getElementById("mine-status-title").textContent = "التعدين نشط ✅";
      document.getElementById("mine-status-sub").textContent = "يتم تعدين العملات تلقائياً";
      document.getElementById("mine-badge").textContent = "نشط";
      document.getElementById("mine-badge").className = "auto-mine-badge active";
      document.getElementById("mine-status-icon").textContent = "⛏";
      document.getElementById("time-remaining").textContent = formatTime(remainingSec);
      claimBtn.disabled = false;
    } else {
      document.getElementById("mine-status-title").textContent = "التعدين متوقف ⏸";
      document.getElementById("mine-status-sub").textContent = "اجنِ الأرباح لإعادة التشغيل";
      document.getElementById("mine-badge").textContent = "متوقف";
      document.getElementById("mine-badge").className = "auto-mine-badge stopped";
      document.getElementById("mine-status-icon").textContent = "⏸";
      document.getElementById("time-remaining").textContent = "00:00:00";
      claimBtn.disabled = pending <= 0;
    }
  }

  // ─── Claim earnings ───────────────────────────────────────────
  claimBtn.addEventListener("click", async () => {
    if (!currentUser || !userData) return;
    const { pending } = calcMining();
    if (pending <= 0) { showToast("لا توجد أرباح لجنيها بعد", "err"); return; }
    claimBtn.disabled = true;
    const now      = Date.now();
    const newBal   = parseFloat(((userData.balance   || 0) + pending).toFixed(4));
    const newTotal = parseFloat(((userData.totalMined || 0) + pending).toFixed(4));
    try {
      await update(ref(db, `users/${currentUser.uid}`), {
        balance: newBal,
        totalMined: newTotal,
        lastClaimTime: now,
        miningStartTime: now
      });
      showToast(`+α${pending.toFixed(4)} تم جني الأرباح! 💰`);
      spawnReward(`+α${pending.toFixed(4)}`);
    } catch (e) {
      showToast("خطأ: " + e.message, "err");
      claimBtn.disabled = false;
    }
  });

  function spawnReward(text) {
    const el = document.createElement("div");
    el.className   = "float-reward";
    el.textContent = text;
    el.style.left  = "50%";
    el.style.top   = "40%";
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  // ─── Coupon ───────────────────────────────────────────────────
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

  // ─── Upgrades ─────────────────────────────────────────────────
  function renderUpgrades() {
    if (!userData) return;
    const currentPowerLevel    = userData.miningPowerLevel    || 1;
    const currentDurationLevel = userData.miningDurationLevel || 1;
    const balance              = userData.balance || 0;

    // Power upgrades
    const powerContainer = document.getElementById("power-upgrades");
    powerContainer.innerHTML = "";
    POWER_UPGRADES.forEach(u => {
      const isOwned    = currentPowerLevel >= u.level;
      const isCurrent  = currentPowerLevel === u.level;
      const isNext     = currentPowerLevel === u.level - 1;
      const canAfford  = balance >= u.cost;
      const card       = document.createElement("div");
      card.className   = "upgrade-card" + (isCurrent ? " current" : "") + (isOwned && !isCurrent ? " owned" : "");
      card.innerHTML   = `
        <div class="uc-level">المستوى ${u.level}</div>
        <div class="uc-value">${u.label}</div>
        <div class="uc-cost">${u.cost === 0 ? "مجاني" : u.cost + " α"}</div>
        <button class="uc-btn ${isCurrent ? "current" : isOwned ? "owned" : isNext && canAfford ? "buy" : isNext ? "no-funds" : "locked"}"
          data-type="power" data-level="${u.level}"
          ${isCurrent || isOwned || !isNext || !canAfford ? "disabled" : ""}>
          ${isCurrent ? "✅ الحالي" : isOwned ? "مملوك" : isNext ? (canAfford ? "ترقية 🚀" : "رصيد غير كافٍ") : "🔒 مقفل"}
        </button>`;
      powerContainer.appendChild(card);
    });

    // Duration upgrades
    const durContainer = document.getElementById("duration-upgrades");
    durContainer.innerHTML = "";
    DURATION_UPGRADES.forEach(u => {
      const isOwned    = currentDurationLevel >= u.level;
      const isCurrent  = currentDurationLevel === u.level;
      const isNext     = currentDurationLevel === u.level - 1;
      const canAfford  = balance >= u.cost;
      const card       = document.createElement("div");
      card.className   = "upgrade-card" + (isCurrent ? " current" : "") + (isOwned && !isCurrent ? " owned" : "");
      card.innerHTML   = `
        <div class="uc-level">المستوى ${u.level}</div>
        <div class="uc-value">${u.label}</div>
        <div class="uc-cost">${u.cost === 0 ? "مجاني" : u.cost + " α"}</div>
        <button class="uc-btn ${isCurrent ? "current" : isOwned ? "owned" : isNext && canAfford ? "buy" : isNext ? "no-funds" : "locked"}"
          data-type="duration" data-level="${u.level}"
          ${isCurrent || isOwned || !isNext || !canAfford ? "disabled" : ""}>
          ${isCurrent ? "✅ الحالي" : isOwned ? "مملوك" : isNext ? (canAfford ? "ترقية 🚀" : "رصيد غير كافٍ") : "🔒 مقفل"}
        </button>`;
      durContainer.appendChild(card);
    });

    // Attach buy events
    document.querySelectorAll(".uc-btn.buy").forEach(btn => {
      btn.addEventListener("click", () => purchaseUpgrade(btn.dataset.type, parseInt(btn.dataset.level)));
    });
  }

  async function purchaseUpgrade(type, level) {
    if (!currentUser || !userData) return;
    const upgrades    = type === "power" ? POWER_UPGRADES : DURATION_UPGRADES;
    const upgrade     = upgrades.find(u => u.level === level);
    if (!upgrade)     return;
    const balance     = userData.balance || 0;
    if (balance < upgrade.cost) { showToast("رصيد غير كافٍ", "err"); return; }
    const newBalance  = parseFloat((balance - upgrade.cost).toFixed(4));
    const updates     = { balance: newBalance };
    if (type === "power") {
      updates.miningPower      = upgrade.power;
      updates.miningPowerLevel = level;
    } else {
      updates.maxMiningDuration      = upgrade.hours;
      updates.miningDurationLevel    = level;
    }
    try {
      await update(ref(db, `users/${currentUser.uid}`), updates);
      showToast(`✅ تمت الترقية إلى المستوى ${level}!`);
      renderUpgrades();
    } catch (e) {
      showToast("خطأ: " + e.message, "err");
    }
  }

  // ─── Profile ──────────────────────────────────────────────────
  function loadProfile() {
    if (!currentUser || !userData) return;
    document.getElementById("profile-photo").src         = userData.photoURL || "";
    document.getElementById("profile-username").textContent = userData.username || "";
    document.getElementById("profile-email").textContent = currentUser.email || "";
    document.getElementById("profile-balance").textContent = (userData.balance || 0).toFixed(4) + " α";
    document.getElementById("profile-total").textContent   = (userData.totalMined || 0).toFixed(4) + " α";
    document.getElementById("profile-power").textContent   = (userData.miningPower || 1) + " α/ساعة";
    document.getElementById("profile-duration").textContent = (userData.maxMiningDuration || 3) + " ساعات";
    document.getElementById("profile-power-level").textContent = "المستوى " + (userData.miningPowerLevel || 1);
    const lastClaim = userData.lastClaimTime;
    document.getElementById("profile-last-claim").textContent = lastClaim
      ? new Date(lastClaim).toLocaleString("ar-SA")
      : "—";
  }
  