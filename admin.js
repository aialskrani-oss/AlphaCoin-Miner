import { auth, db } from "./firebase-config.js";
  import {
    onAuthStateChanged,
    signOut
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
  import {
    ref, get, set, update, onValue, push
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

  const ADMIN_EMAIL = "aialskrani@gmail.com";

  const loadingEl    = document.getElementById("admin-loading");
  const panelEl      = document.getElementById("admin-panel");
  const adminLabelEl = document.getElementById("admin-user-label");
  const logoutBtn    = document.getElementById("admin-logout");
  const toastEl      = document.getElementById("toast");

  const POWER_UPGRADES = [
    { level:1, power:1,  hours:null, cost:0 },
    { level:2, power:2,  hours:null, cost:100 },
    { level:3, power:3,  hours:null, cost:300 },
    { level:4, power:5,  hours:null, cost:800 },
    { level:5, power:8,  hours:null, cost:2000 }
  ];
  const DURATION_UPGRADES = [
    { level:1, power:null, hours:3,  cost:0 },
    { level:2, power:null, hours:6,  cost:200 },
    { level:3, power:null, hours:12, cost:600 },
    { level:4, power:null, hours:24, cost:1500 }
  ];

  let toastTimer;
  function showToast(msg, type="ok") {
    toastEl.textContent = msg;
    toastEl.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.className = "toast", 2800);
  }

  function setMsg(id, msg, type) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.className = "admin-msg " + type; }
  }

  onAuthStateChanged(auth, async user => {
    if (!user || user.email !== ADMIN_EMAIL) {
      loadingEl.innerHTML = "⛔ غير مصرح لك بالدخول. <a href='/' style='color:#f0b429'>العودة للرئيسية</a>";
      return;
    }
    adminLabelEl.textContent = user.email;
    loadingEl.style.display = "none";
    panelEl.style.display   = "block";
    loadStats();
    loadCouponsList();
    loadUsersList();
  });

  logoutBtn.addEventListener("click", () => signOut(auth).then(() => location.href = "/"));

  // ─── Stats ────────────────────────────────────────────────────
  async function loadStats() {
    const usersSnap   = await get(ref(db, "users"));
    const couponsSnap = await get(ref(db, "coupons"));
    let totalUsers = 0, totalMined = 0, totalPower = 0, activeCoupons = 0;
    if (usersSnap.exists()) {
      usersSnap.forEach(child => {
        totalUsers++;
        const d = child.val();
        totalMined += d.totalMined || 0;
        totalPower += d.miningPower || 1;
      });
    }
    if (couponsSnap.exists()) {
      couponsSnap.forEach(child => {
        if (child.val().isActive) activeCoupons++;
      });
    }
    document.getElementById("stat-users").textContent       = totalUsers;
    document.getElementById("stat-total-mined").textContent = totalMined.toFixed(2);
    document.getElementById("stat-coupons").textContent     = activeCoupons;
    document.getElementById("stat-avg-power").textContent   = totalUsers ? (totalPower/totalUsers).toFixed(1) : "0";
  }

  // ─── User Search & Edit ───────────────────────────────────────
  let editingUid = null;

  document.getElementById("search-user-btn").addEventListener("click", searchUser);
  document.getElementById("search-uid").addEventListener("keydown", e => { if(e.key==="Enter") searchUser(); });

  async function searchUser() {
    const query = document.getElementById("search-uid").value.trim();
    if (!query) { setMsg("search-msg","أدخل UID أو username","err"); return; }
    setMsg("search-msg","جار البحث…","");
    const usersSnap = await get(ref(db,"users"));
    let found = null, foundUid = null;
    if (usersSnap.exists()) {
      usersSnap.forEach(child => {
        const d = child.val();
        if (child.key === query || d.username === query || d.email === query) {
          found    = d;
          foundUid = child.key;
        }
      });
    }
    if (!found) { setMsg("search-msg","❌ المستخدم غير موجود","err"); return; }
    editingUid = foundUid;
    document.getElementById("edit-user-title").textContent = `تعديل: ${found.username || foundUid} (${found.email || ""})`;
    document.getElementById("edit-balance").value        = found.balance       || 0;
    document.getElementById("edit-total-mined").value    = found.totalMined    || 0;
    document.getElementById("edit-mining-power").value   = found.miningPower   || 1;
    document.getElementById("edit-power-level").value    = found.miningPowerLevel   || 1;
    document.getElementById("edit-duration").value       = found.maxMiningDuration  || 3;
    document.getElementById("edit-duration-level").value = found.miningDurationLevel || 1;
    document.getElementById("user-edit-form").classList.add("visible");
    setMsg("search-msg","✅ تم العثور على المستخدم","ok");
    setMsg("edit-msg","","");
  }

  document.getElementById("save-user-btn").addEventListener("click", async () => {
    if (!editingUid) return;
    const updates = {
      balance:             parseFloat(document.getElementById("edit-balance").value)        || 0,
      totalMined:          parseFloat(document.getElementById("edit-total-mined").value)    || 0,
      miningPower:         parseFloat(document.getElementById("edit-mining-power").value)   || 1,
      miningPowerLevel:    parseInt(document.getElementById("edit-power-level").value)      || 1,
      maxMiningDuration:   parseFloat(document.getElementById("edit-duration").value)       || 3,
      miningDurationLevel: parseInt(document.getElementById("edit-duration-level").value)   || 1,
    };
    try {
      await update(ref(db, `users/${editingUid}`), updates);
      setMsg("edit-msg","✅ تم الحفظ بنجاح","ok");
      showToast("تم حفظ بيانات المستخدم");
      loadStats();
    } catch(e) {
      setMsg("edit-msg","❌ خطأ: "+e.message,"err");
    }
  });

  document.getElementById("free-upgrade-btn").addEventListener("click", async () => {
    if (!editingUid) return;
    const snap = await get(ref(db, `users/${editingUid}`));
    if (!snap.exists()) return;
    const d = snap.val();
    const curPowerLevel    = d.miningPowerLevel    || 1;
    const curDurationLevel = d.miningDurationLevel || 1;
    const nextPower    = POWER_UPGRADES.find(u => u.level === curPowerLevel + 1);
    const nextDuration = DURATION_UPGRADES.find(u => u.level === curDurationLevel + 1);
    const updates = {};
    if (nextPower)    { updates.miningPower = nextPower.power;  updates.miningPowerLevel = nextPower.level; }
    if (nextDuration) { updates.maxMiningDuration = nextDuration.hours; updates.miningDurationLevel = nextDuration.level; }
    if (Object.keys(updates).length === 0) { setMsg("edit-msg","المستخدم على أعلى مستوى بالفعل","err"); return; }
    try {
      await update(ref(db, `users/${editingUid}`), updates);
      setMsg("edit-msg","✅ تمت الترقية المجانية","ok");
      showToast("تمت الترقية المجانية!");
      document.getElementById("edit-mining-power").value   = updates.miningPower    || d.miningPower;
      document.getElementById("edit-power-level").value    = updates.miningPowerLevel || curPowerLevel;
      document.getElementById("edit-duration").value       = updates.maxMiningDuration || d.maxMiningDuration;
      document.getElementById("edit-duration-level").value = updates.miningDurationLevel || curDurationLevel;
    } catch(e) {
      setMsg("edit-msg","❌ خطأ: "+e.message,"err");
    }
  });

  document.getElementById("reset-user-btn").addEventListener("click", async () => {
    if (!editingUid) return;
    const now = Date.now();
    try {
      await update(ref(db, `users/${editingUid}`), { miningStartTime: now, lastClaimTime: now });
      setMsg("edit-msg","✅ تمت إعادة ضبط التعدين","ok");
      showToast("تمت إعادة ضبط وقت التعدين");
    } catch(e) {
      setMsg("edit-msg","❌ خطأ: "+e.message,"err");
    }
  });

  // ─── Create Coupon ────────────────────────────────────────────
  document.getElementById("create-coupon-btn").addEventListener("click", async () => {
    const code   = document.getElementById("coupon-code").value.trim().toUpperCase();
    const reward = parseFloat(document.getElementById("coupon-reward").value);
    if (!code)        { setMsg("coupon-msg","أدخل كود القسيمة","err"); return; }
    if (!reward || reward <= 0) { setMsg("coupon-msg","أدخل مكافأة صحيحة","err"); return; }
    try {
      await set(ref(db, `coupons/${code}`), { rewardAmount: reward, isActive: true, createdAt: Date.now(), usedBy: {} });
      setMsg("coupon-msg",`✅ تم إنشاء القسيمة: ${code} (+α${reward})`,"ok");
      document.getElementById("coupon-code").value   = "";
      document.getElementById("coupon-reward").value = "";
      loadCouponsList();
    } catch(e) {
      setMsg("coupon-msg","❌ خطأ: "+e.message,"err");
    }
  });

  // ─── Coupons List ─────────────────────────────────────────────
  async function loadCouponsList() {
    const snap = await get(ref(db,"coupons"));
    const wrap = document.getElementById("coupons-table-wrap");
    if (!snap.exists()) { wrap.innerHTML = '<div style="color:#666">لا توجد كوبونات بعد.</div>'; return; }
    let rows = "";
    snap.forEach(child => {
      const c    = child.val();
      const used = c.usedBy ? Object.keys(c.usedBy).length : 0;
      rows += `<tr>
        <td style="font-family:monospace;color:#f0b429">${child.key}</td>
        <td>${c.rewardAmount} α</td>
        <td><span class="badge-${c.isActive?"active":"used"}">${c.isActive?"نشط":"معطّل"}</span></td>
        <td>${used} مستخدم</td>
        <td>
          <button onclick="toggleCoupon('${child.key}',${!c.isActive})" style="background:${c.isActive?"#dc2626":"#15803d"};color:#fff;border:none;border-radius:6px;padding:3px 10px;cursor:pointer;font-family:'Cairo',sans-serif">
            ${c.isActive?"تعطيل":"تفعيل"}
          </button>
        </td>
      </tr>`;
    });
    wrap.innerHTML = `<table class="users-table"><thead><tr><th>الكود</th><th>المكافأة</th><th>الحالة</th><th>الاستخدامات</th><th>إجراء</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  window.toggleCoupon = async (code, isActive) => {
    await update(ref(db, `coupons/${code}`), { isActive });
    loadCouponsList();
    showToast(isActive ? "تم تفعيل الكوبون" : "تم تعطيل الكوبون");
  };

  // ─── Users List ───────────────────────────────────────────────
  async function loadUsersList() {
    const snap = await get(ref(db,"users"));
    const wrap = document.getElementById("users-table-wrap");
    if (!snap.exists()) { wrap.innerHTML = '<div style="color:#666">لا يوجد مستخدمون بعد.</div>'; return; }
    let rows = "";
    snap.forEach(child => {
      const d = child.val();
      rows += `<tr>
        <td style="color:#00d4ff;font-size:.8rem">${(d.username||"—")}</td>
        <td style="font-size:.78rem;color:#888">${(d.email||"—")}</td>
        <td style="color:#f0b429">${(d.balance||0).toFixed(2)} α</td>
        <td>${(d.miningPower||1)} α/س</td>
        <td>${(d.maxMiningDuration||3)} س</td>
        <td style="color:#888;font-size:.78rem">${d.lastClaimTime ? new Date(d.lastClaimTime).toLocaleDateString("ar-SA") : "—"}</td>
        <td>
          <button onclick="quickSearchUser('${child.key}')" style="background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:.78rem;font-family:'Cairo',sans-serif">تعديل</button>
        </td>
      </tr>`;
    });
    wrap.innerHTML = `<table class="users-table">
      <thead><tr><th>الاسم</th><th>الإيميل</th><th>الرصيد</th><th>القوة</th><th>المدة</th><th>آخر جني</th><th>إجراء</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  window.quickSearchUser = (uid) => {
    document.getElementById("search-uid").value = uid;
    document.getElementById("search-user-btn").click();
    document.getElementById("search-uid").scrollIntoView({ behavior:"smooth" });
  };
  