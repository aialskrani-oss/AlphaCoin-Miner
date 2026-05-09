import { auth, db, ADMIN_USERNAME } from "./firebase-config.js";
  import {
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
  import {
    ref, get, set, update, onValue, query, orderByChild, equalTo
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

  // ── DOM refs ───────────────────────────────────────────────────
  const loadingEl    = document.getElementById("loading");
  const authScreen   = document.getElementById("auth-screen");
  const gameContainer= document.getElementById("game-container");

  // Auth
  const googleLoginBtn = document.getElementById("google-login-btn");
  const loginEmail   = document.getElementById("login-email");
  const loginPass    = document.getElementById("login-pass");
  const loginBtn     = document.getElementById("login-btn");
  const loginErr     = document.getElementById("login-err");
  const regUser      = document.getElementById("reg-user");
  const regEmail     = document.getElementById("reg-email");
  const regCc        = document.getElementById("reg-cc");
  const regPhone     = document.getElementById("reg-phone");
  const regPass      = document.getElementById("reg-pass");
  const regPass2     = document.getElementById("reg-pass2");
  const regBtn       = document.getElementById("reg-btn");
  const regErr       = document.getElementById("reg-err");

  // Game
  const userNameEl   = document.getElementById("user-name");
  const userPhotoEl  = document.getElementById("user-photo");
  const logoutBtn    = document.getElementById("logout-btn");
  const balanceEl    = document.getElementById("balance");
  const totalMinedEl = document.getElementById("total-mined");
  const dailyCountEl = document.getElementById("daily-count");
  const minesLeftEl  = document.getElementById("mines-left");
  const mineBtn      = document.getElementById("mine-btn");
  const couponInp    = document.getElementById("coupon-code");
  const redeemBtn    = document.getElementById("redeem-btn");
  const couponMsg    = document.getElementById("coupon-msg");
  const lbBody       = document.getElementById("leaderboard");
  const toastEl      = document.getElementById("toast");
  const adminBtnWrap = document.getElementById("admin-btn-wrap");

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

  // ── Auth tabs ──────────────────────────────────────────────────
  document.querySelectorAll(".auth-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.atab;
      document.getElementById("atab-login").style.display    = tab === "login"    ? "flex" : "none";
      document.getElementById("atab-register").style.display = tab === "register" ? "flex" : "none";
      clearErrors();
    });
  });

  // ── Password toggle ────────────────────────────────────────────
  document.querySelectorAll(".pass-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const inp = document.getElementById(btn.dataset.target);
      inp.type = inp.type === "password" ? "text" : "password";
      btn.textContent = inp.type === "password" ? "👁" : "🙈";
    });
  });

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

  // ── Google Login ───────────────────────────────────────────────
  const googleProvider = new GoogleAuthProvider();

  googleLoginBtn.addEventListener("click", async () => {
    googleLoginBtn.disabled = true;
    googleLoginBtn.textContent = "جار الدخول…";
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      const msgs = {
        "auth/popup-closed-by-user":    "أُغلقت النافذة قبل اكتمال الدخول",
        "auth/popup-blocked":           "تم حجب النافذة — يرجى السماح بها في المتصفح",
        "auth/cancelled-popup-request": "تم إلغاء الطلب",
        "auth/network-request-failed":  "خطأ في الاتصال",
      };
      showToast(msgs[e.code] || ("خطأ: " + e.message), "err");
      googleLoginBtn.disabled = false;
      googleLoginBtn.innerHTML = `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width="22"/> الدخول بحساب Google`;
    }
  });

  // ── Email Login ────────────────────────────────────────────────
  loginBtn.addEventListener("click", doLogin);
  loginPass.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  loginEmail.addEventListener("keydown", e => { if (e.key === "Enter") loginPass.focus(); });

  async function doLogin() {
    const email    = loginEmail.value.trim().toLowerCase();
    const password = loginPass.value;
    if (!email || !email.includes("@")) { setErr(loginErr, "أدخل بريداً إلكترونياً صحيحاً"); return; }
    if (!password) { setErr(loginErr, "أدخل كلمة المرور"); return; }
    setErr(loginErr, "");
    loginBtn.disabled = true;
    loginBtn.textContent = "جار الدخول…";
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setErr(loginErr, authError(e.code));
      loginBtn.disabled = false;
      loginBtn.textContent = "دخول ⚡";
    }
  }

  // ── Email Register ─────────────────────────────────────────────
  regBtn.addEventListener("click", doRegister);
  regPass2.addEventListener("keydown", e => { if (e.key === "Enter") doRegister(); });

  async function doRegister() {
    const username  = regUser.value.trim().toLowerCase();
    const email     = regEmail.value.trim().toLowerCase();
    const phone     = (regCc.value + regPhone.value.replace(/\D/g, "").replace(/^0+/, "")).trim();
    const password  = regPass.value;
    const password2 = regPass2.value;

    if (!username || username.length < 3)         { setErr(regErr, "اسم المستخدم 3 أحرف على الأقل"); return; }
    if (!/^[a-z0-9_]+$/.test(username))           { setErr(regErr, "اسم المستخدم: أحرف إنجليزية وأرقام وشرطة سفلية فقط"); return; }
    if (username === ADMIN_USERNAME)               { setErr(regErr, "اسم المستخدم هذا محجوز"); return; }
    if (!email || !email.includes("@"))            { setErr(regErr, "أدخل بريداً إلكترونياً صحيحاً"); return; }
    if (regPhone.value.replace(/\D/g, "").length < 7) { setErr(regErr, "أدخل رقم هاتف صحيح"); return; }
    if (password.length < 8)                      { setErr(regErr, "كلمة المرور 8 أحرف على الأقل"); return; }
    if (password !== password2)                   { setErr(regErr, "كلمتا المرور غير متطابقتين"); return; }

    setErr(regErr, "");
    regBtn.disabled = true;
    regBtn.textContent = "جار الإنشاء…";

    try {
      const usnap = await get(query(ref(db, "users"), orderByChild("username"), equalTo(username)));
      if (usnap.exists()) {
        setErr(regErr, "اسم المستخدم مأخوذ، جرّب اسماً آخر");
        regBtn.disabled = false;
        regBtn.textContent = "إنشاء الحساب";
        return;
      }
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await set(ref(db, `users/${cred.user.uid}`), {
        username, email, phone,
        balance: 0, totalMined: 0,
        lastMineDate: "", dailyMineCount: 0,
        createdAt: Date.now()
      });
    } catch (e) {
      setErr(regErr, authError(e.code));
      regBtn.disabled = false;
      regBtn.textContent = "إنشاء الحساب";
    }
  }

  // ── Auth state ─────────────────────────────────────────────────
  onAuthStateChanged(auth, async user => {
    loadingEl.style.display = "none";
    if (user) {
      currentUser = user;
      showGame();
      await ensureUserRecord(user);
      listenUserData(user.uid);
    } else {
      currentUser = null;
      userData    = null;
      showAuth();
    }
  });

  function showGame() {
    authScreen.style.display  = "none";
    gameContainer.style.display = "flex";
    resetAuthForms();
  }

  function showAuth() {
    authScreen.style.display  = "flex";
    gameContainer.style.display = "none";
  }

  logoutBtn.addEventListener("click", () => signOut(auth));

  function resetAuthForms() {
    if (loginEmail) loginEmail.value = "";
    if (loginPass)  loginPass.value  = "";
    if (regUser)    regUser.value    = "";
    if (regEmail)   regEmail.value   = "";
    if (regPhone)   regPhone.value   = "";
    if (regPass)    regPass.value    = "";
    if (regPass2)   regPass2.value   = "";
    loginBtn.disabled = false; loginBtn.textContent = "دخول ⚡";
    regBtn.disabled   = false; regBtn.textContent   = "إنشاء الحساب";
    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML = `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width="22"/> الدخول بحساب Google`;
    clearErrors();
  }

  // ── Ensure user record ─────────────────────────────────────────
  async function ensureUserRecord(user) {
    const snap = await get(ref(db, `users/${user.uid}`));
    if (!snap.exists()) {
      const raw   = user.displayName || user.email || user.uid;
      const uname = raw.split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase().slice(0, 20);
      await set(ref(db, `users/${user.uid}`), {
        username:      uname,
        email:         user.email || "",
        phone:         "",
        photoURL:      user.photoURL || "",
        balance:       0,
        totalMined:    0,
        lastMineDate:  "",
        dailyMineCount:0,
        createdAt:     Date.now()
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
        adminBtnWrap.style.display = userData.username === ADMIN_USERNAME ? "block" : "none";
    });
  }

  // ── updateBalanceUI ────────────────────────────────────────────
  function updateBalanceUI() {
    if (!userData) return;
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
    couponMsg.textContent = m;
    couponMsg.className   = "coupon-msg " + t;
  }

  // ── loadLeaderboard ────────────────────────────────────────────
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
          <td>
            <div class="lb-name-cell">⚡ ${u.username || "مجهول"}
              ${isYou ? "<span style='color:var(--gold);font-size:.75rem'>(أنت)</span>" : ""}
            </div>
          </td>
          <td><span class="lb-balance">α${(u.balance || 0).toFixed(4)}</span></td>
          <td style="color:#888">α${(u.totalMined || 0).toFixed(4)}</td>
        </tr>`;
      }).join("");
    } catch (e) {
      lbBody.innerHTML = `<tr><td colspan="4" style="color:var(--danger);text-align:center;padding:1rem">${e.message}</td></tr>`;
    }
  }

  // ── loadProfile ────────────────────────────────────────────────
  async function loadProfile() {
    if (!currentUser || !userData) return;

    document.getElementById("profile-name").textContent  = userData.username    || "";
    document.getElementById("profile-email").textContent = userData.email       || currentUser.email || "";
    document.getElementById("profile-balance").textContent = (userData.balance  || 0).toFixed(4);
    document.getElementById("profile-total").textContent   = (userData.totalMined || 0).toFixed(4);

    const count = userData.lastMineDate === todayStr() ? (userData.dailyMineCount || 0) : 0;
    document.getElementById("profile-daily").textContent = `${count}/50`;

    // Calculate rank
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

  // ── Helpers ────────────────────────────────────────────────────
  function setErr(el, msg) { if (el) el.textContent = msg; }
  function clearErrors() {
    setErr(loginErr, "");
    setErr(regErr,   "");
  }

  function authError(code) {
    const m = {
      "auth/user-not-found":         "البريد الإلكتروني غير مسجل",
      "auth/wrong-password":         "كلمة المرور خاطئة",
      "auth/invalid-credential":     "البريد الإلكتروني أو كلمة المرور خاطئة",
      "auth/email-already-in-use":   "هذا البريد الإلكتروني مسجل بالفعل",
      "auth/weak-password":          "كلمة المرور ضعيفة (8 أحرف على الأقل)",
      "auth/too-many-requests":      "محاولات كثيرة، انتظر قليلاً",
      "auth/network-request-failed": "خطأ في الاتصال، تحقق من الإنترنت",
      "auth/invalid-email":          "صيغة البريد الإلكتروني غير صحيحة",
      "auth/operation-not-allowed":  "يجب تفعيل Email/Password في Firebase Console",
    };
    return m[code] || `خطأ: ${code}`;
  }
  