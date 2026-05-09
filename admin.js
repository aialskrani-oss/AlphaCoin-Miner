import { auth, db, ADMIN_EMAIL } from "./firebase-config.js";
import {
  GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  ref, get, set, update, remove, onValue
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const loadingEl     = document.getElementById("loading");
const adminApp      = document.getElementById("admin-app");
const deniedView    = document.getElementById("denied-view");
const adminMain     = document.getElementById("admin-main");
const adminUserEmail= document.getElementById("admin-user-email");
const toastEl       = document.getElementById("toast");

const couponCodeInp   = document.getElementById("coupon-code-inp");
const couponRewardInp = document.getElementById("coupon-reward-inp");
const createCouponBtn = document.getElementById("create-coupon-btn");
const couponResult    = document.getElementById("coupon-result");

const editUidInp    = document.getElementById("edit-uid-inp");
const editBalInp    = document.getElementById("edit-balance-inp");
const editBalBtn    = document.getElementById("edit-balance-btn");
const editResult    = document.getElementById("edit-result");

const usersBody     = document.getElementById("users-body");
const couponsBody   = document.getElementById("coupons-body");
const searchInp     = document.getElementById("search-inp");

const statUsers     = document.getElementById("stat-users");
const statBal       = document.getElementById("stat-total-balance");
const statCoupons   = document.getElementById("stat-coupons");

let allUsers = [];

// ── Toast ──────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = "ok") {
  toastEl.textContent = msg;
  toastEl.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.className = "toast", 2800);
}

function setResult(el, msg, ok) {
  el.textContent = msg;
  el.style.color = ok ? "var(--success)" : "var(--danger)";
}

// ── Auth guard ─────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  loadingEl.style.display = "none";
  adminApp.style.display  = "block";

  if (!user) {
    deniedView.style.display = "flex";
    return;
  }

  if (user.email !== ADMIN_EMAIL) {
    deniedView.style.display = "flex";
    return;
  }

  adminMain.style.display    = "block";
  adminUserEmail.textContent = user.email;
  loadAll();
});

// ── Load everything ────────────────────────────────────────────
function loadAll() {
  listenUsers();
  listenCoupons();
}

function listenUsers() {
  onValue(ref(db, "users"), snap => {
    allUsers = [];
    if (snap.exists()) snap.forEach(c => allUsers.push({ uid: c.key, ...c.val() }));
    allUsers.sort((a, b) => (b.balance || 0) - (a.balance || 0));

    statUsers.textContent = allUsers.length;
    statBal.textContent   = allUsers.reduce((s, u) => s + (u.balance || 0), 0).toFixed(2);

    renderUsers(allUsers);
  });
}

function listenCoupons() {
  onValue(ref(db, "coupons"), snap => {
    const coupons = [];
    if (snap.exists()) snap.forEach(c => coupons.push({ code: c.key, ...c.val() }));

    const active = coupons.filter(c => c.isActive).length;
    statCoupons.textContent = active;

    if (!coupons.length) {
      couponsBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#555">لا توجد قسائم</td></tr>`;
      return;
    }

    couponsBody.innerHTML = coupons.map(cp => {
      const used = cp.usedBy ? Object.values(cp.usedBy).length : 0;
      return `<tr>
        <td><span class="coupon-badge">${cp.code}</span></td>
        <td style="color:var(--gold);font-family:'Orbitron',monospace">α${cp.rewardAmount}</td>
        <td>
          <span style="color:${cp.isActive ? "var(--success)" : "var(--danger)"}">
            ${cp.isActive ? "✅ نشطة" : "❌ معطلة"}
          </span>
        </td>
        <td>${used}</td>
        <td>
          <button class="btn-sm btn-edit" onclick="toggleCoupon('${cp.code}', ${cp.isActive})">
            ${cp.isActive ? "تعطيل" : "تفعيل"}
          </button>
          <button class="btn-sm btn-del" style="margin-right:.4rem" onclick="deleteCoupon('${cp.code}')">حذف</button>
        </td>
      </tr>`;
    }).join("");
  });
}

