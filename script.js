import { auth, db, ADMIN_EMAIL } from "./firebase-config.js";
import {
  RecaptchaVerifier, signInWithPhoneNumber, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  ref, get, set, update, onValue
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// ── DOM refs ──────────────────────────────────────────────────
const loadingEl     = document.getElementById("loading");
const authScreen    = document.getElementById("auth-screen");
const mainScreen    = document.getElementById("main-screen");
const stepPhone     = document.getElementById("step-phone");
const stepOtp       = document.getElementById("step-otp");
const countryCode   = document.getElementById("country-code");
const phoneInp      = document.getElementById("phone-inp");
const sendOtpBtn    = document.getElementById("send-otp-btn");
const phoneMsg      = document.getElementById("phone-msg");
const otpHint       = document.getElementById("otp-hint");
const verifyBtn     = document.getElementById("verify-btn");
const otpMsg        = document.getElementById("otp-msg");
const backBtn       = document.getElementById("back-btn");
const otpBoxes      = document.querySelectorAll(".otp-inp");
const navName       = document.getElementById("nav-name");
const btnLogout     = document.getElementById("btn-logout");
const balanceVal    = document.getElementById("balance-val");
const totalMined    = document.getElementById("total-mined");
const dailyCount    = document.getElementById("daily-count");
const minesLeft     = document.getElementById("mines-left");
const mineBtn       = document.getElementById("mine-btn");
const couponInp     = document.getElementById("coupon-inp");
const couponBtn     = document.getElementById("coupon-btn");
const couponMsg     = document.getElementById("coupon-msg");
const lbBody        = document.getElementById("lb-body");
const profileName   = document.getElementById("profile-name");
const profileEmail  = document.getElementById("profile-email");
const profileBal    = document.getElementById("profile-balance");
const profileTotal  = document.getElementById("profile-total");
const profileDaily  = document.getElementById("profile-daily");
const profileRank   = document.getElementById("profile-rank");
const adminBtnWrap  = document.getElementById("admin-btn-wrap");
const toastEl       = document.getElementById("toast");

// ── Particles ─────────────────────────────────────────────────
(function spawnParticles() {
  const container = document.getElementById("particles");
  for (let i = 0; i < 30; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 4 + 1;
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*100+100}%;animation-duration:${Math.random()*15+10}s;animation-delay:${Math.random()*10}s;`;
    container.appendChild(p);
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

// ── Tabs ───────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab === "leaderboard") loadLeaderboard();
    if (btn.dataset.tab === "profile") loadProfile();
  });
});

// ── State ──────────────────────────────────────────────────────
let currentUser       = null;
let userData          = null;
let confirmationResult = null;
let recaptchaVerifier  = null;

// ── reCAPTCHA setup ────────────────────────────────────────────
function initRecaptcha() {
  if (recaptchaVerifier) return;
  recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => { recaptchaVerifier = null; }
  });
}

// ── OTP box UX ────────────────────────────────────────────────
otpBoxes.forEach((box, idx) => {
  box.addEventListener("input", () => {
    box.value = box.value.replace(/\D/g, "").slice(-1);
    box.classList.toggle("filled", box.value !== "");
    if (box.value && idx < otpBoxes.length - 1) otpBoxes[idx + 1].focus();
    if (getOtpCode().length === 6) verifyOtp();
  });
  box.addEventListener("keydown", e => {
    if (e.key === "Backspace" && !box.value && idx > 0) {
      otpBoxes[idx - 1].value = "";
      otpBoxes[idx - 1].classList.remove("filled");
      otpBoxes[idx - 1].focus();
    }
  });
  box.addEventListener("paste", e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
    [...text].forEach((ch, i) => {
      if (otpBoxes[i]) { otpBoxes[i].value = ch; otpBoxes[i].classList.add("filled"); }
    });
    if (text.length === 6) verifyOtp();
    else if (otpBoxes[text.length]) otpBoxes[text.length].focus();
  });
});

function getOtpCode() {
  return [...otpBoxes].map(b => b.value).join("");
}

function clearOtp() {
  otpBoxes.forEach(b => { b.value = ""; b.classList.remove("filled"); });
  otpBoxes[0].focus();
}

// ── Send OTP ───────────────────────────────────────────────────
sendOtpBtn.addEventListener("click", sendOtp);
phoneInp.addEventListener("keydown", e => { if (e.key === "Enter") sendOtp(); });

async function sendOtp() {
  const raw    = phoneInp.value.replace(/\D/g, "").replace(/^0+/, "");
  const cc     = countryCode.value;
  const number = cc + raw;

  if (raw.length < 7) { setMsg(phoneMsg, "أدخل رقم هاتف صحيح", "err"); return; }

  setMsg(phoneMsg, "");
  sendOtpBtn.disabled = true;
  sendOtpBtn.textContent = "جار الإرسال…";

  try {
    initRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, number, recaptchaVerifier);
    otpHint.textContent = `تم إرسال رمز SMS إلى ${number}`;
    stepPhone.style.display = "none";
    stepOtp.style.display   = "block";
    otpBoxes[0].focus();
    setMsg(otpMsg, "");
  } catch (e) {
    recaptchaVerifier = null;
    setMsg(phoneMsg, friendlyError(e.code), "err");
    sendOtpBtn.disabled = false;
    sendOtpBtn.textContent = "إرسال رمز التحقق";
  }
}

// ── Verify OTP ─────────────────────────────────────────────────
verifyBtn.addEventListener("click", verifyOtp);

async function verifyOtp() {
  const code = getOtpCode();
  if (code.length < 6) { setMsg(otpMsg, "أدخل الرمز المكون من 6 أرقام", "err"); return; }
  if (!confirmationResult) { setMsg(otpMsg, "أرسل الرمز أولاً", "err"); return; }

  setMsg(otpMsg, "");
  verifyBtn.disabled = true;
  verifyBtn.textContent = "جار التحقق…";

  try {
    await confirmationResult.confirm(code);
    // onAuthStateChanged will handle the rest
  } catch (e) {
    setMsg(otpMsg, friendlyError(e.code), "err");
    verifyBtn.disabled = false;
    verifyBtn.textContent = "تحقق ودخول ⚡";
    clearOtp();
  }
}

// ── Back button ────────────────────────────────────────────────
backBtn.addEventListener("click", () => {
  stepOtp.style.display   = "none";
  stepPhone.style.display = "block";
  sendOtpBtn.disabled     = false;
  sendOtpBtn.textContent  = "إرسال رمز التحقق";
  setMsg(phoneMsg, "");
  confirmationResult = null;
  recaptchaVerifier  = null;
});

// ── Auth state ─────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  loadingEl.style.display = "none";
  if (user) {
    currentUser = user;
    authScreen.style.display = "none";
    mainScreen.style.display = "flex";
    // Reset steps for next logout
    stepPhone.style.display = "block";
    stepOtp.style.display   = "none";
    sendOtpBtn.disabled     = false;
    sendOtpBtn.textContent  = "إرسال رمز التحقق";
    navName.textContent     = user.phoneNumber || user.displayName || "مستخدم";
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

// ── User record ────────────────────────────────────────────────
async function ensureUserRecord(user) {
  const userRef = ref(db, `users/${user.uid}`);
  const snap = await get(userRef);
  const phone = user.phoneNumber || "";
  if (!snap.exists()) {
    await set(userRef, {
      phone,
      name: phone,
      email: "",
      photoURL: "",
      balance: 0,
      totalMined: 0,
      lastMineDate: "",
      dailyMineCount: 0
    });
  } else {
    await update(userRef, { phone });
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

    if (adminBtnWrap) {
      const isAdmin = userData.phone === "+966500000000" || userData.email === ADMIN_EMAIL;
      adminBtnWrap.style.display = isAdmin ? "block" : "none";
    }
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

  if (dailyC >= 50) {
    showToast("لقد وصلت للحد اليومي (50 عملية)", "err");
    return;
  }

  const reward   = parseFloat((Math.random() * 0.9 + 0.1).toFixed(4));
  const newBal   = parseFloat(((userData.balance || 0) + reward).toFixed(4));
  const newTotal = parseFloat(((userData.totalMined || 0) + reward).toFixed(4));

  try {
    await update(ref(db, `users/${currentUser.uid}`), {
      balance: newBal, totalMined: newTotal,
      lastMineDate: todayKey, dailyMineCount: dailyC + 1
    });
    spawnFloatReward(`+α${reward.toFixed(4)}`);
    showToast(`تم التعدين! حصلت على α${reward.toFixed(4)}`);
  } catch (e) {
    showToast("خطأ: " + e.message, "err");
    mineBtn.disabled = false;
  }
});

function spawnFloatReward(text) {
  const el = document.createElement("div");
  el.className   = "float-reward";
  el.textContent = text;
  const rect = mineBtn.getBoundingClientRect();
  el.style.left  = (rect.left + rect.width / 2 - 60) + "px";
  el.style.top   = (rect.top - 10) + "px";
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

// ── Coupon ─────────────────────────────────────────────────────
couponBtn.addEventListener("click", redeemCoupon);
couponInp.addEventListener("keydown", e => { if (e.key === "Enter") redeemCoupon(); });

async function redeemCoupon() {
  const code = couponInp.value.trim().toUpperCase();
  if (!code) { setCouponMsg("أدخل كود القسيمة أولاً", "err"); return; }
  if (!currentUser) return;

  couponBtn.disabled = true;
  setCouponMsg("جار التحقق…", "");

  try {
    const cpRef = ref(db, `coupons/${code}`);
    const snap  = await get(cpRef);
    if (!snap.exists()) { setCouponMsg("القسيمة غير موجودة", "err"); return; }
    const cp = snap.val();
    if (!cp.isActive) { setCouponMsg("هذه القسيمة غير نشطة", "err"); return; }
    const usedBy = cp.usedBy ? Object.values(cp.usedBy) : [];
    if (usedBy.includes(currentUser.uid)) { setCouponMsg("لقد استخدمت هذه القسيمة من قبل", "err"); return; }

    const newBal = parseFloat(((userData.balance || 0) + cp.rewardAmount).toFixed(4));
    await update(ref(db, `users/${currentUser.uid}`), { balance: newBal });
    await update(cpRef, { usedBy: [...usedBy, currentUser.uid] });

    setCouponMsg(`تم! حصلت على α${cp.rewardAmount} 🎉`, "ok");
    couponInp.value = "";
    showToast(`تم استبدال القسيمة! +α${cp.rewardAmount}`);
  } catch (e) {
    setCouponMsg("خطأ: " + e.message, "err");
  } finally {
    couponBtn.disabled = false;
  }
}

function setCouponMsg(msg, type) {
  couponMsg.textContent = msg;
  couponMsg.className   = "coupon-msg " + type;
}

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
      const rank  = i + 1;
      const cls   = rank === 1 ? "r1" : rank === 2 ? "r2" : rank === 3 ? "r3" : "";
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
      const isYou = currentUser && u.uid === currentUser.uid;
      const label = u.name || u.phone || "مجهول";
      return `<tr class="${isYou ? "lb-you" : ""}">
        <td><span class="lb-rank ${cls}">${medal}</span></td>
        <td><div class="lb-name-cell"><span style="font-size:1.4rem">📱</span> ${label} ${isYou ? "<span style='color:var(--gold);font-size:.75rem'>(أنت)</span>" : ""}</div></td>
        <td><span class="lb-balance">α${(u.balance || 0).toFixed(4)}</span></td>
        <td style="color:#888">α${(u.totalMined || 0).toFixed(4)}</td>
      </tr>`;
    }).join("");
  } catch (e) {
    lbBody.innerHTML = `<tr><td colspan="4" style="color:var(--danger);text-align:center;padding:1rem">${e.message}</td></tr>`;
  }
}

// ── Profile ────────────────────────────────────────────────────
async function loadProfile() {
  if (!currentUser || !userData) return;
  profileName.textContent  = userData.name  || currentUser.phoneNumber || "";
  profileEmail.textContent = currentUser.phoneNumber || "";
  profileBal.textContent   = (userData.balance || 0).toFixed(4);
  profileTotal.textContent = (userData.totalMined || 0).toFixed(4);
  const todayKey = todayStr();
  const count = userData.lastMineDate === todayKey ? (userData.dailyMineCount || 0) : 0;
  profileDaily.textContent = `${count}/50`;
  try {
    const snap = await get(ref(db, "users"));
    if (snap.exists()) {
      const users = [];
      snap.forEach(c => users.push({ uid: c.key, balance: c.val().balance || 0 }));
      users.sort((a, b) => b.balance - a.balance);
      const idx = users.findIndex(u => u.uid === currentUser.uid);
      profileRank.textContent = idx >= 0 ? `#${idx + 1}` : "-";
    }
  } catch {}
}

// ── Helpers ────────────────────────────────────────────────────
function setMsg(el, msg, type = "") {
  el.textContent = msg;
  el.className   = "auth-msg " + type;
}

function friendlyError(code) {
  const map = {
    "auth/invalid-phone-number":       "رقم الهاتف غير صحيح",
    "auth/too-many-requests":          "محاولات كثيرة، انتظر قليلاً",
    "auth/invalid-verification-code":  "رمز التحقق خاطئ",
    "auth/code-expired":               "انتهت صلاحية الرمز، أعد الإرسال",
    "auth/missing-phone-number":       "أدخل رقم الهاتف",
    "auth/quota-exceeded":             "تجاوزت الحد المسموح، حاول لاحقاً",
    "auth/captcha-check-failed":       "فشل التحقق، أعد المحاولة",
  };
  return map[code] || "خطأ: " + code;
}
