import { auth, db } from "./firebase-config.js";
  import {
    GoogleAuthProvider, signInWithPopup,
    browserLocalPersistence, setPersistence,
    signOut, onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
  import {
    ref, get, set, update, onValue, push, runTransaction, orderByChild, limitToLast, query
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

  const ADMIN_EMAIL = "aialskrani@gmail.com";

  // ── Upgrade configs ──────────────────────────────────────────────
  const POWER_UPGRADES = [
    { level:1, power:1,  label:"1 α/ساعة",  perSec:(1/3600),  cost:0 },
    { level:2, power:2,  label:"2 α/ساعة",  perSec:(2/3600),  cost:100 },
    { level:3, power:5,  label:"5 α/ساعة",  perSec:(5/3600),  cost:300 },
    { level:4, power:10, label:"10 α/ساعة", perSec:(10/3600), cost:700 },
    { level:5, power:20, label:"20 α/ساعة", perSec:(20/3600), cost:1500 },
  ];
  const DURATION_UPGRADES = [
    { level:1, hours:1,  label:"1 ساعة",  cost:0 },
    { level:2, hours:4,  label:"4 ساعات", cost:150 },
    { level:3, hours:8,  label:"8 ساعات", cost:400 },
    { level:4, hours:24, label:"24 ساعة", cost:1000 },
  ];

  // ── DOM refs ─────────────────────────────────────────────────────
  const authScreen      = document.getElementById("auth-screen");
  const gameContainer   = document.getElementById("game-container");
  const loadingEl       = document.getElementById("loading");
  const googleLoginBtn  = document.getElementById("google-login-btn");
  const authErr         = document.getElementById("auth-error");
  const googleProvider  = new GoogleAuthProvider();

  // ── App state ────────────────────────────────────────────────────
  let currentUser = null;
  let userData    = null;
  let miningTimer = null;
  let settingsData = {};
  let userDataUnsubscribe = null;
  let settingsUnsubscribe = null;
  let cardsUnsubscribe    = null;
  let allCardsData = {};
  let cardTimers   = {};

  // ── Maintenance + Announcement check ────────────────────────────
  function listenSettings() {
    if (settingsUnsubscribe) settingsUnsubscribe();
    settingsUnsubscribe = onValue(ref(db,"settings"), snap => {
      settingsData = snap.exists() ? snap.val() : {};
      applySettings();
    });
  }

  function applySettings() {
    const m = settingsData.maintenance || {};
    const a = settingsData.announcement || {};
    // Maintenance mode
    const maintEl = document.getElementById("maintenance-overlay");
    if (maintEl) {
      if (m.enabled && currentUser?.email !== ADMIN_EMAIL) {
        maintEl.style.display = "flex";
        const msg = document.getElementById("maintenance-msg");
        if (msg) msg.textContent = m.message || "الموقع تحت الصيانة، يرجى المحاولة لاحقاً";
      } else {
        maintEl.style.display = "none";
      }
    }
    // Announcement banner
    const annEl = document.getElementById("announcement-banner");
    if (annEl) {
      if (a.enabled && a.message) {
        annEl.style.display = "flex";
        annEl.className = "announcement-banner ann-" + (a.type || "info");
        const annText = document.getElementById("announcement-text");
        if (annText) annText.textContent = a.message;
      } else {
        annEl.style.display = "none";
      }
    }
  }

  // ── Auth ─────────────────────────────────────────────────────────
  onAuthStateChanged(auth, async user => {
    loadingEl.style.display = "none";
    if (user) {
      currentUser = user;
      authScreen.style.display    = "none";
      gameContainer.style.display = "flex";
      await ensureUserRecord(user);
      listenUserData(user.uid);
      startCardsListener();
      listenSettings();
      checkDailyBonus();
    } else {
      currentUser = null;
      userData    = null;
      stopMiningTimer();
      clearCards();
      if (userDataUnsubscribe) { userDataUnsubscribe(); userDataUnsubscribe = null; }
      if (settingsUnsubscribe) { settingsUnsubscribe(); settingsUnsubscribe = null; }
      if (cardsUnsubscribe)    { cardsUnsubscribe();    cardsUnsubscribe    = null; }
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
    } catch(e) { authErr.textContent = getErrMsg(e); resetLoginBtn(); }
  });

  function resetLoginBtn() {
    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML = `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width="22"/> الدخول بحساب Google`;
  }
  function getErrMsg(e) {
    return ({
      "auth/popup-closed-by-user":"أغلقت نافذة الدخول",
      "auth/network-request-failed":"تحقق من اتصال الإنترنت",
    })[e.code] || e.message;
  }

  // ── Logout ───────────────────────────────────────────────────────
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await signOut(auth);
  });

  // ── Ensure user record ───────────────────────────────────────────
  async function ensureUserRecord(user) {
    const snap = await get(ref(db, `users/${user.uid}`));
    if (!snap.exists()) {
      const code = genReferralCode(user.uid);
      await set(ref(db, `users/${user.uid}`), {
        username: user.displayName || "مستخدم جديد",
        email: user.email || "",
        balance: 0,
        miningPower: 1,
        miningPowerLevel: 1,
        maxMiningDuration: 1,
        miningDurationLevel: 1,
        lastClaimTime: 0,
        streak: 0,
        lastLoginDate: "",
        referralCode: code,
        joinedAt: Date.now(),
        isBanned: false,
      });
      await set(ref(db, `referrals/${code}`), {
        ownerUid: user.uid,
        ownerName: user.displayName || "مستخدم",
        usedBy: {}
      });
    } else {
      // Ensure referralCode exists for old users
      const d = snap.val();
      if (!d.referralCode) {
        const code = genReferralCode(user.uid);
        await update(ref(db, `users/${user.uid}`), { referralCode: code });
        await set(ref(db, `referrals/${code}`), {
          ownerUid: user.uid, ownerName: d.username || "مستخدم", usedBy: {}
        });
      }
    }
  }

  function genReferralCode(uid) {
    return uid.slice(0,6).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();
  }

  // ── Listen user data ─────────────────────────────────────────────
  function listenUserData(uid) {
    if (userDataUnsubscribe) userDataUnsubscribe();
    userDataUnsubscribe = onValue(ref(db, `users/${uid}`), snap => {
      if (!snap.exists()) return;
      userData = snap.val();
      if (userData.isBanned && currentUser?.email !== ADMIN_EMAIL) {
        showBannedScreen(userData.banReason);
        return;
      }
      updateUI();
    });
  }

  function showBannedScreen(reason) {
    gameContainer.style.display = "none";
    const b = document.getElementById("banned-screen");
    if (b) {
      b.style.display = "flex";
      const r = document.getElementById("ban-reason");
      if (r) r.textContent = reason || "تم حظر حسابك من قِبل الإدارة.";
    }
  }

  // ── Daily bonus ──────────────────────────────────────────────────
  async function checkDailyBonus() {
    if (!currentUser || !userData) {
      await new Promise(r => setTimeout(r, 1000));
      if (!userData) return;
    }
    const today     = new Date().toISOString().slice(0,10);
    const lastLogin = userData.lastLoginDate || "";
    if (lastLogin === today) return;

    const settings   = settingsData.dailyBonus || {};
    const enabled    = settings.enabled !== false;
    if (!enabled) return;

    const baseAmount  = parseFloat(settings.baseAmount) || 5;
    const multiplier  = parseFloat(settings.streakMultiplier) || 1.2;
    const maxStreak   = parseInt(settings.maxStreak) || 30;

    const yesterday   = new Date(Date.now()-86400000).toISOString().slice(0,10);
    const newStreak   = lastLogin === yesterday ? Math.min((userData.streak||0)+1, maxStreak) : 1;
    const bonus       = Math.round(baseAmount * Math.pow(multiplier, newStreak-1) * 1e4) / 1e4;

    try {
      await runTransaction(ref(db, `users/${currentUser.uid}/balance`), bal =>
        Math.round(((bal||0) + bonus) * 1e6) / 1e6
      );
      await update(ref(db, `users/${currentUser.uid}`), {
        streak: newStreak,
        lastLoginDate: today,
      });
      setTimeout(() => showDailyBonusPopup(bonus, newStreak), 1200);
    } catch(e) { console.error("Daily bonus error:", e); }
  }

  function showDailyBonusPopup(amount, streak) {
    const pop = document.getElementById("daily-bonus-popup");
    if (!pop) return;
    const amtEl = document.getElementById("bonus-amount");
    const strEl = document.getElementById("bonus-streak");
    if (amtEl) amtEl.textContent = "+" + amount.toFixed(4) + " α";
    if (strEl) strEl.textContent = "🔥 " + streak + " يوم متتالي";
    pop.style.display = "flex";
    setTimeout(() => { pop.style.display = "none"; }, 4000);
  }

  // ── Referral system ──────────────────────────────────────────────
  async function applyReferralCode(code) {
    if (!currentUser || !userData) return "لم تسجل دخول";
    code = code.trim().toUpperCase();
    if (!code) return "أدخل الكود";
    if (userData.referredBy) return "استخدمت كوداً من قبل";
    if (code === userData.referralCode) return "لا يمكن استخدام كودك الخاص";

    const snap = await get(ref(db, `referrals/${code}`));
    if (!snap.exists()) return "الكود غير موجود";

    const ref_data = snap.val();
    if (ref_data.usedBy && ref_data.usedBy[currentUser.uid]) return "استخدمت هذا الكود من قبل";

    const settings   = settingsData.referral || {};
    const enabled    = settings.enabled !== false;
    if (!enabled) return "نظام الإحالة غير مفعّل حالياً";

    const refereeReward  = parseFloat(settings.refereeReward)  || 10;
    const referrerReward = parseFloat(settings.referrerReward) || 20;

    try {
      // Give referee (current user) reward
      await runTransaction(ref(db, `users/${currentUser.uid}/balance`), bal =>
        Math.round(((bal||0) + refereeReward) * 1e6) / 1e6
      );
      await update(ref(db, `users/${currentUser.uid}`), { referredBy: code });
      // Mark referral as used
      await update(ref(db, `referrals/${code}/usedBy`), { [currentUser.uid]: true });
      // Give referrer reward
      const referrerUid = ref_data.ownerUid;
      await runTransaction(ref(db, `users/${referrerUid}/balance`), bal =>
        Math.round(((bal||0) + referrerReward) * 1e6) / 1e6
      );
      return "ok";
    } catch(e) { return "خطأ: " + e.message; }
  }

  // ── Mining logic ─────────────────────────────────────────────────
  function stopMiningTimer() {
    if (miningTimer) { clearInterval(miningTimer); miningTimer = null; }
  }

  function startMiningTimer() {
    stopMiningTimer();
    miningTimer = setInterval(updateMiningUI, 500); // 500ms (was 100ms)
  }

  function getMiningElapsed() {
    if (!userData) return 0;
    const start   = userData.lastClaimTime || userData.miningStartTime || 0;
    const maxMs   = (userData.maxMiningDuration || 1) * 3600 * 1000;
    const elapsed = Math.min(Date.now() - start, maxMs);
    return Math.max(0, elapsed);
  }

  function getMiningPending() {
    if (!userData) return 0;
    const elapsed = getMiningElapsed();
    const power   = userData.miningPower || 1;
    return Math.round((power * elapsed / 3600000) * 1e6) / 1e6;
  }

  function isMiningFull() {
    if (!userData) return false;
    return getMiningElapsed() >= (userData.maxMiningDuration||1) * 3600000;
  }

  function updateMiningUI() {
    if (!userData) return;
    const pending = getMiningPending();
    const full    = isMiningFull();
    const elMined = document.getElementById("mined-amount");
    const elRate  = document.getElementById("mining-rate");
    const elProg  = document.getElementById("mining-progress");
    const elFullMsg = document.getElementById("mining-full-msg");

    if (elMined) elMined.textContent = pending.toFixed(6);
    if (elRate) {
      const pps = (userData.miningPower || 1) / 3600;
      elRate.textContent = pps.toFixed(8) + " α/ثانية";
    }
    if (elProg) {
      const pct = Math.min(getMiningElapsed() / ((userData.maxMiningDuration||1)*3600000) * 100, 100);
      elProg.style.width = pct + "%";
    }
    if (elFullMsg) elFullMsg.style.display = full ? "block" : "none";

    // Update claim btn
    const claimBtn = document.getElementById("claim-btn");
    if (claimBtn) {
      claimBtn.disabled = pending <= 0;
      claimBtn.style.opacity = pending > 0 ? "1" : "0.5";
    }
  }

  let isClaiming = false;
  async function claimMining() {
    if (!currentUser || !userData || isClaiming) return;
    const pending = getMiningPending();
    if (pending <= 0) { showToast("لا يوجد رصيد لجمعه بعد", "err"); return; }
    isClaiming = true;
    const claimBtn = document.getElementById("claim-btn");
    if (claimBtn) { claimBtn.disabled = true; claimBtn.textContent = "جار الجمع…"; }
    try {
      await runTransaction(ref(db, `users/${currentUser.uid}/balance`), bal =>
        Math.round(((bal||0) + pending) * 1e6) / 1e6
      );
      await update(ref(db, `users/${currentUser.uid}`), { lastClaimTime: Date.now() });
      spawnRewardBurst(pending);
      showToast(`+α${pending.toFixed(6)} تم الجمع! 🎉`);
    } catch(e) {
      showToast("خطأ: " + e.message, "err");
    } finally {
      isClaiming = false;
      if (claimBtn) { claimBtn.disabled = false; claimBtn.textContent = "⚡ جمع المكافآت"; }
    }
  }
  window.claimMining = claimMining;

  // ── UI update ────────────────────────────────────────────────────
  function updateUI() {
    if (!userData) return;
    // Balance
    const elBal = document.getElementById("balance");
    if (elBal) elBal.textContent = (userData.balance||0).toFixed(6);
    // Username
    const elUser = document.getElementById("username");
    if (elUser) elUser.textContent = userData.username || "";
    // Streak badge
    const elStreak = document.getElementById("streak-badge");
    if (elStreak) {
      const s = userData.streak || 0;
      elStreak.textContent = s > 0 ? "🔥 " + s : "";
      elStreak.style.display = s > 0 ? "inline-block" : "none";
    }
    // Referral code display
    const elRef = document.getElementById("referral-code-display");
    if (elRef) elRef.textContent = userData.referralCode || "";
    // Referral section visibility
    const refSection = document.getElementById("referral-section");
    if (refSection) refSection.style.display = "block";
    // Hide referral input if already used
    const refInputWrap = document.getElementById("referral-input-wrap");
    if (refInputWrap) refInputWrap.style.display = userData.referredBy ? "none" : "flex";
    const refUsed = document.getElementById("referral-used");
    if (refUsed) refUsed.style.display = userData.referredBy ? "block" : "none";

    renderUpgrades();
    startMiningTimer();
    updateMiningUI();
    renderUserCards();
    loadLeaderboard();
  }

  // ── Tabs ─────────────────────────────────────────────────────────
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const target = document.getElementById("tab-" + btn.dataset.tab);
      if (target) target.classList.add("active");
    });
  });

  // ── Upgrades ─────────────────────────────────────────────────────
  function renderUpgrades() {
    if (!userData) return;
    const pwrEl  = document.getElementById("upgrades-power");
    const durEl  = document.getElementById("upgrades-duration");
    if (!pwrEl || !durEl) return;

    const curPwrLvl = userData.miningPowerLevel || 1;
    const curDurLvl = userData.miningDurationLevel || 1;

    pwrEl.innerHTML = POWER_UPGRADES.map(u => {
      const owned = u.level <= curPwrLvl;
      const current = u.level === curPwrLvl;
      const canAfford = (userData.balance||0) >= u.cost;
      const canBuy = !owned && u.level === curPwrLvl + 1;
      return `<div class="upgrade-card ${owned?"owned":""} ${current?"current":""}">
        <div class="upgrade-icon">⚡</div>
        <div class="upgrade-info">
          <div class="upgrade-label">${u.label}</div>
          <div class="upgrade-cost">${owned ? "✅ مملوك" : "α " + u.cost.toLocaleString()}</div>
        </div>
        ${!owned ? `<button class="upgrade-btn ${canAfford&&canBuy?"":"disabled"}"
          onclick="buyUpgrade('power',${u.level})"
          ${canAfford&&canBuy?"":"disabled"}>ترقية</button>` : ""}
      </div>`;
    }).join("");

    durEl.innerHTML = DURATION_UPGRADES.map(u => {
      const owned = u.level <= curDurLvl;
      const current = u.level === curDurLvl;
      const canAfford = (userData.balance||0) >= u.cost;
      const canBuy = !owned && u.level === curDurLvl + 1;
      return `<div class="upgrade-card ${owned?"owned":""} ${current?"current":""}">
        <div class="upgrade-icon">⏱</div>
        <div class="upgrade-info">
          <div class="upgrade-label">${u.label}</div>
          <div class="upgrade-cost">${owned ? "✅ مملوك" : "α " + u.cost.toLocaleString()}</div>
        </div>
        ${!owned ? `<button class="upgrade-btn ${canAfford&&canBuy?"":"disabled"}"
          onclick="buyUpgrade('duration',${u.level})"
          ${canAfford&&canBuy?"":"disabled"}>ترقية</button>` : ""}
      </div>`;
    }).join("");
  }

  let isBuying = false;
  window.buyUpgrade = async (type, level) => {
    if (!currentUser || !userData || isBuying) return;
    const list = type === "power" ? POWER_UPGRADES : DURATION_UPGRADES;
    const upg  = list.find(u => u.level === level);
    if (!upg || upg.cost > (userData.balance||0)) { showToast("رصيد غير كافٍ","err"); return; }
    isBuying = true;
    try {
      const updates = { [`${type==="power"?"miningPowerLevel":"miningDurationLevel"}`]: level };
      if (type === "power") updates.miningPower = upg.power;
      else updates.maxMiningDuration = upg.hours;
      await runTransaction(ref(db, `users/${currentUser.uid}/balance`), bal => {
        if ((bal||0) < upg.cost) return; // abort
        return Math.round(((bal||0) - upg.cost) * 1e6) / 1e6;
      });
      await update(ref(db, `users/${currentUser.uid}`), updates);
      showToast("✅ تم الترقية بنجاح!");
    } catch(e) { showToast("خطأ: "+e.message,"err"); }
    finally { isBuying = false; }
  };

  // ── Coupon ───────────────────────────────────────────────────────
  document.getElementById("coupon-btn")?.addEventListener("click", async () => {
    if (!currentUser || !userData) return;
    const inp = document.getElementById("coupon-input");
    const msg = document.getElementById("coupon-msg");
    const code = inp?.value?.trim().toUpperCase();
    if (!code) { if (msg) msg.textContent = "أدخل الكود"; return; }
    const snap = await get(ref(db, `coupons/${code}`));
    if (!snap.exists()) { if (msg) { msg.textContent = "كود غير صحيح"; msg.className="coupon-msg err"; } return; }
    const c = snap.val();
    if (!c.active) { if (msg) { msg.textContent = "هذا الكود غير نشط"; msg.className="coupon-msg err"; } return; }
    if (c.usedBy && c.usedBy[currentUser.uid]) { if (msg) { msg.textContent = "استخدمت هذا الكود من قبل"; msg.className="coupon-msg err"; } return; }
    const maxUses = c.maxUses || 0;
    const uses    = c.usedBy ? Object.keys(c.usedBy).length : 0;
    if (maxUses > 0 && uses >= maxUses) { if (msg) { msg.textContent = "انتهت استخدامات هذا الكود"; msg.className="coupon-msg err"; } return; }
    const reward = parseFloat(c.reward) || 0;
    await runTransaction(ref(db, `users/${currentUser.uid}/balance`), bal =>
      Math.round(((bal||0) + reward) * 1e6) / 1e6
    );
    await update(ref(db, `coupons/${code}/usedBy`), { [currentUser.uid]: true });
    if (msg) { msg.textContent = `✅ تم! +α${reward}`; msg.className="coupon-msg ok"; }
    if (inp) inp.value = "";
    spawnRewardBurst(reward);
  });

  // ── Referral UI ───────────────────────────────────────────────────
  document.getElementById("referral-apply-btn")?.addEventListener("click", async () => {
    const inp = document.getElementById("referral-input");
    const msg = document.getElementById("referral-msg");
    const code = inp?.value?.trim();
    if (!code) return;
    if (msg) { msg.textContent = "جار التحقق…"; msg.className = "coupon-msg"; }
    const result = await applyReferralCode(code);
    if (result === "ok") {
      if (msg) { msg.textContent = "✅ تم تطبيق الكود! حصلت على مكافأة الإحالة"; msg.className = "coupon-msg ok"; }
      if (inp) inp.value = "";
      showToast("🎉 مكافأة الإحالة استُلمت!");
    } else {
      if (msg) { msg.textContent = result; msg.className = "coupon-msg err"; }
    }
  });

  document.getElementById("copy-referral-btn")?.addEventListener("click", () => {
    const code = userData?.referralCode || "";
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => showToast("✅ تم نسخ كود الإحالة"));
  });

  // ── Leaderboard ──────────────────────────────────────────────────
  let leaderboardLoaded = false;
  async function loadLeaderboard() {
    if (leaderboardLoaded) return;
    const el = document.getElementById("leaderboard-list");
    if (!el) return;
    leaderboardLoaded = true;
    try {
      const q    = query(ref(db,"users"), orderByChild("balance"), limitToLast(10));
      const snap = await get(q);
      if (!snap.exists()) { el.innerHTML = "<div class='lb-empty'>لا يوجد بيانات بعد</div>"; return; }
      const users = [];
      snap.forEach(c => users.push({ uid:c.key, ...c.val() }));
      users.sort((a,b) => (b.balance||0)-(a.balance||0));
      el.innerHTML = users.map((u,i) => {
        const medals = ["🥇","🥈","🥉"];
        const isMe   = u.uid === currentUser?.uid;
        return `<div class="lb-row ${isMe?"lb-me":""}">
          <span class="lb-rank">${medals[i]||("#"+(i+1))}</span>
          <span class="lb-name">${escHtml(u.username||"مستخدم")}${isMe?" (أنت)":""}</span>
          <span class="lb-bal">α ${(u.balance||0).toFixed(4)}</span>
        </div>`;
      }).join("");
    } catch(e) { if (el) el.innerHTML = "<div class='lb-empty'>خطأ في التحميل</div>"; }
  }

  // Reload leaderboard when tab is clicked
  document.querySelector('[data-tab="leaderboard"]')?.addEventListener("click", () => {
    leaderboardLoaded = false;
    loadLeaderboard();
  });

  // ── Cards (user side) ────────────────────────────────────────────
  const CARD_COLORS_U = {
    gold:   { bg:"linear-gradient(135deg,#1a1505,#2a2008)", border:"#f0b429", accent:"#f0b429" },
    blue:   { bg:"linear-gradient(135deg,#050d1a,#08163a)", border:"#00d4ff", accent:"#00d4ff" },
    green:  { bg:"linear-gradient(135deg,#051a0d,#072a12)", border:"#22c55e", accent:"#22c55e" },
    purple: { bg:"linear-gradient(135deg,#120518,#1c0830)", border:"#a855f7", accent:"#a855f7" },
    red:    { bg:"linear-gradient(135deg,#1a0505,#2a0808)", border:"#ef4444", accent:"#ef4444" },
  };

  function startCardsListener() {
    if (cardsUnsubscribe) cardsUnsubscribe();
    cardsUnsubscribe = onValue(ref(db,"cards"), snap => {
      allCardsData = {};
      if (snap.exists()) snap.forEach(c => { allCardsData[c.key] = c.val(); });
      renderUserCards();
    });
  }
  function clearCards() {
    Object.values(cardTimers).forEach(t => clearInterval(t));
    cardTimers = {}; allCardsData = {};
    const s = document.getElementById("cards-section");
    if (s) s.style.display = "none";
  }

  function renderUserCards() {
    if (!currentUser) return;
    const now = Date.now(), uid = currentUser.uid;
    const section = document.getElementById("cards-section");
    const list    = document.getElementById("active-cards-list");
    if (!section || !list) return;
    const active = Object.entries(allCardsData).filter(([,c]) => {
      const uses = c.claimedBy ? Object.keys(c.claimedBy).length : 0;
      const maxU = c.maxUses || 0;
      return c.isActive && (c.startTime||0)<=now && (c.endTime||Infinity)>=now && (maxU===0||uses<maxU);
    });
    if (!active.length) { section.style.display = "none"; return; }
    section.style.display = "block";
    Object.values(cardTimers).forEach(t => clearInterval(t));
    cardTimers = {};
    list.innerHTML = `<div class="cards-grid">${active.map(([id,c]) => {
      const col = CARD_COLORS_U[c.color||"gold"];
      const claimed = c.claimedBy && c.claimedBy[uid];
      const uses = c.claimedBy ? Object.keys(c.claimedBy).length : 0;
      const full = (c.maxUses||0) > 0 && uses >= c.maxUses;
      return `<div class="price-card ${claimed?"claimed":full?"inactive":"live"}"
        style="background:${col.bg};border-color:${col.border}">
        <div class="pc-glow" style="background:radial-gradient(circle,${col.accent}18,transparent 70%)"></div>
        <div class="pc-header">
          <span class="pc-icon">${c.icon||"🎁"}</span>
          <span class="pc-status ${claimed?"claimed-badge":full?"off":"live"}">${claimed?"✅ مُستلمة":full?"🔒 مكتملة":"● متاحة"}</span>
        </div>
        <div class="pc-title" style="color:${col.accent}">${escHtml(c.title||"بطاقة عرض")}</div>
        <div class="pc-desc">${escHtml(c.description||"")}</div>
        <div class="pc-reward" style="color:${col.accent}">+α ${(c.reward||0).toFixed(4)}</div>
        <div class="pc-timer" id="card-timer-${id}" style="color:${col.accent}88">⏳ جار التحميل…</div>
        <button class="pc-claim-btn ${claimed?"claimed":full?"full":""}"
          id="claim-card-${id}" onclick="claimCard('${id}')"
          ${claimed||full?"disabled":""}>
          ${claimed?"✅ تم الاستلام":full?"🔒 انتهت":"🎁 احصل عليها الآن"}
        </button></div>`;
    }).join("")}</div>`;
    active.forEach(([id,c]) => {
      updateCardTimer(id,c.endTime);
      cardTimers[id] = setInterval(() => updateCardTimer(id,c.endTime), 1000);
    });
  }

  function updateCardTimer(id, endTime) {
    const el = document.getElementById(`card-timer-${id}`);
    if (!el) { clearInterval(cardTimers[id]); return; }
    const rem = endTime - Date.now();
    if (rem <= 0) { el.textContent = "⌛ انتهى العرض"; clearInterval(cardTimers[id]); renderUserCards(); return; }
    const d=Math.floor(rem/86400000), h=Math.floor((rem%86400000)/3600000),
          m=Math.floor((rem%3600000)/60000), s=Math.floor((rem%60000)/1000);
    el.textContent = d>0?`⏳ ${d}ي ${h}س`:`⏳ ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }

  window.claimCard = async (cardId) => {
    if (!currentUser || !userData) return;
    const card = allCardsData[cardId];
    if (!card) return;
    const now=Date.now(), uid=currentUser.uid;
    const uses=(card.claimedBy?Object.keys(card.claimedBy).length:0);
    const maxU=card.maxUses||0;
    if (card.claimedBy&&card.claimedBy[uid]) { showToast("استلمت هذه البطاقة من قبل ✅","err"); return; }
    if (!card.isActive||now<(card.startTime||0)||now>(card.endTime||Infinity)) { showToast("هذه البطاقة غير متاحة الآن","err"); return; }
    if (maxU>0&&uses>=maxU) { showToast("انتهت هذه البطاقة 🔒","err"); return; }
    const btn = document.getElementById(`claim-card-${cardId}`);
    if (btn) { btn.disabled=true; btn.textContent="جار الاستلام…"; }
    try {
      await runTransaction(ref(db,`users/${uid}/balance`), bal =>
        Math.round(((bal||0)+card.reward)*1e6)/1e6
      );
      await update(ref(db,`cards/${cardId}/claimedBy`),{[uid]:true});
      showToast(`+α${card.reward.toFixed(4)} تم استلام البطاقة! 🎁`);
      spawnRewardBurst(card.reward);
      if (btn) { btn.textContent="✅ تم الاستلام"; btn.classList.add("claimed"); }
    } catch(e) {
      showToast("خطأ: "+e.message,"err");
      if (btn) { btn.disabled=false; btn.textContent="🎁 احصل عليها الآن"; }
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function showToast(msg, type="ok") {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.className   = "toast show " + type;
    setTimeout(() => t.classList.remove("show"), 3000);
  }

  function spawnRewardBurst(amount) {
    const container = document.querySelector(".mining-card") || document.body;
    for (let i=0;i<12;i++) {
      const el = document.createElement("div");
      el.className = "burst-particle";
      el.textContent = "+α";
      el.style.cssText = `left:${20+Math.random()*60}%;top:${20+Math.random()*60}%;
        animation-delay:${Math.random()*0.5}s;`;
      container.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }
  }
  