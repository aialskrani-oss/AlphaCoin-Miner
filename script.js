import { auth, db, ADMIN_EMAIL } from "./firebase-config.js";
import {
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  ref, get, set, update, onValue, query, orderByChild, limitToLast
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// ── DOM refs ──────────────────────────────────────────────────
const loadingEl   = document.getElementById("loading");
const authScreen  = document.getElementById("auth-screen");
const mainScreen  = document.getElementById("main-screen");
const btnLogin    = document.getElementById("btn-login");
const btnLogout   = document.getElementById("btn-logout");
const navAvatar   = document.getElementById("nav-avatar");
const navName     = document.getElementById("nav-name");
const balanceVal  = document.getElementById("balance-val");
const totalMined  = document.getElementById("total-mined");
const dailyCount  = document.getElementById("daily-count");
const minesLeft   = document.getElementById("mines-left");
const mineBtn     = document.getElementById("mine-btn");
const couponInp   = document.getElementById("coupon-inp");
const couponBtn   = document.getElementById("coupon-btn");
const couponMsg   = document.getElementById("coupon-msg");
const lbBody      = document.getElementById("lb-body");
const profileAvatar = document.getElementById("profile-avatar");
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
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      top:${Math.random() * 100 + 100}%;
      animation-duration:${Math.random() * 15 + 10}s;
      animation-delay:${Math.random() * 10}s;
    `;
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

// ── Auth ───────────────────────────────────────────────────────
let currentUser = null;
let userData    = null;

btnLogin.addEventListener("click", () => {
  btnLogin.disabled = true;
  btnLogin.textContent = "جار فتح نافذة الدخول…";

  // Open auth page in a new top-level window (works outside iframe restrictions)
  const w = 500, h = 600;
  const left = Math.max(0, (screen.width  - w) / 2);
  const top  = Math.max(0, (screen.height - h) / 2);
  const authWin = window.open(
    "auth.html",
    "AlphaCoinAuth",
    `width=${w},height=${h},left=${left},top=${top},resizable=no`
  );

  // Listen for success message from auth window
  function onMessage(e) {
    if (e.data && e.data.type === "AUTH_SUCCESS") {
      window.removeEventListener("message", onMessage);
      btnLogin.disabled = false;
      btnLogin.innerHTML = `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:22px"> تسجيل الدخول بـ Google`;
      if (authWin && !authWin.closed) authWin.close();
    }
  }
  window.addEventListener("message", onMessage);

  // Re-enable button if auth window is closed without logging in
  const checkClosed = setInterval(() => {
    if (!authWin || authWin.closed) {
      clearInterval(checkClosed);
      window.removeEventListener("message", onMessage);
      btnLogin.disabled = false;
      btnLogin.innerHTML = `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:22px"> تسجيل الدخول بـ Google`;
    }
  }, 800);
});

btnLogout.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async user => {
  loadingEl.style.display = "none";
  if (user) {
    currentUser = user;
    authScreen.style.display  = "none";
    mainScreen.style.display  = "flex";
    navAvatar.src  = user.photoURL || "";
    navName.textContent = user.displayName || user.email;
    await ensureUserRecord(user);
    listenUserData(user.uid);
  } else {
    currentUser = null;
    userData    = null;
    authScreen.style.display  = "flex";
    mainScreen.style.display  = "none";
  }
});

// ── User record ────────────────────────────────────────────────
async function ensureUserRecord(user) {
  const userRef = ref(db, `users/${user.uid}`);
  const snap = await get(userRef);
  if (!snap.exists()) {
    await set(userRef, {
      email: user.email,
      name: user.displayName || "",
      photoURL: user.photoURL || "",
      balance: 0,
      totalMined: 0,
      lastMineDate: "",
      dailyMineCount: 0
    });
  } else {
    await update(userRef, {
      email: user.email,
      name: user.displayName || "",
      photoURL: user.photoURL || ""
    });
  }
}