function renderUsers(users) {
  if (!users.length) {
    usersBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#555">لا يوجد مستخدمون</td></tr>`;
    return;
  }
  usersBody.innerHTML = users.map((u, i) => `
    <tr>
      <td><img class="tbl-avatar" src="${u.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(u.name || "?")}"></td>
      <td>${u.name || "-"}</td>
      <td style="font-size:.85rem;color:#888">${u.email || "-"}</td>
      <td style="color:var(--gold);font-family:'Orbitron',monospace;font-weight:700">${(u.balance || 0).toFixed(4)}</td>
      <td style="color:#888">${(u.totalMined || 0).toFixed(4)}</td>
      <td>${u.dailyMineCount || 0}</td>
      <td style="font-size:.75rem;color:#555;max-width:120px;overflow:hidden;text-overflow:ellipsis">${u.uid}</td>
      <td>
        <button class="btn-sm btn-edit" onclick="fillEdit('${u.uid}', ${u.balance || 0})">تعديل</button>
        <button class="btn-sm btn-del" style="margin-right:.4rem" onclick="deleteUser('${u.uid}')">حذف</button>
      </td>
    </tr>
  `).join("");
}

// ── Search ─────────────────────────────────────────────────────
searchInp.addEventListener("input", () => {
  const q = searchInp.value.trim().toLowerCase();
  if (!q) { renderUsers(allUsers); return; }
  renderUsers(allUsers.filter(u =>
    (u.name || "").toLowerCase().includes(q) ||
    (u.email || "").toLowerCase().includes(q)
  ));
});

// ── Create coupon ──────────────────────────────────────────────
createCouponBtn.addEventListener("click", async () => {
  let code = couponCodeInp.value.trim().toUpperCase();
  if (!code) code = "ALPHA" + Math.random().toString(36).substring(2, 7).toUpperCase();
  const reward = parseFloat(couponRewardInp.value);
  if (!reward || reward <= 0) { setResult(couponResult, "أدخل مكافأة صحيحة", false); return; }

  createCouponBtn.disabled = true;
  try {
    await set(ref(db, `coupons/${code}`), {
      rewardAmount: reward,
      usedBy: [],
      createdBy: ADMIN_EMAIL,
      isActive: true
    });
    setResult(couponResult, `✅ تم إنشاء القسيمة: ${code}`, true);
    couponCodeInp.value = "";
    showToast(`تم إنشاء القسيمة ${code}`);
  } catch (e) {
    setResult(couponResult, "خطأ: " + e.message, false);
  } finally {
    createCouponBtn.disabled = false;
  }
});

// ── Edit balance ───────────────────────────────────────────────
editBalBtn.addEventListener("click", async () => {
  const uid = editUidInp.value.trim();
  const bal = parseFloat(editBalInp.value);
  if (!uid) { setResult(editResult, "أدخل UID", false); return; }
  if (isNaN(bal) || bal < 0) { setResult(editResult, "أدخل رصيداً صحيحاً", false); return; }

  editBalBtn.disabled = true;
  try {
    await update(ref(db, `users/${uid}`), { balance: bal });
    setResult(editResult, `✅ تم تحديث الرصيد إلى α${bal}`, true);
    showToast("تم تحديث الرصيد");
  } catch (e) {
    setResult(editResult, "خطأ: " + e.message, false);
  } finally {
    editBalBtn.disabled = false;
  }
});

// ── Global helpers (called from table buttons) ─────────────────
window.fillEdit = (uid, balance) => {
  editUidInp.value  = uid;
  editBalInp.value  = balance;
  editResult.textContent = "";
  editUidInp.scrollIntoView({ behavior: "smooth", block: "center" });
};

window.deleteUser = async (uid) => {
  if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;
  try {
    await remove(ref(db, `users/${uid}`));
    showToast("تم حذف المستخدم");
  } catch (e) { showToast("خطأ: " + e.message, "err"); }
};

window.toggleCoupon = async (code, isActive) => {
  try {
    await update(ref(db, `coupons/${code}`), { isActive: !isActive });
    showToast(isActive ? "تم تعطيل القسيمة" : "تم تفعيل القسيمة");
  } catch (e) { showToast("خطأ: " + e.message, "err"); }
};

window.deleteCoupon = async (code) => {
  if (!confirm("حذف القسيمة " + code + "؟")) return;
  try {
    await remove(ref(db, `coupons/${code}`));
    showToast("تم حذف القسيمة");
  } catch (e) { showToast("خطأ: " + e.message, "err"); }
};
