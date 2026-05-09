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

  // ── Upgrade configs ───────────────────────────────────────────
  const POWER_UPGRADES = [
    { level: 1, power: 1,  label: "1 α/ساعة",  perSec: (1/3600),  cost: 0 },
    { level: 2, power: 2,  label: "2 α/ساعة",  perSec: (2/3600),  cost: 100 },
    { level: 3, power: 3,  label: "3 α/ساعة",  perSec: (3/3600),  cost: 300 },
    { level: 4, power: 5,  label: "5 α/ساعة",  perSec: (5/3600),  cost: 800 },
    { level: 5, power: 8,  label: "8 α/ساعة",  perSec: (8/3600),  cost: 2000 }
  ];
  const DURATION_UPGRADES = [
    { level: 1, hours: 3,  label: "3 ساعات",  cost: 0 },
    { level: 2, hours: 6,  label: "6 ساعات",  cost: 200 },
    { level: 3, hours: 12, label: "12 ساعة",  cost: 600 },
    { level: 4, hours: 24, label: "24 ساعة",  cost: 1500 }
  ];

  // ── DOM refs ──────────────────────────────────────────────────
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

  // ── Particles ─────────────────────────────────────────────────
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

  // ── Toast ──────────────────────────────────────────────────────
  let toastTimer;
  function showToast(msg, type = "ok") {
    toastEl.textContent = msg;
    toastEl.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.className = "toast"), 3000);
  }

  // ── Tabs ───────────────────────────────────────────────────────
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

  // ── State ──────────────────────────────────────────────────────
  let currentUser  = null;
  let userData     = null;
  let miningTimer  = null;
  let isClaiming   = false;
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });

  // ── Auth ───────────────────────────────────────────────────────
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
    googleLoginBtn.disabled = true;
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
    googleLoginBtn.innerHTML = `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width="22"/> الدخول بحساب Google`;
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

  // ── Live listener ──────────────────────────────────────────────
  function listenUserData(uid) {
    onValue(ref(db, `users/${uid}`), snap => {
      if (!snap.exists()) return;
      userData = snap.val();
      updateStaticUI();
      startMiningTimer();
    });
  }

  // ── Static UI updates (from DB data) ─────────────────────────
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

  // ── Mining calculations ────────────────────────────────────────
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

  // ── Timer ──────────────────────────────────────────────────────
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

    // Live pending display — 6 decimal places for real-time feel
    $("pending-earnings").textContent = pending.toFixed(6);
    $("mine-progress-fill").style.width = pct.toFixed(3) + "%";
    $("mine-time-text").textContent = elapsedHours.toFixed(4) + " / " + maxHours + " ساعات";
    $("mine-rate").textContent = (userData?.miningPower || 1) + " α/ساعة";

    // Per-second rate
    const perSecEl = $("per-sec-rate");
    if (perSecEl) perSecEl.textContent = "+" + perSec.toFixed(8) + " α/ثانية";

    if (isActive) {
      $("mine-status-title").textContent = "التعدين نشط ⛏";
      $("mine-status-sub").textContent   = "يتم تعدين العملات تلقائياً الآن";
      $("mine-badge").textContent        = "● نشط";
      $("mine-badge").className          = "auto-mine-badge active";
      $("time-remaining").textContent    = formatCountdown(remainingSec);
      claimBtn.disabled = isClaiming;
      claimBtn.className = "btn-claim";
    } else {
      $("mine-status-title").textContent = "اكتمل التعدين ✅";
      $("mine-status-sub").textContent   = "اجنِ الأرباح لإعادة تشغيل التعدين";
      $("mine-badge").textContent        = "⏸ مكتمل";
      $("mine-badge").className          = "auto-mine-badge stopped";
      $("time-remaining").textContent    = "00:00:00";
      claimBtn.disabled = isClaiming || pending <= 0;
      claimBtn.className = "btn-claim ready";
    }
  }

  // ── Claim ──────────────────────────────────────────────────────
  claimBtn.addEventListener("click", async () => {
    if (!currentUser || !userData || isClaiming) return;
    const { pending } = calcMining();
    if (pending < 0.000001) { showToast("لا توجد أرباح كافية بعد", "err"); return; }

    isClaiming = true;
    claimBtn.disabled = true;
    claimBtn.innerHTML = `<span class="claim-spinner"></span> جار الجني…`;

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
      claimBtn.innerHTML = `<span>💰 اجنِ الأرباح</span>`;
      showToast(`+α${earned.toFixed(6)} تم الجني! 💰`);
      spawnRewardBurst(earned);
    } catch (e) {
      showToast("خطأ: " + e.message, "err");
      claimBtn.innerHTML = `<span>💰 اجنِ الأرباح</span>`;
    } finally {
      isClaiming = false;
    }
  });

  // ── Reward burst animation ─────────────────────────────────────
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
    label.textContent = `+α${amount.toFixed(6)}`;
    label.style.cssText = "left:50%;top:42%;transform:translateX(-50%);position:fixed;z-index:9999;";
    document.body.appendChild(label);
    label.addEventListener("animationend", () => label.remove());
  }

  // ── Coupon ─────────────────────────────────────────────────────
  redeemBtn.addEventListener("click", redeemCoupon);
  couponInp.addEventListener("keydown", e => { if (e.key === "Enter") redeemCoupon(); });

  async function redeemCoupon() {
    const code = couponInp.value.trim().toUpperCase();
    if (!code)             { setCouponMsg("أدخل كود القسيمة أولاً", "err"); return; }
    if (!currentUser || !userData) return;
    redeemBtn.disabled = true;
    setCouponMsg("جار التحقق…", "");
    try {
      const cpSnap = await get(ref(db, `coupons/${code}`));
      if (!cpSnap.exists()) { setCouponMsg("❌ القسيمة غير موجودة", "err"); return; }
      const cp = cpSnap.val();
      if (!cp.isActive)     { setCouponMsg("❌ القسيمة غير نشطة", "err"); return; }
      const usedBy = cp.usedBy && typeof cp.usedBy === "object" ? cp.usedBy : {};
      if (usedBy[currentUser.uid]) { setCouponMsg("❌ استخدمت هذه القسيمة من قبل", "err"); return; }
      const newBal = Math.round(((userData.balance || 0) + cp.rewardAmount) * 1_000_000) / 1_000_000;
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

  // ── Upgrades ───────────────────────────────────────────────────
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
        <div class="uc-badge">${isOwned ? "✅" : isCurrent ? "⚡" : "🔒"}</div>
        <div class="uc-level">المستوى ${u.level}</div>
        <div class="uc-value">${u.label}</div>
        <div class="uc-subsub">+${u.perSec.toFixed(6)} α/ث</div>
        <div class="uc-cost">${u.cost === 0 ? "مجاني" : u.cost + " α"}</div>
        <button class="uc-btn ${isCurrent ? "is-current" : isOwned ? "is-owned" : isNext && canAfford ? "buy" : isNext ? "no-funds" : "locked"}"
          data-type="power" data-level="${u.level}"
          ${!isNext || !canAfford || isCurrent || isOwned ? "disabled" : ""}>
          ${isCurrent ? "الحالي ✅" : isOwned ? "مملوك" : isNext ? (canAfford ? "ترقية 🚀" : "رصيد غير كافٍ") : "🔒 مقفل"}
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
        <div class="uc-badge">${isOwned ? "✅" : isCurrent ? "⏱" : "🔒"}</div>
        <div class="uc-level">المستوى ${u.level}</div>
        <div class="uc-value">${u.label}</div>
        <div class="uc-subsub">${u.hours * 60} دقيقة مستمرة</div>
        <div class="uc-cost">${u.cost === 0 ? "مجاني" : u.cost + " α"}</div>
        <button class="uc-btn ${isCurrent ? "is-current" : isOwned ? "is-owned" : isNext && canAfford ? "buy" : isNext ? "no-funds" : "locked"}"
          data-type="duration" data-level="${u.level}"
          ${!isNext || !canAfford || isCurrent || isOwned ? "disabled" : ""}>
          ${isCurrent ? "الحالي ✅" : isOwned ? "مملوك" : isNext ? (canAfford ? "ترقية 🚀" : "رصيد غير كافٍ") : "🔒 مقفل"}
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
    if (bal < upgrade.cost) { showToast("رصيد غير كافٍ ❌", "err"); return; }
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
      showToast(`✅ تمت الترقية إلى المستوى ${level}!`);
      renderUpgrades();
    } catch (e) {
      showToast("خطأ: " + e.message, "err");
    }
  }

  // ── Profile ────────────────────────────────────────────────────
  function loadProfile() {
    if (!currentUser || !userData) return;
    const set = (id, val) => { const el = $(id); if(el) el.textContent = val; };
    const setS = (id, s)  => { const el = $(id); if(el) el.src = s; };
    setS("profile-photo", userData.photoURL || "");
    set("profile-username",  userData.username || "");
    set("profile-email",     currentUser.email || "");
    set("profile-balance",   (userData.balance    || 0).toFixed(6) + " α");
    set("profile-total",     (userData.totalMined || 0).toFixed(6) + " α");
    set("profile-power",     (userData.miningPower || 1) + " α/ساعة");
    set("profile-duration",  (userData.maxMiningDuration || 3) + " ساعات");
    set("profile-power-level",  "المستوى " + (userData.miningPowerLevel    || 1));
    set("profile-dur-level",    "المستوى " + (userData.miningDurationLevel || 1));
    const lc = userData.lastClaimTime;
    set("profile-last-claim", lc ? new Date(lc).toLocaleString("ar-SA") : "—");
    const { perSec } = calcMining();
    set("profile-per-sec", "+" + perSec.toFixed(8) + " α/ث");
  }
  