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

  // ââ Upgrade configs âââââââââââââââââââââââââââââââââââââââââââ
  const POWER_UPGRADES = [
    { level: 1, power: 1,  label: "1 Î±/Ø³Ø§Ø¹Ø©",  perSec: (1/3600),  cost: 0 },
    { level: 2, power: 2,  label: "2 Î±/Ø³Ø§Ø¹Ø©",  perSec: (2/3600),  cost: 100 },
    { level: 3, power: 3,  label: "3 Î±/Ø³Ø§Ø¹Ø©",  perSec: (3/3600),  cost: 300 },
    { level: 4, power: 5,  label: "5 Î±/Ø³Ø§Ø¹Ø©",  perSec: (5/3600),  cost: 800 },
    { level: 5, power: 8,  label: "8 Î±/Ø³Ø§Ø¹Ø©",  perSec: (8/3600),  cost: 2000 }
  ];
  const DURATION_UPGRADES = [
    { level: 1, hours: 3,  label: "3 Ø³Ø§Ø¹Ø§Øª",  cost: 0 },
    { level: 2, hours: 6,  label: "6 Ø³Ø§Ø¹Ø§Øª",  cost: 200 },
    { level: 3, hours: 12, label: "12 Ø³Ø§Ø¹Ø©",  cost: 600 },
    { level: 4, hours: 24, label: "24 Ø³Ø§Ø¹Ø©",  cost: 1500 }
  ];

  // ââ DOM refs ââââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // ââ Particles âââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // ââ Toast ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  let toastTimer;
  function showToast(msg, type = "ok") {
    toastEl.textContent = msg;
    toastEl.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.className = "toast"), 3000);
  }

  // ââ Tabs âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // ââ State ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  let currentUser  = null;
  let userData     = null;
  let miningTimer  = null;
  let isClaiming   = false;
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });

  // ââ Auth âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
    googleLoginBtn.textContent = "Ø¬Ø§Ø± Ø§ÙØ¯Ø®ÙÙâ¦";
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
    googleLoginBtn.innerHTML = `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width="22"/> Ø§ÙØ¯Ø®ÙÙ Ø¨Ø­Ø³Ø§Ø¨ Google`;
  }

  function getErrMsg(e) {
    return ({
      "auth/popup-closed-by-user":    "Ø£ÙØºÙÙØª ÙØ§ÙØ°Ø© Ø§ÙØ¯Ø®ÙÙ â Ø­Ø§ÙÙ ÙØ±Ø© Ø£Ø®Ø±Ù",
      "auth/popup-blocked":           "Ø§ÙÙØªØµÙØ­ Ø­Ø¬Ø¨ Ø§ÙÙØ§ÙØ°Ø© â Ø§Ø³ÙØ­ Ø¨Ø§ÙÙÙØ§ÙØ° ÙÙÙÙÙØ¹",
      "auth/cancelled-popup-request": "ØªÙ Ø¥ÙØºØ§Ø¡ Ø§ÙØ·ÙØ¨",
      "auth/network-request-failed":  "Ø®Ø·Ø£ ÙÙ Ø§ÙØ§ØªØµØ§Ù Ø¨Ø§ÙØ¥ÙØªØ±ÙØª",
      "auth/user-disabled":           "ÙØ°Ø§ Ø§ÙØ­Ø³Ø§Ø¨ ÙØ¹Ø·ÙÙ",
    })[e.code] || ("Ø®Ø·Ø£: " + (e.message || e.code));
  }

  logoutBtn.addEventListener("click", () => signOut(auth));

  // ââ Ensure user record âââââââââââââââââââââââââââââââââââââââââ
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

  // ââ Live listener ââââââââââââââââââââââââââââââââââââââââââââââ
  function listenUserData(uid) {
    onValue(ref(db, `users/${uid}`), snap => {
      if (!snap.exists()) return;
      userData = snap.val();
      updateStaticUI();
      startMiningTimer();
    });
  }

  // ââ Static UI updates (from DB data) âââââââââââââââââââââââââ
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

  // ââ Mining calculations ââââââââââââââââââââââââââââââââââââââââ
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

  // ââ Timer ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

    // Live pending display â 6 decimal places for real-time feel
    $("pending-earnings").textContent = pending.toFixed(6);
    $("mine-progress-fill").style.width = pct.toFixed(3) + "%";
    $("mine-time-text").textContent = elapsedHours.toFixed(4) + " / " + maxHours + " Ø³Ø§Ø¹Ø§Øª";
    $("mine-rate").textContent = (userData?.miningPower || 1) + " Î±/Ø³Ø§Ø¹Ø©";

    // Per-second rate
    const perSecEl = $("per-sec-rate");
    if (perSecEl) perSecEl.textContent = "+" + perSec.toFixed(8) + " Î±/Ø«Ø§ÙÙØ©";

    if (isActive) {
      $("mine-status-title").textContent = "Ø§ÙØªØ¹Ø¯ÙÙ ÙØ´Ø· â";
      $("mine-status-sub").textContent   = "ÙØªÙ ØªØ¹Ø¯ÙÙ Ø§ÙØ¹ÙÙØ§Øª ØªÙÙØ§Ø¦ÙØ§Ù Ø§ÙØ¢Ù";
      $("mine-badge").textContent        = "â ÙØ´Ø·";
      $("mine-badge").className          = "auto-mine-badge active";
      $("time-remaining").textContent    = formatCountdown(remainingSec);
      claimBtn.disabled = isClaiming;
      claimBtn.className = "btn-claim";
    } else {
      $("mine-status-title").textContent = "Ø§ÙØªÙÙ Ø§ÙØªØ¹Ø¯ÙÙ â";
      $("mine-status-sub").textContent   = "Ø§Ø¬ÙÙ Ø§ÙØ£Ø±Ø¨Ø§Ø­ ÙØ¥Ø¹Ø§Ø¯Ø© ØªØ´ØºÙÙ Ø§ÙØªØ¹Ø¯ÙÙ";
      $("mine-badge").textContent        = "â¸ ÙÙØªÙÙ";
      $("mine-badge").className          = "auto-mine-badge stopped";
      $("time-remaining").textContent    = "00:00:00";
      claimBtn.disabled = isClaiming || pending <= 0;
      claimBtn.className = "btn-claim ready";
    }
  }

  // ââ Claim ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  claimBtn.addEventListener("click", async () => {
    if (!currentUser || !userData || isClaiming) return;
    const { pending } = calcMining();
    if (pending < 0.000001) { showToast("ÙØ§ ØªÙØ¬Ø¯ Ø£Ø±Ø¨Ø§Ø­ ÙØ§ÙÙØ© Ø¨Ø¹Ø¯", "err"); return; }

    isClaiming = true;
    claimBtn.disabled = true;
    claimBtn.innerHTML = `<span class="claim-spinner"></span> Ø¬Ø§Ø± Ø§ÙØ¬ÙÙâ¦`;

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
      claimBtn.innerHTML = `<span>ð° Ø§Ø¬ÙÙ Ø§ÙØ£Ø±Ø¨Ø§Ø­</span>`;
      showToast(`+Î±${earned.toFixed(6)} ØªÙ Ø§ÙØ¬ÙÙ! ð°`);
      spawnRewardBurst(earned);
    } catch (e) {
      showToast("Ø®Ø·Ø£: " + e.message, "err");
      claimBtn.innerHTML = `<span>ð° Ø§Ø¬ÙÙ Ø§ÙØ£Ø±Ø¨Ø§Ø­</span>`;
    } finally {
      isClaiming = false;
    }
  });

  // ââ Reward burst animation âââââââââââââââââââââââââââââââââââââ
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
    label.textContent = `+Î±${amount.toFixed(6)}`;
    label.style.cssText = "left:50%;top:42%;transform:translateX(-50%);position:fixed;z-index:9999;";
    document.body.appendChild(label);
    label.addEventListener("animationend", () => label.remove());
  }

  // ââ Coupon âââââââââââââââââââââââââââââââââââââââââââââââââââââ
  redeemBtn.addEventListener("click", redeemCoupon);
  couponInp.addEventListener("keydown", e => { if (e.key === "Enter") redeemCoupon(); });

  async function redeemCoupon() {
    const code = couponInp.value.trim().toUpperCase();
    if (!code)             { setCouponMsg("Ø£Ø¯Ø®Ù ÙÙØ¯ Ø§ÙÙØ³ÙÙØ© Ø£ÙÙØ§Ù", "err"); return; }
    if (!currentUser || !userData) return;
    redeemBtn.disabled = true;
    setCouponMsg("Ø¬Ø§Ø± Ø§ÙØªØ­ÙÙâ¦", "");
    try {
      const cpSnap = await get(ref(db, `coupons/${code}`));
      if (!cpSnap.exists()) { setCouponMsg("â Ø§ÙÙØ³ÙÙØ© ØºÙØ± ÙÙØ¬ÙØ¯Ø©", "err"); return; }
      const cp = cpSnap.val();
      if (!cp.isActive)     { setCouponMsg("â Ø§ÙÙØ³ÙÙØ© ØºÙØ± ÙØ´Ø·Ø©", "err"); return; }
      const usedBy = cp.usedBy && typeof cp.usedBy === "object" ? cp.usedBy : {};
      if (usedBy[currentUser.uid]) { setCouponMsg("â Ø§Ø³ØªØ®Ø¯ÙØª ÙØ°Ù Ø§ÙÙØ³ÙÙØ© ÙÙ ÙØ¨Ù", "err"); return; }
      const newBal = Math.round(((userData.balance || 0) + cp.rewardAmount) * 1_000_000) / 1_000_000;
      await update(ref(db, `users/${currentUser.uid}`), { balance: newBal });
      await update(ref(db, `coupons/${code}/usedBy`), { [currentUser.uid]: true });
      setCouponMsg(`â ØªÙ! +Î±${cp.rewardAmount}`, "ok");
      couponInp.value = "";
      showToast(`+Î±${cp.rewardAmount} ØªÙ Ø§Ø³ØªØ¨Ø¯Ø§Ù Ø§ÙÙØ³ÙÙØ©! ð`);
    } catch (e) {
      setCouponMsg("Ø®Ø·Ø£: " + e.message, "err");
    } finally {
      redeemBtn.disabled = false;
    }
  }

  function setCouponMsg(m, t) {
    couponMsgEl.textContent = m;
    couponMsgEl.className   = "coupon-msg " + t;
  }

  // ââ Upgrades âââââââââââââââââââââââââââââââââââââââââââââââââââ
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
        <div class="uc-badge">${isOwned ? "â" : isCurrent ? "â¡" : "ð"}</div>
        <div class="uc-level">Ø§ÙÙØ³ØªÙÙ ${u.level}</div>
        <div class="uc-value">${u.label}</div>
        <div class="uc-subsub">+${u.perSec.toFixed(6)} Î±/Ø«</div>
        <div class="uc-cost">${u.cost === 0 ? "ÙØ¬Ø§ÙÙ" : u.cost + " Î±"}</div>
        <button class="uc-btn ${isCurrent ? "is-current" : isOwned ? "is-owned" : isNext && canAfford ? "buy" : isNext ? "no-funds" : "locked"}"
          data-type="power" data-level="${u.level}"
          ${!isNext || !canAfford || isCurrent || isOwned ? "disabled" : ""}>
          ${isCurrent ? "Ø§ÙØ­Ø§ÙÙ â" : isOwned ? "ÙÙÙÙÙ" : isNext ? (canAfford ? "ØªØ±ÙÙØ© ð" : "Ø±ØµÙØ¯ ØºÙØ± ÙØ§ÙÙ") : "ð ÙÙÙÙ"}
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
        <div class="uc-badge">${isOwned ? "â" : isCurrent ? "â±" : "ð"}</div>
        <div class="uc-level">Ø§ÙÙØ³ØªÙÙ ${u.level}</div>
        <div class="uc-value">${u.label}</div>
        <div class="uc-subsub">${u.hours * 60} Ø¯ÙÙÙØ© ÙØ³ØªÙØ±Ø©</div>
        <div class="uc-cost">${u.cost === 0 ? "ÙØ¬Ø§ÙÙ" : u.cost + " Î±"}</div>
        <button class="uc-btn ${isCurrent ? "is-current" : isOwned ? "is-owned" : isNext && canAfford ? "buy" : isNext ? "no-funds" : "locked"}"
          data-type="duration" data-level="${u.level}"
          ${!isNext || !canAfford || isCurrent || isOwned ? "disabled" : ""}>
          ${isCurrent ? "Ø§ÙØ­Ø§ÙÙ â" : isOwned ? "ÙÙÙÙÙ" : isNext ? (canAfford ? "ØªØ±ÙÙØ© ð" : "Ø±ØµÙØ¯ ØºÙØ± ÙØ§ÙÙ") : "ð ÙÙÙÙ"}
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
    if (bal < upgrade.cost) { showToast("Ø±ØµÙØ¯ ØºÙØ± ÙØ§ÙÙ â", "err"); return; }
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
      showToast(`â ØªÙØª Ø§ÙØªØ±ÙÙØ© Ø¥ÙÙ Ø§ÙÙØ³ØªÙÙ ${level}!`);
      renderUpgrades();
    } catch (e) {
      showToast("Ø®Ø·Ø£: " + e.message, "err");
    }
  }

  // ââ Profile ââââââââââââââââââââââââââââââââââââââââââââââââââââ
  function loadProfile() {
    if (!currentUser || !userData) return;
    const set = (id, val) => { const el = $(id); if(el) el.textContent = val; };
    const setS = (id, s)  => { const el = $(id); if(el) el.src = s; };
    setS("profile-photo", userData.photoURL || "");
    set("profile-username",  userData.username || "");
    set("profile-email",     currentUser.email || "");
    set("profile-balance",   (userData.balance    || 0).toFixed(6) + " Î±");
    set("profile-total",     (userData.totalMined || 0).toFixed(6) + " Î±");
    set("profile-power",     (userData.miningPower || 1) + " Î±/Ø³Ø§Ø¹Ø©");
    set("profile-duration",  (userData.maxMiningDuration || 3) + " Ø³Ø§Ø¹Ø§Øª");
    set("profile-power-level",  "Ø§ÙÙØ³ØªÙÙ " + (userData.miningPowerLevel    || 1));
    set("profile-dur-level",    "Ø§ÙÙØ³ØªÙÙ " + (userData.miningDurationLevel || 1));
    const lc = userData.lastClaimTime;
    set("profile-last-claim", lc ? new Date(lc).toLocaleString("ar-SA") : "â");
    const { perSec } = calcMining();
    set("profile-per-sec", "+" + perSec.toFixed(8) + " Î±/Ø«");
  }
  

  // ════════════════════════════════════════════════════════════════
  // PRICE CARDS — user side
  // ════════════════════════════════════════════════════════════════

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
          <span class="pc-icon">${c.icon||"🎁"}</span>
          <span class="pc-status ${claimed?"claimed-badge":full?"off":"live"}">${claimed?"✅ مُستلمة":full?"🔒 مكتملة":"● متاحة"}</span>
        </div>
        <div class="pc-title" style="color:${col.accent}">${c.title||"بطاقة عرض"}</div>
        <div class="pc-desc">${c.description||""}</div>
        <div class="pc-reward" style="color:${col.accent}">+α ${(c.reward||0).toFixed(4)}</div>
        <div class="pc-timer" id="card-timer-${id}" style="color:${col.accent}88">⏳ جار التحميل…</div>
        <button class="pc-claim-btn ${claimed?"claimed":full?"full":""}"
          id="claim-card-${id}"
          onclick="claimCard('${id}')"
          ${claimed || full ? "disabled" : ""}>
          ${claimed?"✅ تم الاستلام":full?"🔒 انتهت":"🎁 احصل عليها الآن"}
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
      el.textContent = "⌛ انتهى العرض";
      clearInterval(cardTimers[id]);
      renderUserCards();
      return;
    }
    const d = Math.floor(rem / 86400000);
    const h = Math.floor((rem % 86400000) / 3600000);
    const m = Math.floor((rem % 3600000)  / 60000);
    const s = Math.floor((rem % 60000)    / 1000);
    el.textContent = d > 0
      ? `⏳ ${d} يوم ${h} ساعة`
      : `⏳ ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
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

    if (card.claimedBy && card.claimedBy[uid]) { showToast("استلمت هذه البطاقة من قبل ✅","err"); return; }
    if (!card.isActive || now < (card.startTime||0) || now > (card.endTime||Infinity))
      { showToast("هذه البطاقة غير متاحة الآن","err"); return; }
    if (maxU > 0 && uses >= maxU) { showToast("انتهت هذه البطاقة 🔒","err"); return; }

    if (btn) { btn.disabled = true; btn.textContent = "جار الاستلام…"; }

    const newBal = Math.round(((userData.balance||0) + card.reward) * 1e6) / 1e6;
    try {
      await Promise.all([
        update(ref(db, `users/${uid}`), { balance: newBal }),
        update(ref(db, `cards/${cardId}/claimedBy`), { [uid]: true })
      ]);
      showToast(`+α${card.reward.toFixed(4)} تم استلام البطاقة! 🎁`);
      spawnRewardBurst(card.reward);
      if (btn) { btn.textContent = "✅ تم الاستلام"; btn.classList.add("claimed"); }
    } catch(e) {
      showToast("خطأ: "+e.message,"err");
      if (btn) { btn.disabled = false; btn.textContent = "🎁 احصل عليها الآن"; }
    }
  };

  // Patch listenUserData to also start card listener
  const _origListenUserData = listenUserData;
  function listenUserData(uid) {
    _origListenUserData(uid);
  }

  // Store firebase imports for cards listener
  import {
    onValue as onValueCards, ref as refCards
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

  // Start cards listener after auth
  onAuthStateChanged(auth, user => {
    if (user) {
      onValueCards(refCards(db, "cards"), snap => {
        allCardsData = {};
        if (snap.exists()) snap.forEach(c => { allCardsData[c.key] = c.val(); });
        renderUserCards();
      });
    } else {
      Object.values(cardTimers).forEach(t => clearInterval(t));
      cardTimers = {};
      allCardsData = {};
      const section = document.getElementById("cards-section");
      if (section) section.style.display = "none";
    }
  });
  