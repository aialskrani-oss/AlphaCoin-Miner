import { auth, db, ADMIN_USERNAME } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  ref, get, set, update, onValue, query, orderByChild, equalTo
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const DOMAIN = "@alphacoin.app";

// ── DOM ────────────────────────────────────────────────────────
const loadingEl    = document.getElementById("loading");
const authScreen   = document.getElementById("auth-screen");
const mainScreen   = document.getElementById("main-screen");
const loginUser    = document.getElementById("login-user");
const loginPass    = document.getElementById("login-pass");
const loginBtn     = document.getElementById("login-btn");
const loginErr     = document.getElementById("login-err");
const regUser      = document.getElementById("reg-user");
const regCc        = document.getElementById("reg-cc");
const regPhone     = document.getElementById("reg-phone");
const regPass      = document.getElementById("reg-pass");
const regPass2     = document.getElementById("reg-pass2");
const regBtn       = document.getElementById("reg-btn");
const regErr       = document.getElementById("reg-err");
const navName      = document.getElementById("nav-name");
const btnLogout    = document.getElementById("btn-logout");
const balanceVal   = document.getElementById("balance-val");
const totalMined   = document.getElementById("total-mined");
const dailyCount   = document.getElementById("daily-count");
const minesLeft    = document.getElementById("mines-left");
const mineBtn      = document.getElementById("mine-btn");
const couponInp    = document.getElementById("coupon-inp");
const couponBtn    = document.getElementById("coupon-btn");
const couponMsg    = document.getElementById("coupon-msg");
const lbBody       = document.getElementById("lb-body");
const profileName  = document.getElementById("profile-name");
const profilePhone = document.getElementById("profile-phone");
const profileBal   = document.getElementById("profile-balance");
const profileTotal = document.getElementById("profile-total");
const profileDaily = document.getElementById("profile-daily");
const profileRank  = document.getElementById("profile-rank");
const adminBtnWrap = document.getElementById("admin-btn-wrap");
const toastEl      = document.getElementById("toast");

