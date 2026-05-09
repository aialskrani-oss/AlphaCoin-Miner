import { auth, db } from "./firebase-config.js";
  import {
    onAuthStateChanged,
    signOut
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
  import {
    ref, get, set, update, onValue, push
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

  const ADMIN_EMAIL = "aialskrani@gmail.com";

  const loadingEl     = document.getElementById("admin-loading");
  const panelEl       = document.getElementById("admin-panel");
  const adminLabelEl  = document.getElementById("admin-user-label");
  const logoutBtn     = document.getElementById("admin-logout");
  const toastEl       = document.getElementById("toast");

  // ── Toast ──────────────────────────────────────────────────────
  let toastTimer;
  function showToast(msg, type = "ok") {
    toastEl.textContent = msg;
    toastEl.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.className = "toast"), 2800);
  }

  // ── Auth guard ─────────────────────────────────────────────────
  onAuthStateChanged(auth, user => {
    if (!user) {
      window.location.href = "/";
      return;
    }
    if (user.email !== ADMIN_EMAIL) {
      loadingEl.textContent = "⛔ ليس لديك صلاحية الوصول";
      setTimeout(() => (window.location.href = "/"), 2000);
      return;
    }
    loadingEl.style.display = "none";
    panelEl.style.display   = "block";
    adminLabelEl.textContent = user.email;
    loadStats();
    loadCoupons();
    loadUsers();
  });

  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "/"));

  // ── Stats ──────────────────────────────────────────────────────
  async function loadStats() {
    try {
      const [uSnap, cSnap] = await Promise.all([
        get(ref(db, "users")),
        get(ref(db, "coupons"))
      ]);
      let totalAlpha = 0, activeC = 0;
      if (uSnap.exists()) {
        uSnap.forEach(c => { totalAlpha += c.val().totalMined || 0; });
        document.getElementById("stat-users").textContent = uSnap.size;
      }
      if (cSnap.exists()) {
        cSnap.forEach(c => { if (c.val().isActive) activeC++; });
        document.getElementById("stat-coupons").textContent = activeC;
      }
      document.getElementById("stat-total").textContent = totalAlpha.toFixed(2);
    } catch (e) { console.error(e); }
  }

  // ── Coupons ────────────────────────────────────────────────────
  async function loadCoupons() {
    const tbody = document.getElementById("coupons-body");
    try {
      const snap = await get(ref(db, "coupons"));
      if (!snap.exists()) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1rem;color:#555">لا توجد قسائم</td></tr>`; return; }
      const rows = [];
      snap.forEach(c => rows.push({ code: c.key, ...c.val() }));
      tbody.innerHTML = rows.map(cp => {
        const usedCount = cp.usedBy ? Object.keys(cp.usedBy).length : 0;
        const badge = cp.isActive
          ? `<span class="badge-active">نشطة</span>`
          : `<span class="badge-used">مُعطّلة</span>`;
        const toggleLabel = cp.isActive ? "تعطيل" : "تفعيل";
        return `<tr>
          <td style="font-family:monospace;color:var(--gold,#ffd700)">${cp.code}</td>
          <td>α${cp.rewardAmount}</td>
          <td>${badge}</td>
          <td>${usedCount} مرة</td>
          <td>
            <button class="btn-gold" style="padding:.3rem .8rem;font-size:.8rem"
              onclick="toggleCoupon('${cp.code}',${cp.isActive})">${toggleLabel}</button>
          </td>
        </tr>`;
      }).join("");
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:red;text-align:center">${e.message}</td></tr>`;
    }
  }

  window.toggleCoupon = async function(code, isActive) {
    try {
      await update(ref(db, `coupons/${code}`), { isActive: !isActive });
      showToast(isActive ? "تم تعطيل القسيمة" : "تم تفعيل القسيمة");
      loadCoupons();
      loadStats();
    } catch (e) { showToast(e.message, "err"); }
  };

  // ── Create coupon ──────────────────────────────────────────────
  document.getElementById("create-coupon-btn").addEventListener("click", async () => {
    const codeInp   = document.getElementById("new-coupon-code");
    const rewardInp = document.getElementById("new-coupon-reward");
    const msgEl     = document.getElementById("coupon-create-msg");
    const reward    = parseFloat(rewardInp.value);
    if (!reward || reward <= 0) { msgEl.textContent = "أدخل قيمة مكافأة صحيحة"; msgEl.className = "admin-msg err"; return; }
    let code = codeInp.value.trim().toUpperCase();
    if (!code) {
      code = "ALPHA-" + Math.random().toString(36).slice(2,8).toUpperCase();
    }
    try {
      const snap = await get(ref(db, `coupons/${code}`));
      if (snap.exists()) { msgEl.textContent = "هذا الكود موجود مسبقاً"; msgEl.className = "admin-msg err"; return; }
      await set(ref(db, `coupons/${code}`), { code, rewardAmount: reward, isActive: true, usedBy: {}, createdAt: Date.now() });
      msgEl.textContent = `✅ تم إنشاء القسيمة: ${code} (α${reward})`;
      msgEl.className = "admin-msg ok";
      codeInp.value   = "";
      rewardInp.value = "5";
      loadCoupons(); loadStats();
    } catch (e) { msgEl.textContent = e.message; msgEl.className = "admin-msg err"; }
  });

  // ── Users ──────────────────────────────────────────────────────
  async function loadUsers() {
    const tbody = document.getElementById("users-body");
    try {
      const snap = await get(ref(db, "users"));
      if (!snap.exists()) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:1rem;color:#555">لا يوجد مستخدمون</td></tr>`; return; }
      const users = [];
      snap.forEach(c => users.push({ uid: c.key, ...c.val() }));
      users.sort((a, b) => (b.balance || 0) - (a.balance || 0));
      tbody.innerHTML = users.map(u => `<tr>
        <td>⚡ ${u.username || "-"}</td>
        <td style="color:#888;font-size:.85rem">${u.email || "-"}</td>
        <td style="color:var(--gold,#ffd700)">α${(u.balance||0).toFixed(4)}</td>
        <td style="color:#888">α${(u.totalMined||0).toFixed(4)}</td>
      </tr>`).join("");
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="4" style="color:red;text-align:center">${e.message}</td></tr>`;
    }
  }
  