// ── Live user data ─────────────────────────────────────────────
function listenUserData(uid) {
  const userRef = ref(db, `users/${uid}`);
  onValue(userRef, snap => {
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
    mineBtn.disabled = left <= 0;

    if (adminBtnWrap) {
      adminBtnWrap.style.display = (userData.email === ADMIN_EMAIL) ? "block" : "none";
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

  const todayKey   = todayStr();
  const sameDay    = userData.lastMineDate === todayKey;
  const dailyC     = sameDay ? (userData.dailyMineCount || 0) : 0;

  if (dailyC >= 50) {
    showToast("لقد وصلت للحد اليومي (50 عملية)", "err");
    return;
  }

  const reward = parseFloat((Math.random() * 0.9 + 0.1).toFixed(4));
  const newBal  = parseFloat(((userData.balance || 0) + reward).toFixed(4));
  const newTotal = parseFloat(((userData.totalMined || 0) + reward).toFixed(4));
  const newCount = dailyC + 1;

  try {
    await update(ref(db, `users/${currentUser.uid}`), {
      balance: newBal,
      totalMined: newTotal,
      lastMineDate: todayKey,
      dailyMineCount: newCount
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
  el.className = "float-reward";
  el.textContent = text;
  const rect = mineBtn.getBoundingClientRect();
  el.style.left = (rect.left + rect.width / 2 - 60) + "px";
  el.style.top  = (rect.top - 10) + "px";
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
    const cpRef  = ref(db, `coupons/${code}`);
    const snap   = await get(cpRef);

    if (!snap.exists()) { setCouponMsg("القسيمة غير موجودة", "err"); return; }

    const cp = snap.val();
    if (!cp.isActive) { setCouponMsg("هذه القسيمة غير نشطة", "err"); return; }

    const usedBy = cp.usedBy ? Object.values(cp.usedBy) : [];
    if (usedBy.includes(currentUser.uid)) { setCouponMsg("لقد استخدمت هذه القسيمة من قبل", "err"); return; }

    const newUsedBy = [...usedBy, currentUser.uid];
    const newBal = parseFloat(((userData.balance || 0) + cp.rewardAmount).toFixed(4));

    await update(ref(db, `users/${currentUser.uid}`), { balance: newBal });
    await update(cpRef, { usedBy: newUsedBy });

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
    const usersRef = ref(db, "users");
    const snap = await get(usersRef);
    if (!snap.exists()) { lbBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:#555">لا يوجد مستخدمون بعد</td></tr>`; return; }

    const users = [];
    snap.forEach(child => users.push({ uid: child.key, ...child.val() }));
    users.sort((a, b) => (b.balance || 0) - (a.balance || 0));

    lbBody.innerHTML = users.map((u, i) => {
      const rank    = i + 1;
      const rankCls = rank === 1 ? "r1" : rank === 2 ? "r2" : rank === 3 ? "r3" : "";
      const isYou   = currentUser && u.uid === currentUser.uid;
      const medal   = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
      return `<tr class="${isYou ? "lb-you" : ""}">
        <td><span class="lb-rank ${rankCls}">${medal}</span></td>
        <td>
          <div class="lb-name-cell">
            <img class="lb-avatar" src="${u.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(u.name || "?")}">
            ${u.name || "مجهول"} ${isYou ? "<span style='color:var(--gold);font-size:.75rem'>(أنت)</span>" : ""}
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

// ── Profile ────────────────────────────────────────────────────
async function loadProfile() {
  if (!currentUser || !userData) return;
  profileAvatar.src   = currentUser.photoURL || "";
  profileName.textContent  = userData.name || currentUser.displayName || "";
  profileEmail.textContent = userData.email || "";
  profileBal.textContent   = (userData.balance || 0).toFixed(4);
  profileTotal.textContent = (userData.totalMined || 0).toFixed(4);

  const todayKey = todayStr();
  const sameDay  = userData.lastMineDate === todayKey;
  const count    = sameDay ? (userData.dailyMineCount || 0) : 0;
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