// ── Particles ─────────────────────────────────────────────────
(function() {
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
  toastTimer = setTimeout(() => toastEl.className = "toast", 2800);
}

// ── Auth tabs ──────────────────────────────────────────────────
document.querySelectorAll(".auth-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.atab;
    document.getElementById("atab-login").style.display    = tab === "login"    ? "flex" : "none";
    document.getElementById("atab-register").style.display = tab === "register" ? "flex" : "none";
    clearErr();
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

// ── Login ──────────────────────────────────────────────────────
loginBtn.addEventListener("click", doLogin);
loginPass.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
loginUser.addEventListener("keydown", e => { if (e.key === "Enter") loginPass.focus(); });

async function doLogin() {
  const username = loginUser.value.trim().toLowerCase();
  const password = loginPass.value;
  if (!username) { setErr(loginErr, "أدخل اسم المستخدم"); return; }
  if (!password) { setErr(loginErr, "أدخل كلمة المرور"); return; }

  setErr(loginErr, "");
  loginBtn.disabled = true;
  loginBtn.textContent = "جار الدخول…";

  try {
    await signInWithEmailAndPassword(auth, username + DOMAIN, password);
  } catch (e) {
    setErr(loginErr, authError(e.code));
    loginBtn.disabled = false;
    loginBtn.textContent = "دخول ⚡";
  }
}

// ── Register ───────────────────────────────────────────────────
regBtn.addEventListener("click", doRegister);
regPass2.addEventListener("keydown", e => { if (e.key === "Enter") doRegister(); });

async function doRegister() {
  const username = regUser.value.trim().toLowerCase();
  const phone    = (regCc.value + regPhone.value.replace(/\D/g,"").replace(/^0+/,"")).trim();
  const password = regPass.value;
  const password2= regPass2.value;

  if (!username || username.length < 3) { setErr(regErr, "اسم المستخدم 3 أحرف على الأقل"); return; }
  if (!/^[a-z0-9_]+$/.test(username))  { setErr(regErr, "اسم المستخدم: أحرف إنجليزية وأرقام وشرطة سفلية فقط"); return; }
  if (regPhone.value.replace(/\D/g,"").length < 7) { setErr(regErr, "أدخل رقم هاتف صحيح"); return; }
  if (password.length < 8)  { setErr(regErr, "كلمة المرور 8 أحرف على الأقل"); return; }
  if (password !== password2){ setErr(regErr, "كلمتا المرور غير متطابقتين"); return; }
  if (username === ADMIN_USERNAME) { setErr(regErr, "اسم المستخدم هذا محجوز"); return; }

  setErr(regErr, "");
  regBtn.disabled = true;
  regBtn.textContent = "جار الإنشاء…";

  try {
    const cred = await createUserWithEmailAndPassword(auth, username + DOMAIN, password);
    await set(ref(db, `users/${cred.user.uid}`), {
      username, phone,
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
    authScreen.style.display = "none";
    mainScreen.style.display = "flex";
    resetAuthForms();
    await ensureUserRecord(user);
    listenUserData(user.uid);
  } else {
    currentUser = null;
    userData    = null;
    authScreen.style.display = "flex";
    mainScreen.style.display = "none";
  }
});

btnLogout.addEventListener("click", () => signOut(auth));

function resetAuthForms() {
  loginUser.value = ""; loginPass.value = "";
  regUser.value = ""; regPhone.value = ""; regPass.value = ""; regPass2.value = "";
  loginBtn.disabled = false; loginBtn.textContent = "دخول ⚡";
  regBtn.disabled   = false; regBtn.textContent   = "إنشاء الحساب";
  clearErr();
}

// ── Ensure user record ─────────────────────────────────────────
async function ensureUserRecord(user) {
  const snap = await get(ref(db, `users/${user.uid}`));
  if (!snap.exists()) {
    const uname = user.email?.replace(DOMAIN, "") || user.uid.slice(0,8);
    await set(ref(db, `users/${user.uid}`), {
      username: uname, phone: "",
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
    const todayKey = todayStr();
    const sameDay  = userData.lastMineDate === todayKey;
    const count    = sameDay ? (userData.dailyMineCount || 0) : 0;
    const left     = 50 - count;

    balanceVal.textContent = (userData.balance || 0).toFixed(4);
    totalMined.textContent = (userData.totalMined || 0).toFixed(4);
    dailyCount.textContent = count;
    minesLeft.textContent  = Math.max(0, left);
    mineBtn.disabled       = left <= 0;
    navName.textContent    = userData.username || "";

    if (adminBtnWrap)
      adminBtnWrap.style.display = (userData.username === ADMIN_USERNAME) ? "block" : "none";
  });
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
  const newBal   = parseFloat(((userData.balance || 0) + reward).toFixed(4));
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
  el.className = "float-reward"; el.textContent = text;
  const r = mineBtn.getBoundingClientRect();
  el.style.left = (r.left + r.width / 2 - 55) + "px";
  el.style.top  = (r.top - 10) + "px";
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

// ── Coupon ─────────────────────────────────────────────────────
couponBtn.addEventListener("click", redeemCoupon);
couponInp.addEventListener("keydown", e => { if (e.key === "Enter") redeemCoupon(); });

async function redeemCoupon() {
  const code = couponInp.value.trim().toUpperCase();
  if (!code) { setCouponMsg("أدخل كود القسيمة", "err"); return; }
  if (!currentUser) return;
  couponBtn.disabled = true;
  setCouponMsg("جار التحقق…", "");
  try {
    const cpRef = ref(db, `coupons/${code}`);
    const snap  = await get(cpRef);
    if (!snap.exists())   { setCouponMsg("القسيمة غير موجودة", "err"); return; }
    const cp = snap.val();
    if (!cp.isActive)     { setCouponMsg("القسيمة غير نشطة", "err"); return; }
    const usedBy = (cp.usedBy && typeof cp.usedBy === 'object' && !Array.isArray(cp.usedBy)) ? cp.usedBy : {};
      if (usedBy[currentUser.uid]) { setCouponMsg("استخدمت هذه القسيمة من قبل", "err"); return; }
      const newBal = parseFloat(((userData.balance || 0) + cp.rewardAmount).toFixed(4));
      await update(ref(db, `users/${currentUser.uid}`), { balance: newBal });
      await update(ref(db, `coupons/${code}/usedBy`), { [currentUser.uid]: true });
      setCouponMsg("استخدمت هذه القسيمة من قبل", "err"); return; }
    const newBal = parseFloat(((userData.balance || 0) + cp.rewardAmount).toFixed(4));
    await update(ref(db, `users/${currentUser.uid}`), { balance: newBal });
    await update(cpRef, { usedBy: [...used, currentUser.uid] });
    setCouponMsg(`تم! +α${cp.rewardAmount} 🎉`, "ok");
    couponInp.value = "";
    showToast(`+α${cp.rewardAmount} تم استبدال القسيمة!`);
  } catch (e) {
    setCouponMsg("خطأ: " + e.message, "err");
  } finally {
    couponBtn.disabled = false;
  }
}
function setCouponMsg(m, t) { couponMsg.textContent = m; couponMsg.className = "coupon-msg " + t; }

// ── Leaderboard ────────────────────────────────────────────────
async function loadLeaderboard() {
  lbBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:#555">جار التحميل…</td></tr>`;
  try {
    const snap = await get(ref(db, "users"));
    if (!snap.exists()) { lbBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:#555">لا يوجد مستخدمون بعد</td></tr>`; return; }
    const users = [];
    snap.forEach(c => users.push({ uid: c.key, ...c.val() }));
    users.sort((a, b) => (b.balance || 0) - (a.balance || 0));
    lbBody.innerHTML = users.map((u, i) => {
      const r = i + 1;
      const medal = r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : r;
      const cls   = r <= 3 ? `r${r}` : "";
      const isYou = currentUser && u.uid === currentUser.uid;
      return `<tr class="${isYou ? "lb-you" : ""}">
        <td><span class="lb-rank ${cls}">${medal}</span></td>
        <td><div class="lb-name-cell">⚡ ${u.username || "مجهول"}${isYou ? " <span style='color:var(--gold);font-size:.75rem'>(أنت)</span>" : ""}</div></td>
        <td><span class="lb-balance">α${(u.balance||0).toFixed(4)}</span></td>
        <td style="color:#888">α${(u.totalMined||0).toFixed(4)}</td>
      </tr>`;
    }).join("");
  } catch (e) {
    lbBody.innerHTML = `<tr><td colspan="4" style="color:var(--danger);text-align:center;padding:1rem">${e.message}</td></tr>`;
  }
}

// ── Profile ────────────────────────────────────────────────────
async function loadProfile() {
  if (!currentUser || !userData) return;
  profileName.textContent  = userData.username || "";
  profilePhone.textContent = userData.phone || "";
  profileBal.textContent   = (userData.balance || 0).toFixed(4);
  profileTotal.textContent = (userData.totalMined || 0).toFixed(4);
  const count = userData.lastMineDate === todayStr() ? (userData.dailyMineCount || 0) : 0;
  profileDaily.textContent = `${count}/50`;
  try {
    const snap = await get(ref(db, "users"));
    if (snap.exists()) {
      const arr = []; snap.forEach(c => arr.push({ uid: c.key, bal: c.val().balance || 0 }));
      arr.sort((a,b) => b.bal - a.bal);
      const idx = arr.findIndex(u => u.uid === currentUser.uid);
      profileRank.textContent = idx >= 0 ? `#${idx+1}` : "-";
    }
  } catch {}
}

// ── Helpers ────────────────────────────────────────────────────
function setErr(el, msg) { el.textContent = msg; }
function clearErr() { setErr(loginErr,""); setErr(regErr,""); }

function authError(code) {
  const m = {
    "auth/user-not-found":          "اسم المستخدم غير موجود",
    "auth/wrong-password":          "كلمة المرور خاطئة",
    "auth/invalid-credential":      "اسم المستخدم أو كلمة المرور خاطئة",
    "auth/email-already-in-use":    "اسم المستخدم مستخدم بالفعل، اختر غيره",
    "auth/weak-password":           "كلمة المرور ضعيفة (8 أحرف على الأقل)",
    "auth/too-many-requests":       "محاولات كثيرة، انتظر قليلاً",
    "auth/network-request-failed":  "خطأ في الاتصال، تحقق من الإنترنت",
    "auth/invalid-email":           "خطأ داخلي، تواصل مع الدعم",
    "auth/operation-not-allowed":   "يجب تفعيل Email/Password في Firebase Console أولاً",
  };
  return m[code] || `خطأ: ${code}`;
}
