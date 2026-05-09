import { auth, db, ADMIN_USERNAME } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  ref, get, set, update, remove, onValue, query, orderByChild, equalTo
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const DOMAIN = "@alphacoin.app";

// ── DOM ────────────────────────────────────────────────────────
const loadingEl      = document.getElementById("loading");
const deniedView     = document.getElementById("denied-view");
const adminLogin     = document.getElementById("admin-login");
const adminApp       = document.getElementById("admin-app");
const adminUserLabel = document.getElementById("admin-user-label");
const admUser        = document.getElementById("adm-user");
const admPass        = document.getElementById("adm-pass");
const admErr         = document.getElementById("adm-err");
const admLoginBtn    = document.getElementById("adm-login-btn");
const admPassToggle  = document.getElementById("adm-pass-toggle");
const adminLogout    = document.getElementById("admin-logout");

const couponCodeInp  = document.getElementById("coupon-code-inp");
const couponRewardInp= document.getElementById("coupon-reward-inp");
const createCouponBtn= document.getElementById("create-coupon-btn");
const couponResult   = document.getElementById("coupon-result");

const editUserInp    = document.getElementById("edit-user-inp");
const editBalInp     = document.getElementById("edit-balance-inp");
const editBalBtn     = document.getElementById("edit-balance-btn");
const editResult     = document.getElementById("edit-result");

const usersBody      = document.getElementById("users-body");
const couponsBody    = document.getElementById("coupons-body");
const searchInp      = document.getElementById("search-inp");

const statUsers      = document.getElementById("stat-users");
const statBal        = document.getElementById("stat-total-balance");
const statCoupons    = document.getElementById("stat-coupons");
const toastEl        = document.getElementById("toast");

let allUsers = [];

// ── Toast ──────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = "ok") {
  toastEl.textContent = msg;
  toastEl.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.className = "toast", 2800);
}
function setResult(el, msg, ok) {
  el.textContent = msg;
  el.style.color = ok ? "var(--success)" : "var(--danger)";
}

// ── Password toggle ────────────────────────────────────────────
admPassToggle?.addEventListener("click", () => {
  admPass.type = admPass.type === "password" ? "text" : "password";
  admPassToggle.textContent = admPass.type === "password" ? "👁" : "🙈";
});

// ── Auth guard ─────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  loadingEl.style.display = "none";

  if (!user) {
    showAdminLogin();
    return;
  }

  // Verify admin by username in DB
  const snap = await get(ref(db, `users/${user.uid}`));
  const udata = snap.exists() ? snap.val() : null;

  if (!udata || udata.username !== ADMIN_USERNAME) {
    deniedView.style.display = "flex";
    return;
  }

  adminApp.style.display = "block";
  if (adminUserLabel) adminUserLabel.textContent = udata.username;
  loadAll();
});

function showAdminLogin() {
  adminLogin.style.display = "flex";
}

// ── Admin login ────────────────────────────────────────────────
admLoginBtn?.addEventListener("click", doAdminLogin);
admPass?.addEventListener("keydown", e => { if (e.key === "Enter") doAdminLogin(); });

async function doAdminLogin() {
  const username = admUser.value.trim().toLowerCase();
  const password = admPass.value;
  if (!username) { admErr.textContent = "أدخل اسم المستخدم"; return; }
  if (!password) { admErr.textContent = "أدخل كلمة المرور"; return; }

  admErr.textContent = "";
  admLoginBtn.disabled = true;
  admLoginBtn.textContent = "جار الدخول…";

  try {
    await signInWithEmailAndPassword(auth, username + DOMAIN, password);
  } catch (e) {
    const errs = {
      "auth/user-not-found":     "اسم المستخدم غير موجود",
      "auth/wrong-password":     "كلمة المرور خاطئة",
      "auth/invalid-credential": "اسم المستخدم أو كلمة المرور خاطئة",
      "auth/too-many-requests":  "محاولات كثيرة، انتظر قليلاً",
    };
    admErr.textContent = errs[e.code] || "خطأ: " + e.message;
    admLoginBtn.disabled = false;
    admLoginBtn.textContent = "دخول لوحة الأدمن";
  }
}

adminLogout?.addEventListener("click", () => signOut(auth));

// ── Load all data ──────────────────────────────────────────────
function loadAll() {
  onValue(ref(db, "users"), snap => {
    allUsers = [];
    let totalBal = 0;
    if (snap.exists()) {
      snap.forEach(c => {
        allUsers.push({ uid: c.key, ...c.val() });
        totalBal += c.val().balance || 0;
      });
    }
    statUsers.textContent = allUsers.length;
    statBal.textContent   = totalBal.toFixed(2);
    renderUsers(allUsers);
  });
  onValue(ref(db, "coupons"), snap => {
    let count = 0;
    const rows = [];
    if (snap.exists()) {
      snap.forEach(c => { count++; rows.push({ code: c.key, ...c.val() }); });
    }
    statCoupons.textContent = count;
    renderCoupons(rows);
  });
}

// ── Render users ───────────────────────────────────────────────
function renderUsers(users) {
  if (!users.length) {
    usersBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#555">لا يوجد مستخدمون</td></tr>`;
    return;
  }
  const sorted = [...users].sort((a, b) => (b.balance || 0) - (a.balance || 0));
  usersBody.innerHTML = sorted.map((u, i) => `
    <tr>
      <td style="color:#555">${i+1}</td>
      <td><strong>${u.username || "—"}</strong>${u.username === ADMIN_USERNAME ? ' <span style="color:var(--gold);font-size:.75rem">(أدمن)</span>' : ""}</td>
      <td style="direction:ltr;color:#888">${u.phone || "—"}</td>
      <td><span style="color:var(--gold);font-family:'Orbitron',monospace">α${(u.balance||0).toFixed(4)}</span></td>
      <td style="color:#888">α${(u.totalMined||0).toFixed(4)}</td>
      <td>
        <button class="btn-sm btn-del" onclick="deleteUser('${u.uid}','${u.username||""}')">حذف</button>
      </td>
    </tr>`).join("");
}

// ── Search ─────────────────────────────────────────────────────
searchInp?.addEventListener("input", () => {
  const q = searchInp.value.trim().toLowerCase();
  if (!q) { renderUsers(allUsers); return; }
  renderUsers(allUsers.filter(u =>
    (u.username||"").toLowerCase().includes(q) ||
    (u.phone||"").includes(q)
  ));
});

// ── Delete user ────────────────────────────────────────────────
window.deleteUser = async (uid, uname) => {
  if (!confirm(`حذف المستخدم "${uname}"؟ لا يمكن التراجع!`)) return;
  try {
    await remove(ref(db, `users/${uid}`));
    showToast(`تم حذف ${uname}`);
  } catch (e) { showToast("خطأ: " + e.message, "err"); }
};

// ── Render coupons ─────────────────────────────────────────────
function renderCoupons(rows) {
  if (!rows.length) {
    couponsBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#555">لا توجد قسائم</td></tr>`;
    return;
  }
  couponsBody.innerHTML = rows.map(c => `
    <tr>
      <td><span class="coupon-badge">${c.code}</span></td>
      <td style="color:var(--gold);font-family:'Orbitron',monospace">α${c.rewardAmount}</td>
      <td><span style="color:${c.isActive ? "var(--success)" : "var(--danger)"}">${c.isActive ? "✅ نشطة" : "❌ معطلة"}</span></td>
      <td style="color:#888">${c.usedBy && typeof c.usedBy === 'object' ? Object.keys(c.usedBy).length : 0}</td>
      <td style="display:flex;gap:.4rem;flex-wrap:wrap">
        <button class="btn-sm btn-edit" onclick="toggleCoupon('${c.code}',${c.isActive})">${c.isActive ? "تعطيل" : "تفعيل"}</button>
        <button class="btn-sm btn-del" onclick="deleteCoupon('${c.code}')">حذف</button>
      </td>
    </tr>`).join("");
}

// ── Create coupon ──────────────────────────────────────────────
createCouponBtn?.addEventListener("click", async () => {
  const code   = couponCodeInp.value.trim().toUpperCase();
  const reward = parseFloat(couponRewardInp.value);
  if (!code)        { setResult(couponResult, "أدخل كود القسيمة", false); return; }
  if (isNaN(reward) || reward <= 0) { setResult(couponResult, "أدخل مكافأة صحيحة", false); return; }

  createCouponBtn.disabled = true;
  try {
    const snap = await get(ref(db, `coupons/${code}`));
    if (snap.exists()) { setResult(couponResult, "الكود موجود بالفعل", false); return; }
    await set(ref(db, `coupons/${code}`), {
      rewardAmount: reward, isActive: true,
      usedBy: {}, createdAt: Date.now()
    });
    setResult(couponResult, `✅ تم إنشاء ${code}`, true);
    couponCodeInp.value = ""; couponRewardInp.value = "";
    showToast(`قسيمة ${code} أُنشئت!`);
  } catch (e) { setResult(couponResult, "خطأ: " + e.message, false); }
  finally     { createCouponBtn.disabled = false; }
});

// ── Edit balance ───────────────────────────────────────────────
editBalBtn?.addEventListener("click", async () => {
  const username = editUserInp.value.trim().toLowerCase();
  const balance  = parseFloat(editBalInp.value);
  if (!username)      { setResult(editResult, "أدخل اسم المستخدم", false); return; }
  if (isNaN(balance)) { setResult(editResult, "أدخل رصيداً صحيحاً", false); return; }

  editBalBtn.disabled = true;
  try {
    const snap = await get(query(ref(db, "users"), orderByChild("username"), equalTo(username)));
    if (!snap.exists()) { setResult(editResult, "المستخدم غير موجود", false); return; }
    let uid;
    snap.forEach(c => { uid = c.key; });
    await update(ref(db, `users/${uid}`), { balance });
    setResult(editResult, `✅ تم تحديث رصيد ${username} إلى α${balance}`, true);
    showToast(`رصيد ${username} = α${balance}`);
    editUserInp.value = ""; editBalInp.value = "";
  } catch (e) { setResult(editResult, "خطأ: " + e.message, false); }
  finally     { editBalBtn.disabled = false; }
});

// ── Toggle / delete coupon ─────────────────────────────────────
window.toggleCoupon = async (code, isActive) => {
  try {
    await update(ref(db, `coupons/${code}`), { isActive: !isActive });
    showToast(`${code}: ${!isActive ? "مفعّلة" : "معطّلة"}`);
  } catch (e) { showToast("خطأ: " + e.message, "err"); }
};
window.deleteCoupon = async code => {
  if (!confirm(`حذف قسيمة "${code}"؟`)) return;
  try {
    await remove(ref(db, `coupons/${code}`));
    showToast(`تم حذف ${code}`);
  } catch (e) { showToast("خطأ: " + e.message, "err"); }
};
